import { Env } from '../types';
import { sendInvitationEmail } from '../email';
import { isUserAdmin } from '../auth';
import { generateUUID } from '../auth-core';

// Invitation functions extracted from main worker

export async function createLocationInvitation(request: Request, locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin (only admins can create invitations)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to create invitations' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { invited_email }: { invited_email: string } = await request.json();

  // Validate email format
  if (!invited_email || !invited_email.includes('@')) {
    return new Response(JSON.stringify({ error: 'Valid email address required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user has access to this location (only owner can invite)
  const accessStmt = env.DB.prepare(`
    SELECT id FROM locations WHERE id = ? AND owner_id = ?
  `);
  const accessResult = await accessStmt.bind(locationId, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user is already a member
  const memberStmt = env.DB.prepare(`
    SELECT 1 FROM location_members WHERE location_id = ? AND user_id = ?
  `);
  const existingUser = await env.DB.prepare(`
    SELECT id FROM users WHERE email = ?
  `).bind(invited_email).first();
  
  if (existingUser) {
    const memberResult = await memberStmt.bind(locationId, existingUser.id).first();
    if (memberResult) {
      return new Response(JSON.stringify({ error: 'User is already a member of this location' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Check for existing unused invitation
  const existingInvitationStmt = env.DB.prepare(`
    SELECT id FROM location_invitations 
    WHERE location_id = ? AND invited_email = ? AND used_at IS NULL AND expires_at > datetime('now')
  `);
  const existingInvitation = await existingInvitationStmt.bind(locationId, invited_email).first();
  
  if (existingInvitation) {
    return new Response(JSON.stringify({ error: 'An active invitation already exists for this email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate invitation token and expiration (7 days)
  const invitationToken = generateUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Create invitation
  const invitationStmt = env.DB.prepare(`
    INSERT INTO location_invitations (location_id, invited_email, invitation_token, invited_by, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const result = await invitationStmt.bind(
    locationId,
    invited_email,
    invitationToken,
    userId,
    expiresAt
  ).run();

  // Get location name for email
  const locationStmt = env.DB.prepare(`
    SELECT name FROM locations WHERE id = ?
  `);
  const location = await locationStmt.bind(locationId).first();

  // Send invitation email
  try {
    console.log('DEBUG: About to call sendInvitationEmail for:', invited_email);
    await sendInvitationEmail(env, invited_email, (location as any)?.name || 'a location', invitationToken, userId);
    console.log('DEBUG: sendInvitationEmail completed for:', invited_email);
  } catch (emailError) {
    console.error('ERROR: Failed to send invitation email:', {
      error: emailError,
      email: invited_email,
      locationName: (location as any)?.name,
      token: invitationToken,
      invitedBy: userId,
      errorMessage: emailError instanceof Error ? emailError.message : String(emailError),
      errorStack: emailError instanceof Error ? emailError.stack : undefined
    });
    // Don't fail the invitation creation if email fails, but log the specific error
  }

  return new Response(JSON.stringify({ 
    id: result.meta.last_row_id,
    invited_email,
    expires_at: expiresAt,
    message: 'Invitation sent successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function acceptLocationInvitation(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const { invitation_token }: { invitation_token: string } = await request.json();

  if (!invitation_token) {
    return new Response(JSON.stringify({ error: 'Invitation token required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get invitation details
  const invitationStmt = env.DB.prepare(`
    SELECT li.*, l.name as location_name, u.email as user_email
    FROM location_invitations li
    LEFT JOIN locations l ON li.location_id = l.id
    LEFT JOIN users u ON u.id = ?
    WHERE li.invitation_token = ? AND li.used_at IS NULL
  `);
  
  const invitation = await invitationStmt.bind(userId, invitation_token).first();
  
  if (!invitation) {
    return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if invitation is expired
  if (new Date() > new Date((invitation as any).expires_at)) {
    return new Response(JSON.stringify({ error: 'Invitation has expired' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if invitation email matches user email (only if user exists and has an email)
  const userEmail = (invitation as any).user_email;
  const invitedEmail = (invitation as any).invited_email;
  
  if (userEmail && userEmail !== invitedEmail) {
    return new Response(JSON.stringify({ error: 'Invitation email does not match your account' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user is already a member
  const memberStmt = env.DB.prepare(`
    SELECT 1 FROM location_members WHERE location_id = ? AND user_id = ?
  `);
  const existingMember = await memberStmt.bind((invitation as any).location_id, userId).first();
  
  if (existingMember) {
    return new Response(JSON.stringify({ error: 'You are already a member of this location' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Add user as location member
  const addMemberStmt = env.DB.prepare(`
    INSERT INTO location_members (location_id, user_id, role, invited_by, joined_at)
    VALUES (?, ?, 'member', ?, datetime('now'))
  `);
  
  await addMemberStmt.bind(
    (invitation as any).location_id, 
    userId, 
    (invitation as any).invited_by
  ).run();

  // Mark invitation as used
  const updateInvitationStmt = env.DB.prepare(`
    UPDATE location_invitations 
    SET used_at = datetime('now')
    WHERE id = ?
  `);
  
  await updateInvitationStmt.bind((invitation as any).id).run();

  return new Response(JSON.stringify({ 
    message: `Successfully joined ${(invitation as any).location_name}`,
    location_id: (invitation as any).location_id,
    location_name: (invitation as any).location_name
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function getLocationInvitations(locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin and has access to this location
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to view invitations' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const accessStmt = env.DB.prepare(`
    SELECT id FROM locations WHERE id = ? AND owner_id = ?
  `);
  const accessResult = await accessStmt.bind(locationId, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get all invitations for this location
  const invitationsStmt = env.DB.prepare(`
    SELECT li.*, u.first_name as invited_by_name
    FROM location_invitations li
    LEFT JOIN users u ON li.invited_by = u.id
    WHERE li.location_id = ?
    ORDER BY li.created_at DESC
  `);
  
  const result = await invitationsStmt.bind(locationId).all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function getInvitationDetails(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'Invitation token required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Get invitation details
  const invitationStmt = env.DB.prepare(`
    SELECT li.invited_email, l.name as location_name, li.expires_at
    FROM location_invitations li
    LEFT JOIN locations l ON li.location_id = l.id
    WHERE li.invitation_token = ? AND li.used_at IS NULL
  `);
  
  const invitation = await invitationStmt.bind(token).first();
  
  if (!invitation) {
    return new Response(JSON.stringify({ error: 'Invalid or expired invitation token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check if invitation is expired
  if (new Date() > new Date((invitation as any).expires_at)) {
    return new Response(JSON.stringify({ error: 'Invitation has expired' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({
    invited_email: (invitation as any).invited_email,
    location_name: (invitation as any).location_name,
    expires_at: (invitation as any).expires_at
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function revokeLocationInvitation(invitationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin (only admins can revoke invitations)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to revoke invitations' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get invitation details to verify it exists and check permissions
  const invitationStmt = env.DB.prepare(`
    SELECT li.*, l.owner_id
    FROM location_invitations li
    LEFT JOIN locations l ON li.location_id = l.id
    WHERE li.id = ?
  `);
  
  const invitation = await invitationStmt.bind(invitationId).first();
  
  if (!invitation) {
    return new Response(JSON.stringify({ error: 'Invitation not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if user has access to this location (only owner can revoke invitations)
  if ((invitation as any).owner_id !== userId) {
    return new Response(JSON.stringify({ error: 'Access denied - only location owner can revoke invitations' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if invitation is still pending (not used)
  if ((invitation as any).used_at) {
    return new Response(JSON.stringify({ error: 'Cannot revoke invitation that has already been accepted' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Delete the invitation
  const deleteStmt = env.DB.prepare(`
    DELETE FROM location_invitations WHERE id = ?
  `);
  
  const deleteResult = await deleteStmt.bind(invitationId).run();

  // Verify the deletion was successful
  if (deleteResult.meta.changes === 0) {
    return new Response(JSON.stringify({ error: 'Failed to revoke invitation - invitation may have already been removed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Double-check the invitation was actually deleted
  const verifyStmt = env.DB.prepare(`
    SELECT id FROM location_invitations WHERE id = ?
  `);
  const stillExists = await verifyStmt.bind(invitationId).first();
  
  if (stillExists) {
    return new Response(JSON.stringify({ error: 'Failed to revoke invitation - database deletion incomplete' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ 
    message: 'Invitation revoked successfully',
    invitation_id: invitationId,
    invited_email: (invitation as any).invited_email
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}