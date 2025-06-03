export interface Env {
  DB: D1Database;
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
  location?: string;
  tags?: string;
  created_at?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/api/books' && request.method === 'GET') {
        return await getBooks(env, corsHeaders);
      }

      if (path === '/api/books' && request.method === 'POST') {
        return await createBook(request, env, corsHeaders);
      }

      if (path.startsWith('/api/books/') && request.method === 'PUT') {
        const id = parseInt(path.split('/')[3]);
        return await updateBook(request, env, corsHeaders, id);
      }

      if (path.startsWith('/api/books/') && request.method === 'DELETE') {
        const id = parseInt(path.split('/')[3]);
        return await deleteBook(env, corsHeaders, id);
      }

      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });
    } catch (error) {
      return new Response(`Error: ${error}`, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};

async function getBooks(env: Env, corsHeaders: Record<string, string>) {
  const result = await env.DB.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
  
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

async function createBook(request: Request, env: Env, corsHeaders: Record<string, string>) {
  const book: Book = await request.json();
  
  const stmt = env.DB.prepare(`
    INSERT INTO books (isbn, title, authors, description, thumbnail, published_date, categories, location, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  await stmt.bind(
    book.isbn,
    book.title,
    JSON.stringify(book.authors || []),
    book.description || null,
    book.thumbnail || null,
    book.published_date || null,
    JSON.stringify(book.categories || []),
    book.location || null,
    JSON.stringify(book.tags || [])
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateBook(request: Request, env: Env, corsHeaders: Record<string, string>, id: number) {
  const book: Partial<Book> = await request.json();
  
  const stmt = env.DB.prepare(`
    UPDATE books 
    SET location = ?, tags = ?
    WHERE id = ?
  `);

  await stmt.bind(
    book.location,
    JSON.stringify(book.tags),
    id
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function deleteBook(env: Env, corsHeaders: Record<string, string>, id: number) {
  const stmt = env.DB.prepare('DELETE FROM books WHERE id = ?');
  await stmt.bind(id).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}