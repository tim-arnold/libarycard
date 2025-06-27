import { Env } from '../types';
import { sendVerificationEmail, notifyAdminsOfSignupRequest } from '../email';

// Core authentication functions extracted from main worker

export async function createOrUpdateUser(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const user: any = await request.json();
  
  const stmt = env.DB.prepare(`
    INSERT OR REPLACE INTO users (id, email, first_name, last_name, auth_provider, email_verified, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  await stmt.bind(
    user.id,
    user.email,
    user.first_name || null,
    user.last_name || null,
    user.auth_provider || 'email',
    user.email_verified ? 1 : 0
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function registerUser(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const { email, password, first_name, last_name, invitation_token }: {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
    invitation_token?: string;
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

  // Check if there's already a pending signup request for this email
  let existingRequest = null;
  try {
    existingRequest = await env.DB.prepare(`
      SELECT email FROM signup_approval_requests WHERE email = ? AND status = 'pending'
    `).bind(email).first();
    
    if (existingRequest) {
      return new Response(JSON.stringify({ error: 'A signup request for this email is already pending admin approval' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.log('Signup approval table not found - proceeding with legacy registration');
    // Table doesn't exist yet, proceed with legacy flow
  }
  
  // Check if user has a valid invitation
  let invitation = null;
  
  if (invitation_token) {
    // If invitation token is provided, look up by token
    invitation = await env.DB.prepare(`
      SELECT li.id, li.location_id, l.name as location_name
      FROM location_invitations li
      LEFT JOIN locations l ON li.location_id = l.id
      WHERE li.invitation_token = ? AND li.used_at IS NULL AND li.expires_at > datetime('now')
    `).bind(invitation_token).first();
  } else {
    // Fall back to email lookup
    invitation = await env.DB.prepare(`
      SELECT li.id, li.location_id, l.name as location_name
      FROM location_invitations li
      LEFT JOIN locations l ON li.location_id = l.id
      WHERE li.invited_email = ? AND li.used_at IS NULL AND li.expires_at > datetime('now')
    `).bind(email).first();
  }

  // Hash password for storage
  const passwordHash = await hashPassword(password);
  
  
  if (invitation) {
    // User has valid invitation - proceed with normal registration
    // Generate verification token
    const verificationToken = generateUUID();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    // Generate user ID
    const userId = generateUUID();
    
    // For invited users, skip email verification since they were already verified by receiving the invitation
    const emailVerified = true; // Invited users are pre-verified
    
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

    // No verification email needed for invited users since they're pre-verified
    // await sendVerificationEmail(env, email, first_name, verificationToken);

    const message = `Registration successful! You have been invited to join "${(invitation as any).location_name}". You can now sign in with your new account.`;

    return new Response(JSON.stringify({ 
      message,
      userId,
      requires_verification: false,
      has_invitation: true,
      location_name: (invitation as any).location_name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    // No invitation - create signup approval request (if table exists)
    try {
      const stmt = env.DB.prepare(`
        INSERT INTO signup_approval_requests (
          email, first_name, last_name, password_hash, auth_provider, 
          status, requested_at
        )
        VALUES (?, ?, ?, ?, 'email', 'pending', datetime('now'))
      `);

      const result = await stmt.bind(
        email,
        first_name,
        last_name || '',
        passwordHash
      ).run();

      // Notify all admins about the signup request (don't let email failures break the approval flow)
      try {
        await notifyAdminsOfSignupRequest(env, email, first_name, last_name);
      } catch (emailError) {
        console.error('Failed to send admin notification emails, but signup request was created:', emailError);
      }

      return new Response(JSON.stringify({ 
        message: 'Your signup request has been submitted for admin approval. You will receive an email notification once your request is reviewed.',
        requires_approval: true,
        request_id: result.meta.last_row_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.log('Signup approval table not found - proceeding with legacy registration');
      
      // Fall back to legacy registration if approval table doesn't exist
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
  }
}

export async function verifyCredentials(request: Request, env: Env, corsHeaders: Record<string, string>) {
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

export async function verifyEmail(request: Request, env: Env, corsHeaders: Record<string, string>) {
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

// Utility functions for authentication
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
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

export async function hashPassword(password: string): Promise<string> {
  // In a real Cloudflare Worker, you'd use the Web Crypto API
  // For now, we'll use a simple hash (replace with proper bcrypt in production)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt'); // Add proper salt in production
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}