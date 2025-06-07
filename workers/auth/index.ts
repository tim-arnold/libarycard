import { Env } from '../types';

// Authentication helper (simplified - in production you'd verify JWT)
export async function getUserFromRequest(request: Request, env: Env): Promise<string | null> {
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

// Permission helper functions
export async function getUserRole(userId: string, env: Env): Promise<string> {
  const user = await env.DB.prepare(`
    SELECT user_role FROM users WHERE id = ?
  `).bind(userId).first();
  
  return (user as any)?.user_role || 'user';
}

export async function isUserAdmin(userId: string, env: Env): Promise<boolean> {
  const role = await getUserRole(userId, env);
  return role === 'admin';
}