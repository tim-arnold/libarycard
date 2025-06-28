import { Env } from '../types';

// Auth utility functions extracted from main worker

export async function checkUserExists(request: Request, env: Env, corsHeaders: Record<string, string>) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user exists
    const user = await env.DB.prepare(`
      SELECT id, email_verified FROM users WHERE email = ?
    `).bind(email).first();

    return new Response(JSON.stringify({ 
      exists: !!user,
      verified: user ? (user as any).email_verified : false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking user existence:', error);
    return new Response(JSON.stringify({ error: 'Failed to check user' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}