import { Env } from '../types';
import { isUserAdmin } from '../auth';

// Extended admin functions extracted from main worker

export async function getAdminAnalytics(userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get total counts
    const totalBooks = await env.DB.prepare('SELECT COUNT(*) as count FROM books').first();
    const totalUsers = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const totalLocations = await env.DB.prepare('SELECT COUNT(*) as count FROM locations').first();
    const pendingRequests = await env.DB.prepare('SELECT COUNT(*) as count FROM book_removal_requests WHERE status = "pending"').first();

    // Books per location
    const booksPerLocation = await env.DB.prepare(`
      SELECT l.name, COUNT(b.id) as book_count
      FROM locations l
      LEFT JOIN shelves s ON l.id = s.location_id
      LEFT JOIN books b ON s.id = b.shelf_id
      GROUP BY l.id, l.name
      ORDER BY book_count DESC
    `).all();

    // Recent activity (last 30 days)
    const recentBooks = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM books 
      WHERE created_at >= datetime('now', '-30 days')
    `).first();

    // Most active users (by books added)
    const activeUsers = await env.DB.prepare(`
      SELECT u.first_name, u.last_name, u.email, COUNT(b.id) as books_added
      FROM users u
      LEFT JOIN books b ON u.id = b.added_by
      GROUP BY u.id
      HAVING books_added > 0
      ORDER BY books_added DESC
      LIMIT 10
    `).all();

    // Genre distribution
    const genreStats = await env.DB.prepare(`
      SELECT b.categories, b.enhanced_genres
      FROM books b
      WHERE b.categories IS NOT NULL OR b.enhanced_genres IS NOT NULL
    `).all();

    // Process genre statistics
    const genreCounts: Record<string, number> = {};
    genreStats.results.forEach((book: any) => {
      const categories = book.categories ? JSON.parse(book.categories) : [];
      const enhancedGenres = book.enhanced_genres ? JSON.parse(book.enhanced_genres) : [];
      [...categories, ...enhancedGenres].forEach((genre: string) => {
        if (genre && genre.trim()) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    });

    const topGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count }));

    // Books without shelves
    const unorganizedBooks = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM books 
      WHERE shelf_id IS NULL
    `).first();

    // Recent checkout activity
    const recentCheckouts = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM books 
      WHERE checked_out_date >= datetime('now', '-30 days')
    `).first();

    return new Response(JSON.stringify({
      overview: {
        totalBooks: (totalBooks as any)?.count || 0,
        totalUsers: (totalUsers as any)?.count || 0,
        totalLocations: (totalLocations as any)?.count || 0,
        pendingRequests: (pendingRequests as any)?.count || 0,
        unorganizedBooks: (unorganizedBooks as any)?.count || 0,
        recentBooks: (recentBooks as any)?.count || 0,
        recentCheckouts: (recentCheckouts as any)?.count || 0,
      },
      booksPerLocation: booksPerLocation.results,
      activeUsers: activeUsers.results,
      topGenres,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating admin analytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate analytics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function getAdminUsers(userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all users with activity stats
    const users = await env.DB.prepare(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.auth_provider, 
             u.email_verified, u.user_role, u.created_at,
             COUNT(DISTINCT b.id) as books_added,
             COUNT(DISTINCT COALESCE(lm.location_id, l.id)) as locations_joined,
             MAX(b.created_at) as last_book_added
      FROM users u
      LEFT JOIN books b ON u.id = b.added_by
      LEFT JOIN location_members lm ON u.id = lm.user_id
      LEFT JOIN locations l ON u.id = l.owner_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    return new Response(JSON.stringify(users.results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching admin users:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function updateUserRole(request: Request, targetUserId: string, adminUserId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin
  if (!(await isUserAdmin(adminUserId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { role }: { role: 'admin' | 'user' } = await request.json();

    if (!['admin', 'user'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role. Must be "admin" or "user"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if target user exists
    const targetUser = await env.DB.prepare(`
      SELECT id, email, user_role FROM users WHERE id = ?
    `).bind(targetUserId).first();

    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent admin from demoting themselves
    if (targetUserId === adminUserId && role === 'user') {
      return new Response(JSON.stringify({ error: 'Cannot demote yourself from admin' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update user role
    await env.DB.prepare(`
      UPDATE users 
      SET user_role = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(role, targetUserId).run();

    return new Response(JSON.stringify({ 
      message: `User role updated to ${role}`,
      userId: targetUserId,
      newRole: role
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user role' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function getAvailableAdmins(userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user is admin
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all admin users (for ownership transfer)
    const admins = await env.DB.prepare(`
      SELECT id, email, first_name, last_name
      FROM users 
      WHERE user_role = 'admin'
      ORDER BY first_name, last_name, email
    `).all();

    return new Response(JSON.stringify(admins.results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching available admins:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch admin users' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}