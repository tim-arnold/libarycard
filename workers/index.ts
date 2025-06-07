import {
  Env,
  User,
} from './types';
import { processOCR } from './ocr';
import {
  getUserLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  leaveLocation,
  getLocationShelves,
  createShelf,
  updateShelf,
  deleteShelf
} from './locations';
import {
  getUserBooks,
  createBook,
  updateBook,
  deleteBook,
  checkoutBook,
  checkinBook,
  getCheckoutHistory,
  createBookRemovalRequest,
  getBookRemovalRequests,
  approveBookRemovalRequest,
  denyBookRemovalRequest,
  deleteBookRemovalRequest
} from './books';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;


    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Public auth endpoints (no authentication required)
      if (path === '/api/users' && request.method === 'POST') {
        return await createOrUpdateUser(request, env, corsHeaders);
      }

      if (path === '/api/auth/register' && request.method === 'POST') {
        return await registerUser(request, env, corsHeaders);
      }

      if (path === '/api/auth/verify' && request.method === 'POST') {
        return await verifyCredentials(request, env, corsHeaders);
      }

      if (path === '/api/auth/verify-email' && request.method === 'GET') {
        return await verifyEmail(request, env, corsHeaders);
      }

      if (path === '/api/invitations/details' && request.method === 'GET') {
        return await getInvitationDetails(request, env, corsHeaders);
      }

      if (path === '/api/users/check' && request.method === 'GET') {
        return await checkUserExists(request, env, corsHeaders);
      }

      // OCR endpoint for bookshelf scanning (public)
      if (path === '/api/ocr-vision' && request.method === 'POST') {
        return await processOCR(request, env, corsHeaders);
      }

      // Get user from session/token for protected endpoints
      const userId = await getUserFromRequest(request, env);
      
      // All other endpoints require authentication
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Location endpoints
      if (path === '/api/locations' && request.method === 'GET') {
        return await getUserLocations(userId, env, corsHeaders);
      }

      if (path === '/api/locations' && request.method === 'POST') {
        return await createLocation(request, userId, env, corsHeaders);
      }

      if (path.startsWith('/api/locations/') && path !== '/api/locations' && request.method === 'PUT') {
        const id = parseInt(path.split('/')[3]);
        return await updateLocation(request, userId, env, corsHeaders, id);
      }

      if (path === '/api/locations' && request.method === 'PUT') {
        const id = url.searchParams.get('id');
        if (!id) {
          return new Response(JSON.stringify({ error: 'Location ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await updateLocation(request, userId, env, corsHeaders, parseInt(id));
      }

      if (path.startsWith('/api/locations/') && path !== '/api/locations' && request.method === 'DELETE') {
        const id = parseInt(path.split('/')[3]);
        return await deleteLocation(userId, env, corsHeaders, id);
      }

      if (path === '/api/locations' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
          return new Response(JSON.stringify({ error: 'Location ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await deleteLocation(userId, env, corsHeaders, parseInt(id));
      }

      if (path.match(/^\/api\/locations\/\d+\/shelves$/) && request.method === 'GET') {
        const locationId = parseInt(path.split('/')[3]);
        return await getLocationShelves(locationId, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/locations\/\d+\/shelves$/) && request.method === 'POST') {
        const locationId = parseInt(path.split('/')[3]);
        return await createShelf(request, locationId, userId, env, corsHeaders);
      }

      if (path.startsWith('/api/shelves/') && request.method === 'PUT') {
        const id = parseInt(path.split('/')[3]);
        return await updateShelf(request, userId, env, corsHeaders, id);
      }

      if (path.startsWith('/api/shelves/') && request.method === 'DELETE') {
        const id = parseInt(path.split('/')[3]);
        return await deleteShelf(request, userId, env, corsHeaders, id);
      }

      // Book endpoints
      if (path === '/api/books' && request.method === 'GET') {
        return await getUserBooks(userId, env, corsHeaders);
      }

      if (path === '/api/books' && request.method === 'POST') {
        return await createBook(request, userId, env, corsHeaders);
      }

      // Book checkout endpoints (must come before general /api/books/* routes)
      if (path.match(/^\/api\/books\/\d+\/checkout$/) && request.method === 'POST') {
        const bookId = parseInt(path.split('/')[3]);
        return await checkoutBook(request, bookId, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/books\/\d+\/checkin$/) && request.method === 'POST') {
        const bookId = parseInt(path.split('/')[3]);
        return await checkinBook(bookId, userId, env, corsHeaders);
      }

      if (path === '/api/books/checkout-history' && request.method === 'GET') {
        return await getCheckoutHistory(userId, env, corsHeaders);
      }

      if (path.startsWith('/api/books/') && request.method === 'PUT') {
        const id = parseInt(path.split('/')[3]);
        return await updateBook(request, userId, env, corsHeaders, id);
      }

      if (path.startsWith('/api/books/') && request.method === 'DELETE') {
        const id = parseInt(path.split('/')[3]);
        return await deleteBook(userId, env, corsHeaders, id);
      }

      // Invitation endpoints
      if (path.match(/^\/api\/locations\/\d+\/invite$/) && request.method === 'POST') {
        const locationId = parseInt(path.split('/')[3]);
        return await createLocationInvitation(request, locationId, userId, env, corsHeaders);
      }

      if (path === '/api/invitations/accept' && request.method === 'POST') {
        return await acceptLocationInvitation(request, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/locations\/\d+\/invitations$/) && request.method === 'GET') {
        const locationId = parseInt(path.split('/')[3]);
        return await getLocationInvitations(locationId, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/invitations\/\d+\/revoke$/) && request.method === 'DELETE') {
        const invitationId = parseInt(path.split('/')[3]);
        return await revokeLocationInvitation(invitationId, userId, env, corsHeaders);
      }

      // Leave location endpoint
      if (path.match(/^\/api\/locations\/\d+\/leave$/) && request.method === 'POST') {
        const locationId = parseInt(path.split('/')[3]);
        return await leaveLocation(locationId, userId, env, corsHeaders);
      }

      // Book removal request endpoints
      if (path === '/api/book-removal-requests' && request.method === 'POST') {
        return await createBookRemovalRequest(request, userId, env, corsHeaders);
      }

      if (path === '/api/book-removal-requests' && request.method === 'GET') {
        return await getBookRemovalRequests(userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/book-removal-requests\/\d+\/approve$/) && request.method === 'POST') {
        const requestId = parseInt(path.split('/')[3]);
        return await approveBookRemovalRequest(requestId, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/book-removal-requests\/\d+\/deny$/) && request.method === 'POST') {
        const requestId = parseInt(path.split('/')[3]);
        return await denyBookRemovalRequest(request, requestId, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/book-removal-requests\/\d+$/) && request.method === 'DELETE') {
        const requestId = parseInt(path.split('/')[3]);
        return await deleteBookRemovalRequest(requestId, userId, env, corsHeaders);
      }


      // Profile endpoints
      if (path === '/api/profile' && request.method === 'GET') {
        return await getUserProfile(userId, env, corsHeaders);
      }

      if (path === '/api/profile' && request.method === 'PUT') {
        return await updateUserProfile(request, userId, env, corsHeaders);
      }

      // Admin-only cleanup endpoint
      if (path === '/api/admin/cleanup-user' && request.method === 'POST') {
        return await cleanupUser(request, userId, env, corsHeaders);
      }

      // Admin-only debug endpoint to list all users
      if (path === '/api/admin/debug-users' && request.method === 'GET') {
        return await debugListUsers(userId, env, corsHeaders);
      }


      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });
    } catch (error) {
      console.error('API Error:', error);
      return new Response(`Error: ${error}`, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};

// Authentication helper (simplified - in production you'd verify JWT)
async function getUserFromRequest(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  // If token looks like an email, look up the user ID
  if (token.includes('@')) {
    const user = await env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(token).first();
    
    return user ? user.id as string : null;
  }
  
  // Otherwise, assume it's already a user ID
  return token;
}

// Helper functions
async function getUserRole(userId: string, env: Env): Promise<string> {
  const user = await env.DB.prepare(`
    SELECT user_role FROM users WHERE id = ?
  `).bind(userId).first();
  
  return (user as any)?.user_role || 'user';
}

async function isUserAdmin(userId: string, env: Env): Promise<boolean> {
  const role = await getUserRole(userId, env);
  return role === 'admin';
}

// User functions
async function createOrUpdateUser(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const user: User = await request.json();
  
  const stmt = env.DB.prepare(`
    INSERT OR REPLACE INTO users (id, email, first_name, last_name, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  await stmt.bind(
    user.id,
    user.email,
    user.first_name || null,
    user.last_name || null
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Location functions




// Book functions moved to ./books module

// Authentication functions
async function registerUser(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const { email, password, first_name, last_name }: {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
  } = await request.json();
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return new Response(JSON.stringify({ error: passwordValidation.error }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check if user already exists
  const existingUser = await env.DB.prepare(`
    SELECT email FROM users WHERE email = ?
  `).bind(email).first();
  
  if (existingUser) {
    return new Response(JSON.stringify({ error: 'User already exists' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Generate verification token
  const verificationToken = generateUUID();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  
  // Generate user ID
  const userId = generateUUID();
  
  // Always require email verification in production
  const isProduction = env.ENVIRONMENT === 'production';
  const emailVerified = false; // Always require verification for new accounts
  
  // Create user
  const stmt = env.DB.prepare(`
    INSERT INTO users (
      id, email, first_name, last_name, password_hash, 
      auth_provider, email_verified, email_verification_token, 
      email_verification_expires, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'email', ?, ?, ?, datetime('now'), datetime('now'))
  `);

  await stmt.bind(
    userId,
    email,
    first_name,
    last_name || '',
    passwordHash,
    emailVerified,
    verificationToken,
    verificationExpires
  ).run();

  // Always send verification email for new accounts
  await sendVerificationEmail(env, email, first_name, verificationToken);

  const message = isProduction 
    ? 'Registration successful. Please check your email to verify your account before signing in.'
    : 'Registration successful. Please check your email to verify your account. (Development mode: email simulation)';

  return new Response(JSON.stringify({ 
    message,
    userId,
    requires_verification: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyCredentials(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const { email, password }: {
    email: string;
    password: string;
  } = await request.json();
  
  const user = await env.DB.prepare(`
    SELECT id, email, first_name, last_name, password_hash, email_verified, auth_provider
    FROM users 
    WHERE email = ? AND auth_provider = 'email'
  `).bind(email).first();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  if (!user.email_verified) {
    return new Response(JSON.stringify({ error: 'Please verify your email before signing in' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const isValidPassword = await verifyPassword(password, user.password_hash as string);
  
  if (!isValidPassword) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    auth_provider: user.auth_provider
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyEmail(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'Verification token required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const user = await env.DB.prepare(`
    SELECT id, email, email_verification_expires
    FROM users 
    WHERE email_verification_token = ? AND email_verified = FALSE
  `).bind(token).first();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired verification token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check if token is expired
  if (new Date() > new Date(user.email_verification_expires as string)) {
    return new Response(JSON.stringify({ error: 'Verification token has expired' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Mark email as verified
  await env.DB.prepare(`
    UPDATE users 
    SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).bind(user.id).run();
  
  // Check if there are any pending invitations for this email
  const pendingInvitation = await env.DB.prepare(`
    SELECT invitation_token FROM location_invitations 
    WHERE invited_email = ? AND used_at IS NULL AND expires_at > datetime('now')
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(user.email).first();
  
  const responseData: any = { message: 'Email verified successfully' };
  
  if (pendingInvitation) {
    responseData.pending_invitation = (pendingInvitation as any).invitation_token;
  }
  
  return new Response(JSON.stringify(responseData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Profile functions
async function getUserProfile(userId: string, env: Env, corsHeaders: Record<string, string>) {
  const user = await env.DB.prepare(`
    SELECT id, email, first_name, last_name, auth_provider, email_verified, user_role, created_at
    FROM users 
    WHERE id = ?
  `).bind(userId).first();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify(user), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateUserProfile(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    [key: string]: any;
  } = await request.json();
  
  // Get current user info to check auth provider
  const currentUser = await env.DB.prepare(`
    SELECT auth_provider FROM users WHERE id = ?
  `).bind(userId).first();
  
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Build dynamic update query based on what can be changed
  const allowedFields = ['first_name', 'last_name'];
  if ((currentUser as any).auth_provider === 'email') {
    allowedFields.push('email');
  }
  
  const updateFields: string[] = [];
  const values: any[] = [];
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }
  
  if (updateFields.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  updateFields.push('updated_at = datetime(\'now\')');
  values.push(userId);
  
  const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
  
  await env.DB.prepare(query).bind(...values).run();
  
  return new Response(JSON.stringify({ message: 'Profile updated successfully' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Invitation functions
async function createLocationInvitation(request: Request, locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
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
  await sendInvitationEmail(env, invited_email, (location as any)?.name || 'a location', invitationToken, userId);

  return new Response(JSON.stringify({ 
    id: result.meta.last_row_id,
    invited_email,
    expires_at: expiresAt,
    message: 'Invitation sent successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function acceptLocationInvitation(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
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

async function getLocationInvitations(locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
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

async function getInvitationDetails(request: Request, env: Env, corsHeaders: Record<string, string>) {
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

async function revokeLocationInvitation(invitationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
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
  
  await deleteStmt.bind(invitationId).run();

  return new Response(JSON.stringify({ 
    message: 'Invitation revoked successfully',
    invitation_id: invitationId,
    invited_email: (invitation as any).invited_email
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendInvitationEmail(env: Env, email: string, locationName: string, token: string, invitedBy: string) {
  const invitationUrl = `${env.APP_URL.replace(/\/$/, '')}/auth/signin?invitation=${token}`;
  
  // Get inviter name
  const inviterStmt = env.DB.prepare(`
    SELECT first_name, last_name FROM users WHERE id = ?
  `);
  const inviter = await inviterStmt.bind(invitedBy).first();
  const inviterName = inviter ? `${(inviter as any).first_name || ''}`.trim() || 'Someone' : 'Someone';
  
  // Use Resend for production email sending
  if (env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || 'LibaryCard <noreply@resend.dev>',
          to: [email],
          subject: `You're invited to join ${locationName} on LibaryCard`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>LibaryCard Invitation</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: #007bff; margin-bottom: 10px;">📚 LibaryCard</h1>
                <h2 style="color: #333; margin-bottom: 20px;">You're Invited!</h2>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  ${inviterName} has invited you to join the <strong>${locationName}</strong> library on LibaryCard.
                </p>
                <p style="font-size: 16px; margin-bottom: 30px;">
                  LibaryCard helps you organize and share book collections. Join to browse books and add your own to the shared library.
                </p>
                <a href="${invitationUrl}" 
                   style="display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Accept Invitation
                </a>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  This invitation will expire in 7 days. If you don't have a LibaryCard account, you can create one when you accept the invitation.
                </p>
                <p style="font-size: 14px; color: #666; margin-top: 20px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${invitationUrl}" style="color: #007bff; word-break: break-all;">${invitationUrl}</a>
                </p>
              </div>
            </body>
            </html>
          `
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to send invitation email:', error);
        throw new Error(`Email service error: ${response.status}`);
      }

      const result = await response.json() as { id: string };
      console.log('Invitation email sent successfully:', result.id);
    } catch (error) {
      console.error('Error sending invitation email:', error);
      // Don't fail invitation creation if email fails - log and continue
    }
  } else {
    // Fallback for development/staging without email service
    console.log(`
      Invitation email would be sent to: ${email}
      Location: ${locationName}
      Invited by: ${inviterName}
      Invitation URL: ${invitationUrl}
    `);
  }
}

// Utility functions
function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters long` };
  }
  if (!hasUpperCase) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumbers) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)' };
  }
  return { isValid: true };
}

async function hashPassword(password: string): Promise<string> {
  // In a real Cloudflare Worker, you'd use the Web Crypto API
  // For now, we'll use a simple hash (replace with proper bcrypt in production)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt'); // Add proper salt in production
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

async function sendVerificationEmail(env: Env, email: string, firstName: string, token: string) {
  const verificationUrl = `${env.APP_URL.replace(/\/$/, '')}/api/auth/verify-email?token=${token}`;
  
  // Use Resend for production email sending
  if (env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || 'LibaryCard <noreply@resend.dev>',
          to: [email],
          subject: 'Verify your LibaryCard account',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify your LibaryCard account</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: #007bff; margin-bottom: 10px;">📚 LibaryCard</h1>
                <h2 style="color: #333; margin-bottom: 20px;">Welcome, ${firstName}!</h2>
                <p style="font-size: 16px; margin-bottom: 30px;">
                  Thanks for joining LibaryCard. To complete your registration, please verify your email address by clicking the button below:
                </p>
                <a href="${verificationUrl}" 
                   style="display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Verify Email Address
                </a>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  This link will expire in 24 hours. If you didn't create an account with LibaryCard, you can safely ignore this email.
                </p>
                <p style="font-size: 14px; color: #666; margin-top: 20px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
                </p>
              </div>
            </body>
            </html>
          `
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to send verification email:', error);
        throw new Error(`Email service error: ${response.status}`);
      }

      const result = await response.json() as { id: string };
      console.log('Verification email sent successfully:', result.id);
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Don't fail registration if email fails - log and continue
    }
  } else {
    // Fallback for development/staging without email service
    console.log(`
      Email verification would be sent to: ${email}
      Name: ${firstName}
      Verification URL: ${verificationUrl}
    `);
  }
}

// Admin-only user cleanup function
async function cleanupUser(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { email_to_delete }: { email_to_delete: string } = await request.json();

  if (!email_to_delete) {
    return new Response(JSON.stringify({ error: 'email_to_delete required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Find the user to delete
    const userToDelete = await env.DB.prepare(`
      SELECT id, email FROM users WHERE email = ?
    `).bind(email_to_delete).first();

    if (!userToDelete) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIdToDelete = userToDelete.id as string;

    // 1. Delete all books added by this user
    await env.DB.prepare(`
      DELETE FROM books WHERE added_by = ?
    `).bind(userIdToDelete).run();

    // 2. Find locations owned by this user
    const ownedLocations = await env.DB.prepare(`
      SELECT id FROM locations WHERE owner_id = ?
    `).bind(userIdToDelete).all();

    // 3. Delete shelves in those locations
    for (const location of ownedLocations.results) {
      await env.DB.prepare(`
        DELETE FROM shelves WHERE location_id = ?
      `).bind((location as any).id).run();
    }

    // 4. Delete the locations owned by this user
    await env.DB.prepare(`
      DELETE FROM locations WHERE owner_id = ?
    `).bind(userIdToDelete).run();

    // 5. Remove user from location memberships
    await env.DB.prepare(`
      DELETE FROM location_members WHERE user_id = ?
    `).bind(userIdToDelete).run();

    // 6. Delete invitations sent by this user
    await env.DB.prepare(`
      DELETE FROM location_invitations WHERE invited_by = ?
    `).bind(userIdToDelete).run();

    // 7. Delete invitations sent to this user
    await env.DB.prepare(`
      DELETE FROM location_invitations WHERE invited_email = ?
    `).bind(email_to_delete).run();

    // 8. Finally, delete the user
    await env.DB.prepare(`
      DELETE FROM users WHERE id = ?
    `).bind(userIdToDelete).run();

    return new Response(JSON.stringify({ 
      message: `User ${email_to_delete} and all associated data deleted successfully`,
      deleted_user_id: userIdToDelete,
      owned_locations_count: ownedLocations.results.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error during user cleanup:', error);
    return new Response(JSON.stringify({ error: 'Failed to cleanup user' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Admin-only debug function to list all users
async function debugListUsers(userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all users
    const users = await env.DB.prepare(`
      SELECT id, email, first_name, last_name, auth_provider, email_verified, user_role, created_at
      FROM users 
      ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify(users.results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error listing users:', error);
    return new Response(JSON.stringify({ error: 'Failed to list users' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function checkUserExists(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email parameter required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const user = await env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first();
    
    return new Response(JSON.stringify({ exists: !!user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error checking user existence:', error);
    return new Response(JSON.stringify({ exists: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Leave location function

// Book removal request functions moved to ./books module

// Book checkout functions moved to ./books module

