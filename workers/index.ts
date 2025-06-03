export interface Env {
  DB: D1Database;
  NEXTAUTH_SECRET: string;
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface Location {
  id?: number;
  name: string;
  description?: string;
  owner_id: string;
}

interface Shelf {
  id?: number;
  name: string;
  location_id: number;
}

interface Book {
  id?: number;
  isbn: string;
  title: string;
  authors: string;
  description?: string;
  thumbnail?: string;
  published_date?: string;
  categories?: string;
  shelf_id?: number;
  tags?: string;
  added_by: string;
}

const DEFAULT_SHELVES = [
  'basement',
  "julie's room",
  "tim's room",
  'bench',
  "julie's office",
  'little library'
];

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
      // Get user from session/token (simplified for now)
      const userId = await getUserFromRequest(request);
      
      // User endpoints
      if (path === '/api/users' && request.method === 'POST') {
        return await createOrUpdateUser(request, env, corsHeaders);
      }

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

      if (path.match(/^\/api\/locations\/\d+\/shelves$/) && request.method === 'GET') {
        const locationId = parseInt(path.split('/')[3]);
        return await getLocationShelves(locationId, userId, env, corsHeaders);
      }

      // Book endpoints
      if (path === '/api/books' && request.method === 'GET') {
        return await getUserBooks(userId, env, corsHeaders);
      }

      if (path === '/api/books' && request.method === 'POST') {
        return await createBook(request, userId, env, corsHeaders);
      }

      if (path.startsWith('/api/books/') && request.method === 'PUT') {
        const id = parseInt(path.split('/')[3]);
        return await updateBook(request, userId, env, corsHeaders, id);
      }

      if (path.startsWith('/api/books/') && request.method === 'DELETE') {
        const id = parseInt(path.split('/')[3]);
        return await deleteBook(userId, env, corsHeaders, id);
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
async function getUserFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  // For now, just extract user ID from token
  // In production, you'd verify the JWT token from NextAuth
  const token = authHeader.substring(7);
  return token; // Simplified - return the token as user ID
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
async function getUserLocations(userId: string, env: Env, corsHeaders: Record<string, string>) {
  const stmt = env.DB.prepare(`
    SELECT l.* FROM locations l
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE l.owner_id = ? OR lm.user_id = ?
    ORDER BY l.created_at DESC
  `);

  const result = await stmt.bind(userId, userId).all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function createLocation(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const location: Location = await request.json();
  
  // Create location
  const locationStmt = env.DB.prepare(`
    INSERT INTO locations (name, description, owner_id, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  const locationResult = await locationStmt.bind(
    location.name,
    location.description || null,
    userId
  ).run();

  const locationId = locationResult.meta.last_row_id;

  // Create default shelves
  for (const shelfName of DEFAULT_SHELVES) {
    const shelfStmt = env.DB.prepare(`
      INSERT INTO shelves (name, location_id, created_at)
      VALUES (?, ?, datetime('now'))
    `);
    await shelfStmt.bind(shelfName, locationId).run();
  }

  return new Response(JSON.stringify({ 
    id: locationId, 
    ...location, 
    owner_id: userId 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getLocationShelves(locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Check if user has access to this location
  const accessStmt = env.DB.prepare(`
    SELECT 1 FROM locations l
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE l.id = ? AND (l.owner_id = ? OR lm.user_id = ?)
  `);

  const accessResult = await accessStmt.bind(locationId, userId, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stmt = env.DB.prepare(`
    SELECT * FROM shelves 
    WHERE location_id = ? 
    ORDER BY name
  `);

  const result = await stmt.bind(locationId).all();
  
  return new Response(JSON.stringify(result.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Book functions
async function getUserBooks(userId: string, env: Env, corsHeaders: Record<string, string>) {
  const stmt = env.DB.prepare(`
    SELECT b.*, s.name as shelf_name, l.name as location_name
    FROM books b
    LEFT JOIN shelves s ON b.shelf_id = s.id
    LEFT JOIN locations l ON s.location_id = l.id
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?
    ORDER BY b.created_at DESC
  `);

  const result = await stmt.bind(userId, userId, userId).all();
  
  const books = result.results.map((book: any) => ({
    ...book,
    authors: book.authors ? JSON.parse(book.authors) : [],
    categories: book.categories ? JSON.parse(book.categories) : [],
    tags: book.tags ? JSON.parse(book.tags) : [],
  }));

  return new Response(JSON.stringify(books), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function createBook(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const book: Book = await request.json();
  
  const stmt = env.DB.prepare(`
    INSERT INTO books (isbn, title, authors, description, thumbnail, published_date, categories, shelf_id, tags, added_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  await stmt.bind(
    book.isbn,
    book.title,
    JSON.stringify(book.authors || []),
    book.description || null,
    book.thumbnail || null,
    book.published_date || null,
    JSON.stringify(book.categories || []),
    book.shelf_id || null,
    JSON.stringify(book.tags || []),
    userId
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateBook(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
  const book: Partial<Book> = await request.json();
  
  // Check if user has access to this book
  const accessStmt = env.DB.prepare(`
    SELECT b.id FROM books b
    LEFT JOIN shelves s ON b.shelf_id = s.id
    LEFT JOIN locations l ON s.location_id = l.id
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE b.id = ? AND (b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?)
  `);

  const accessResult = await accessStmt.bind(id, userId, userId, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stmt = env.DB.prepare(`
    UPDATE books 
    SET shelf_id = ?, tags = ?
    WHERE id = ?
  `);

  await stmt.bind(
    book.shelf_id || null,
    JSON.stringify(book.tags || []),
    id
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function deleteBook(userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
  // Check if user has access to this book
  const accessStmt = env.DB.prepare(`
    SELECT b.id FROM books b
    LEFT JOIN shelves s ON b.shelf_id = s.id
    LEFT JOIN locations l ON s.location_id = l.id
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE b.id = ? AND (b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?)
  `);

  const accessResult = await accessStmt.bind(id, userId, userId, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stmt = env.DB.prepare('DELETE FROM books WHERE id = ?');
  await stmt.bind(id).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}