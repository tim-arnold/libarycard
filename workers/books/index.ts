import { Env, Book } from '../types';

// Core Book Management Functions
export async function getUserBooks(userId: string, env: Env, corsHeaders: Record<string, string>) {
  const stmt = env.DB.prepare(`
    SELECT DISTINCT b.id, b.isbn, b.title, b.authors, b.description, b.thumbnail, b.published_date,
           b.categories, b.shelf_id, b.tags, b.added_by, b.created_at, b.status,
           b.checked_out_by, b.checked_out_date, b.due_date,
           b.extended_description, b.subjects, b.page_count, b.google_average_rating, b.google_ratings_count, b.rating_updated_at,
           b.publisher_info, b.open_library_key, b.enhanced_genres, b.series, b.series_number,
           s.name as shelf_name, l.name as location_name,
           br.rating as user_rating, br.review_text as user_review,
           -- Calculate library-specific average rating from book_ratings table
           (SELECT AVG(CAST(rating AS REAL)) FROM book_ratings 
            WHERE book_id = b.id AND user_id IN (
              SELECT DISTINCT u.id FROM users u
              LEFT JOIN location_members lm2 ON u.id = lm2.user_id
              LEFT JOIN locations l2 ON lm2.location_id = l2.id OR l2.owner_id = u.id
              WHERE l2.id = l.id
            )
           ) as library_average_rating,
           -- Calculate library-specific rating count from book_ratings table
           (SELECT COUNT(*) FROM book_ratings 
            WHERE book_id = b.id AND user_id IN (
              SELECT DISTINCT u.id FROM users u
              LEFT JOIN location_members lm2 ON u.id = lm2.user_id
              LEFT JOIN locations l2 ON lm2.location_id = l2.id OR l2.owner_id = u.id
              WHERE l2.id = l.id
            )
           ) as library_rating_count,
           CASE 
             WHEN b.checked_out_by IS NOT NULL THEN 
               (SELECT first_name FROM users WHERE id = b.checked_out_by)
             ELSE NULL 
           END as checked_out_by_name
    FROM books b
    LEFT JOIN shelves s ON b.shelf_id = s.id
    LEFT JOIN locations l ON s.location_id = l.id
    LEFT JOIN location_members lm ON l.id = lm.location_id
    LEFT JOIN book_ratings br ON b.id = br.book_id AND br.user_id = ?
    WHERE b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?
    ORDER BY b.created_at DESC
  `);

  const result = await stmt.bind(userId, userId, userId, userId).all();
  
  const books = result.results.map((book: any) => ({
    ...book,
    authors: book.authors ? JSON.parse(book.authors) : [],
    categories: book.categories ? JSON.parse(book.categories) : [],
    tags: book.tags ? JSON.parse(book.tags) : [],
    subjects: book.subjects ? JSON.parse(book.subjects) : [],
    enhancedGenres: book.enhanced_genres ? JSON.parse(book.enhanced_genres) : [],
    // Map database field names to frontend field names
    publishedDate: book.published_date,
    extendedDescription: book.extended_description,
    pageCount: book.page_count,
    // Use library-specific ratings for library views
    averageRating: book.library_average_rating,
    ratingCount: book.library_rating_count,
    // Keep Google Books ratings available for "More Details" modal
    googleAverageRating: book.google_average_rating,
    googleRatingCount: book.google_ratings_count,
    ratingUpdatedAt: book.rating_updated_at,
    userRating: book.user_rating,
    userReview: book.user_review,
    publisherInfo: book.publisher_info,
    openLibraryKey: book.open_library_key,
    seriesNumber: book.series_number,
    status: book.status || 'available', // Default to available if not set
  }));

  return new Response(JSON.stringify(books), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function createBook(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const book: Book = await request.json();
  
  const stmt = env.DB.prepare(`
    INSERT INTO books (
      isbn, title, authors, description, thumbnail, published_date, categories, 
      shelf_id, tags, added_by, created_at,
      extended_description, subjects, page_count, average_rating, ratings_count,
      publisher_info, open_library_key, enhanced_genres, series, series_number
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    book.isbn,
    book.title,
    typeof book.authors === 'string' ? book.authors : JSON.stringify(book.authors || []),
    book.description || null,
    book.thumbnail || null,
    book.published_date || book.publishedDate || null,  // Accept both snake_case and camelCase
    typeof book.categories === 'string' ? book.categories : JSON.stringify(book.categories || []),
    book.shelf_id || null,
    typeof book.tags === 'string' ? book.tags : JSON.stringify(book.tags || []),
    userId,
    book.extended_description || book.extendedDescription || null,  // Accept both formats
    typeof book.subjects === 'string' ? book.subjects : (book.subjects ? JSON.stringify(book.subjects) : null),
    book.page_count || book.pageCount || null,  // Accept both formats
    book.average_rating || book.averageRating || null,  // Accept both formats
    book.ratings_count || book.ratingsCount || null,  // Accept both formats
    book.publisher_info || book.publisherInfo || null,  // Accept both formats
    book.open_library_key || book.openLibraryKey || null,  // Accept both formats
    typeof book.enhanced_genres === 'string' ? book.enhanced_genres : (book.enhanced_genres ? JSON.stringify(book.enhanced_genres) : book.enhancedGenres ? JSON.stringify(book.enhancedGenres) : null),  // Accept both formats
    book.series || null,
    book.series_number || book.seriesNumber || null  // Accept both formats
  ).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function updateBook(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
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

export async function deleteBook(userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
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

// Book Checkout System Functions
export async function checkoutBook(request: Request, bookId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  let due_date: string | undefined;
  let notes: string | undefined;
  
  // Safely parse JSON body, handling empty/missing body
  try {
    const body = await request.text();
    if (body.trim()) {
      const parsed = JSON.parse(body);
      due_date = parsed.due_date;
      notes = parsed.notes;
    }
  } catch (error) {
    // If JSON parsing fails, continue with undefined values
    console.warn('Failed to parse checkout request body:', error);
  }

  try {
    // Check if user has access to this book and that it's available
    const bookStmt = env.DB.prepare(`
      SELECT b.*, s.location_id, l.name as location_name
      FROM books b
      LEFT JOIN shelves s ON b.shelf_id = s.id
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN location_members lm ON l.id = lm.location_id
      WHERE b.id = ? AND (b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?)
    `);

    const book = await bookStmt.bind(bookId, userId, userId, userId).first();
    
    if (!book) {
      return new Response(JSON.stringify({ error: 'Book not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if book is already checked out
    if ((book as any).status === 'checked_out') {
      return new Response(JSON.stringify({ error: 'Book is already checked out' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate due date (default to 2 weeks from now if not provided)
    const dueDate = due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Update book status
    const updateBookStmt = env.DB.prepare(`
      UPDATE books 
      SET status = 'checked_out', 
          checked_out_by = ?, 
          checked_out_date = datetime('now'), 
          due_date = ?
      WHERE id = ?
    `);

    await updateBookStmt.bind(userId, dueDate, bookId).run();

    // Add checkout history entry
    const historyStmt = env.DB.prepare(`
      INSERT INTO book_checkout_history (book_id, user_id, action, action_date, due_date, notes, created_at)
      VALUES (?, ?, 'checkout', datetime('now'), ?, ?, datetime('now'))
    `);

    await historyStmt.bind(bookId, userId, dueDate, notes || null).run();

    // Get user name for response
    const userStmt = env.DB.prepare(`SELECT first_name, last_name FROM users WHERE id = ?`);
    const user = await userStmt.bind(userId).first();
    const userName = user ? `${(user as any).first_name || ''}`.trim() || 'Unknown' : 'Unknown';

    return new Response(JSON.stringify({ 
      message: 'Book checked out successfully',
      book_title: (book as any).title,
      due_date: dueDate,
      book_id: bookId,
      checked_out_by: userId,
      checked_out_by_name: userName,
      checked_out_date: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking out book:', error);
    return new Response(JSON.stringify({ error: 'Failed to checkout book' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function checkinBook(bookId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Helper function to check if user is admin
  async function isUserAdmin(userId: string, env: Env): Promise<boolean> {
    const user = await env.DB.prepare(`
      SELECT user_role FROM users WHERE id = ?
    `).bind(userId).first();
    
    return (user as any)?.user_role === 'admin';
  }

  try {
    // Check if user has access to this book and that it's checked out by them
    const bookStmt = env.DB.prepare(`
      SELECT b.*, s.location_id, l.name as location_name
      FROM books b
      LEFT JOIN shelves s ON b.shelf_id = s.id
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN location_members lm ON l.id = lm.location_id
      WHERE b.id = ? AND (b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?)
    `);

    const book = await bookStmt.bind(bookId, userId, userId, userId).first();
    
    if (!book) {
      return new Response(JSON.stringify({ error: 'Book not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if book is checked out
    if ((book as any).status !== 'checked_out') {
      return new Response(JSON.stringify({ error: 'Book is not currently checked out' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if book is checked out by this user or if user is admin
    const isAdmin = await isUserAdmin(userId, env);
    if (!isAdmin && (book as any).checked_out_by !== userId) {
      return new Response(JSON.stringify({ error: 'You can only check in books that you have checked out' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update book status
    const updateBookStmt = env.DB.prepare(`
      UPDATE books 
      SET status = 'available', 
          checked_out_by = NULL, 
          checked_out_date = NULL, 
          due_date = NULL
      WHERE id = ?
    `);

    await updateBookStmt.bind(bookId).run();

    // Add checkin history entry
    const historyStmt = env.DB.prepare(`
      INSERT INTO book_checkout_history (book_id, user_id, action, action_date, created_at)
      VALUES (?, ?, 'return', datetime('now'), datetime('now'))
    `);

    await historyStmt.bind(bookId, userId).run();

    return new Response(JSON.stringify({ 
      message: 'Book checked in successfully',
      book_title: (book as any).title,
      book_id: bookId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking in book:', error);
    return new Response(JSON.stringify({ error: 'Failed to checkin book' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function getCheckoutHistory(userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Helper function to check if user is admin
  async function isUserAdmin(userId: string, env: Env): Promise<boolean> {
    const user = await env.DB.prepare(`
      SELECT user_role FROM users WHERE id = ?
    `).bind(userId).first();
    
    return (user as any)?.user_role === 'admin';
  }

  try {
    // Check if user is admin to determine what data they can see
    const isAdmin = await isUserAdmin(userId, env);
    
    let historyStmt;
    let bindings: any[];

    if (isAdmin) {
      // Admins can see all checkout history
      historyStmt = env.DB.prepare(`
        SELECT ch.*, 
               b.title as book_title, 
               b.authors as book_authors,
               b.isbn as book_isbn,
               l.name as location_name,
               u.first_name as user_name,
               u.email as user_email
        FROM book_checkout_history ch
        LEFT JOIN books b ON ch.book_id = b.id
        LEFT JOIN shelves s ON b.shelf_id = s.id
        LEFT JOIN locations l ON s.location_id = l.id
        LEFT JOIN users u ON ch.user_id = u.id
        ORDER BY ch.action_date DESC
      `);
      bindings = [];
    } else {
      // Regular users can only see their own checkout history
      historyStmt = env.DB.prepare(`
        SELECT ch.*, 
               b.title as book_title, 
               b.authors as book_authors,
               b.isbn as book_isbn,
               l.name as location_name
        FROM book_checkout_history ch
        LEFT JOIN books b ON ch.book_id = b.id
        LEFT JOIN shelves s ON b.shelf_id = s.id
        LEFT JOIN locations l ON s.location_id = l.id
        WHERE ch.user_id = ?
        ORDER BY ch.action_date DESC
      `);
      bindings = [userId];
    }

    const result = await historyStmt.bind(...bindings).all();
    
    const history = result.results.map((entry: any) => ({
      ...entry,
      book_authors: entry.book_authors ? JSON.parse(entry.book_authors) : []
    }));

    return new Response(JSON.stringify(history), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching checkout history:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch checkout history' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Book Removal Request Functions
export async function createBookRemovalRequest(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const { book_id, reason, reason_details }: {
    book_id: number;
    reason: string;
    reason_details?: string;
  } = await request.json();

  if (!book_id || !reason) {
    return new Response(JSON.stringify({ error: 'book_id and reason are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate reason
  const validReasons = ['lost', 'damaged', 'missing', 'other'];
  if (!validReasons.includes(reason)) {
    return new Response(JSON.stringify({ error: 'Invalid reason. Must be one of: lost, damaged, missing, other' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check if user has access to this book
    const bookAccessStmt = env.DB.prepare(`
      SELECT b.id, b.title, b.authors, s.location_id, l.name as location_name
      FROM books b
      LEFT JOIN shelves s ON b.shelf_id = s.id
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN location_members lm ON l.id = lm.location_id
      WHERE b.id = ? AND (b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?)
    `);

    const bookAccess = await bookAccessStmt.bind(book_id, userId, userId, userId).first();
    
    if (!bookAccess) {
      return new Response(JSON.stringify({ error: 'Book not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if there's already a pending request for this book
    const existingRequestStmt = env.DB.prepare(`
      SELECT id FROM book_removal_requests 
      WHERE book_id = ? AND status = 'pending'
    `);
    const existingRequest = await existingRequestStmt.bind(book_id).first();
    
    if (existingRequest) {
      return new Response(JSON.stringify({ error: 'A removal request for this book is already pending' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the removal request
    const createRequestStmt = env.DB.prepare(`
      INSERT INTO book_removal_requests (book_id, requester_id, reason, reason_details, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `);

    const result = await createRequestStmt.bind(
      book_id,
      userId,
      reason,
      reason_details || null
    ).run();

    return new Response(JSON.stringify({ 
      id: result.meta.last_row_id,
      message: 'Book removal request submitted successfully',
      book_title: bookAccess.title,
      status: 'pending'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating book removal request:', error);
    return new Response(JSON.stringify({ error: 'Failed to create removal request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function getBookRemovalRequests(userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Helper function to check if user is admin
  async function isUserAdmin(userId: string, env: Env): Promise<boolean> {
    const user = await env.DB.prepare(`
      SELECT user_role FROM users WHERE id = ?
    `).bind(userId).first();
    
    return (user as any)?.user_role === 'admin';
  }

  try {
    // Check if user is admin
    const isAdmin = await isUserAdmin(userId, env);
    
    let requestsStmt;
    let bindings: any[];

    if (isAdmin) {
      // Admins can see all requests
      requestsStmt = env.DB.prepare(`
        SELECT rr.*, 
               b.title as book_title, 
               b.authors as book_authors,
               b.isbn as book_isbn,
               l.name as location_name,
               u_requester.first_name as requester_name,
               u_requester.email as requester_email,
               u_reviewer.first_name as reviewer_name
        FROM book_removal_requests rr
        LEFT JOIN books b ON rr.book_id = b.id
        LEFT JOIN shelves s ON b.shelf_id = s.id
        LEFT JOIN locations l ON s.location_id = l.id
        LEFT JOIN users u_requester ON rr.requester_id = u_requester.id
        LEFT JOIN users u_reviewer ON rr.reviewed_by = u_reviewer.id
        ORDER BY rr.created_at DESC
      `);
      bindings = [];
    } else {
      // Regular users can only see their own requests
      requestsStmt = env.DB.prepare(`
        SELECT rr.*, 
               b.title as book_title, 
               b.authors as book_authors,
               b.isbn as book_isbn,
               l.name as location_name,
               u_reviewer.first_name as reviewer_name
        FROM book_removal_requests rr
        LEFT JOIN books b ON rr.book_id = b.id
        LEFT JOIN shelves s ON b.shelf_id = s.id
        LEFT JOIN locations l ON s.location_id = l.id
        LEFT JOIN users u_reviewer ON rr.reviewed_by = u_reviewer.id
        WHERE rr.requester_id = ?
        ORDER BY rr.created_at DESC
      `);
      bindings = [userId];
    }

    const result = await requestsStmt.bind(...bindings).all();
    
    const requests = result.results.map((request: any) => ({
      ...request,
      book_authors: request.book_authors ? JSON.parse(request.book_authors) : []
    }));

    return new Response(JSON.stringify(requests), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching book removal requests:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch removal requests' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function approveBookRemovalRequest(requestId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Helper function to check if user is admin
  async function isUserAdmin(userId: string, env: Env): Promise<boolean> {
    const user = await env.DB.prepare(`
      SELECT user_role FROM users WHERE id = ?
    `).bind(userId).first();
    
    return (user as any)?.user_role === 'admin';
  }

  // Check if user is admin (only admins can approve requests)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to approve removal requests' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get the removal request details
    const requestStmt = env.DB.prepare(`
      SELECT rr.*, b.title as book_title, b.authors as book_authors
      FROM book_removal_requests rr
      LEFT JOIN books b ON rr.book_id = b.id
      WHERE rr.id = ? AND rr.status = 'pending'
    `);
    
    const removalRequest = await requestStmt.bind(requestId).first();
    
    if (!removalRequest) {
      return new Response(JSON.stringify({ error: 'Removal request not found or already processed' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete the book
    const deleteBookStmt = env.DB.prepare('DELETE FROM books WHERE id = ?');
    await deleteBookStmt.bind((removalRequest as any).book_id).run();

    // Update the removal request status
    const updateRequestStmt = env.DB.prepare(`
      UPDATE book_removal_requests 
      SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `);
    
    await updateRequestStmt.bind(userId, requestId).run();

    return new Response(JSON.stringify({ 
      message: 'Book removal request approved and book deleted successfully',
      book_title: (removalRequest as any).book_title,
      request_id: requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error approving book removal request:', error);
    return new Response(JSON.stringify({ error: 'Failed to approve removal request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function denyBookRemovalRequest(request: Request, requestId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  // Helper function to check if user is admin
  async function isUserAdmin(userId: string, env: Env): Promise<boolean> {
    const user = await env.DB.prepare(`
      SELECT user_role FROM users WHERE id = ?
    `).bind(userId).first();
    
    return (user as any)?.user_role === 'admin';
  }

  // Check if user is admin (only admins can deny requests)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to deny removal requests' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { review_comment }: { review_comment?: string } = await request.json();

  try {
    // Get the removal request details
    const requestStmt = env.DB.prepare(`
      SELECT rr.*, b.title as book_title
      FROM book_removal_requests rr
      LEFT JOIN books b ON rr.book_id = b.id
      WHERE rr.id = ? AND rr.status = 'pending'
    `);
    
    const removalRequest = await requestStmt.bind(requestId).first();
    
    if (!removalRequest) {
      return new Response(JSON.stringify({ error: 'Removal request not found or already processed' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the removal request status
    const updateRequestStmt = env.DB.prepare(`
      UPDATE book_removal_requests 
      SET status = 'denied', reviewed_by = ?, review_comment = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `);
    
    await updateRequestStmt.bind(userId, review_comment || null, requestId).run();

    return new Response(JSON.stringify({ 
      message: 'Book removal request denied',
      book_title: (removalRequest as any).book_title,
      request_id: requestId,
      review_comment: review_comment || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error denying book removal request:', error);
    return new Response(JSON.stringify({ error: 'Failed to deny removal request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function deleteBookRemovalRequest(requestId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  try {
    // Get the removal request details and verify user owns it
    const requestStmt = env.DB.prepare(`
      SELECT rr.*, b.title as book_title
      FROM book_removal_requests rr
      LEFT JOIN books b ON rr.book_id = b.id
      WHERE rr.id = ? AND rr.requester_id = ? AND rr.status = 'pending'
    `);
    
    const removalRequest = await requestStmt.bind(requestId, userId).first();
    
    if (!removalRequest) {
      return new Response(JSON.stringify({ error: 'Removal request not found, already processed, or you do not have permission to cancel it' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete the removal request
    const deleteStmt = env.DB.prepare('DELETE FROM book_removal_requests WHERE id = ?');
    await deleteStmt.bind(requestId).run();

    return new Response(JSON.stringify({ 
      message: 'Book removal request cancelled successfully',
      book_title: (removalRequest as any).book_title,
      request_id: requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error cancelling book removal request:', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel removal request' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Book Rating System Functions
export async function rateBook(request: Request, bookId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const { rating, reviewText }: { rating: number, reviewText?: string } = await request.json();

  // Validate rating (allow 0 for deletion, 1-5 for rating)
  if (rating < 0 || rating > 5 || !Number.isInteger(rating)) {
    return new Response(JSON.stringify({ error: 'Rating must be an integer between 0 (to delete) and 5' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check if user has access to this book
    const bookAccessStmt = env.DB.prepare(`
      SELECT b.id, b.title, s.location_id, l.name as location_name
      FROM books b
      LEFT JOIN shelves s ON b.shelf_id = s.id
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN location_members lm ON l.id = lm.location_id
      WHERE b.id = ? AND (b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?)
    `);

    const bookAccess = await bookAccessStmt.bind(bookId, userId, userId, userId).first();
    
    if (!bookAccess) {
      return new Response(JSON.stringify({ error: 'Book not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle rating deletion (rating = 0) or insertion/update
    if (rating === 0) {
      // Delete the rating
      const deleteRatingStmt = env.DB.prepare(`
        DELETE FROM book_ratings WHERE book_id = ? AND user_id = ?
      `);
      await deleteRatingStmt.bind(bookId, userId).run();
    } else {
      // Insert or update rating in book_ratings table
      const upsertRatingStmt = env.DB.prepare(`
        INSERT OR REPLACE INTO book_ratings (book_id, user_id, rating, review_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, 
          COALESCE((SELECT created_at FROM book_ratings WHERE book_id = ? AND user_id = ?), datetime('now')),
          datetime('now')
        )
      `);
      await upsertRatingStmt.bind(bookId, userId, rating, reviewText || null, bookId, userId).run();
    }

    // Calculate new average rating for this book within the location
    const avgRatingStmt = env.DB.prepare(`
      SELECT 
        AVG(br.rating) as average_rating,
        COUNT(br.rating) as rating_count
      FROM book_ratings br
      INNER JOIN books b ON br.book_id = b.id
      INNER JOIN shelves s ON b.shelf_id = s.id
      INNER JOIN locations l ON s.location_id = l.id
      LEFT JOIN location_members lm ON l.id = lm.location_id
      WHERE br.book_id = ? 
        AND (b.added_by = br.user_id OR l.owner_id = br.user_id OR lm.user_id = br.user_id)
    `);

    const ratingStats = await avgRatingStmt.bind(bookId).first();
    const averageRating = (ratingStats as any)?.average_rating || null;
    const ratingCount = (ratingStats as any)?.rating_count || 0;

    // Update the books table with new average rating (library-wide average, not user-specific)
    const updateBookStmt = env.DB.prepare(`
      UPDATE books 
      SET rating_count = ?, rating_updated_at = datetime('now')
      WHERE id = ?
    `);

    await updateBookStmt.bind(ratingCount, bookId).run();

    return new Response(JSON.stringify({ 
      message: rating === 0 ? 'Rating deleted successfully' : 'Book rated successfully',
      book_id: bookId,
      book_title: (bookAccess as any).title,
      user_rating: rating === 0 ? null : rating,
      average_rating: averageRating,
      rating_count: ratingCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error rating book:', error);
    return new Response(JSON.stringify({ error: 'Failed to rate book' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function getBookRating(bookId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  try {
    // Check if user has access to this book and get rating info
    const ratingStmt = env.DB.prepare(`
      SELECT 
        b.id, b.title, b.user_rating, b.average_rating, b.rating_count, s.location_id,
        br.rating as current_user_rating, br.review_text as current_user_review
      FROM books b
      LEFT JOIN shelves s ON b.shelf_id = s.id
      LEFT JOIN locations l ON s.location_id = l.id
      LEFT JOIN location_members lm ON l.id = lm.location_id
      LEFT JOIN book_ratings br ON b.id = br.book_id AND br.user_id = ?
      WHERE b.id = ? AND (b.added_by = ? OR l.owner_id = ? OR lm.user_id = ?)
    `);

    const result = await ratingStmt.bind(userId, bookId, userId, userId, userId).first();
    
    if (!result) {
      return new Response(JSON.stringify({ error: 'Book not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bookRating = result as any;

    // Get all reviews for this book in this location
    const allReviewsStmt = env.DB.prepare(`
      SELECT 
        br.rating, br.review_text, br.created_at, br.updated_at,
        u.first_name as user_name
      FROM book_ratings br
      INNER JOIN books b ON br.book_id = b.id
      INNER JOIN shelves s ON b.shelf_id = s.id
      INNER JOIN locations l ON s.location_id = l.id
      LEFT JOIN location_members lm ON l.id = lm.location_id
      INNER JOIN users u ON br.user_id = u.id
      WHERE br.book_id = ? 
        AND (b.added_by = br.user_id OR l.owner_id = br.user_id OR lm.user_id = br.user_id)
        AND br.review_text IS NOT NULL AND br.review_text != ''
      ORDER BY br.created_at DESC
    `);

    const reviewsResult = await allReviewsStmt.bind(bookId).all();

    return new Response(JSON.stringify({
      book_id: bookId,
      user_rating: bookRating.current_user_rating || null,
      user_review: bookRating.current_user_review || null,
      average_rating: bookRating.average_rating || null,
      rating_count: bookRating.rating_count || 0,
      location_id: bookRating.location_id,
      all_ratings: reviewsResult.results || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error getting book rating:', error);
    return new Response(JSON.stringify({ error: 'Failed to get book rating' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}