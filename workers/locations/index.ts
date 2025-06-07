import { Env, Location, Shelf, DEFAULT_SHELVES } from '../types';

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

// Permission checking function
export async function checkLocationPermission(
  userId: string, 
  locationId: number, 
  env: Env, 
  requireAdmin: boolean = false
): Promise<boolean> {
  // Check if user is admin (admins can access all locations)
  if (await isUserAdmin(userId, env)) {
    return true;
  }
  
  // If admin access is required and user is not admin, deny
  if (requireAdmin) {
    return false;
  }
  
  // Check if user has access to this location (owner or member)
  const accessStmt = env.DB.prepare(`
    SELECT 1 FROM locations l
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE l.id = ? AND (l.owner_id = ? OR lm.user_id = ?)
  `);
  
  const accessResult = await accessStmt.bind(locationId, userId, userId).first();
  return !!accessResult;
}

// Location functions
export async function getUserLocations(userId: string, env: Env, corsHeaders: Record<string, string>) {
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

export async function createLocation(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const location: Location = await request.json();
  
  // Check if user is admin (only admins can create locations)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to create locations' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
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

export async function updateLocation(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
  const location: Partial<Location> = await request.json();
  
  // Check if user is admin (only admins can update locations)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to update locations' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check if user has access to this location (only owner can edit)
  const accessStmt = env.DB.prepare(`
    SELECT id FROM locations WHERE id = ? AND owner_id = ?
  `);

  const accessResult = await accessStmt.bind(id, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stmt = env.DB.prepare(`
    UPDATE locations 
    SET name = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  await stmt.bind(
    location.name,
    location.description || null,
    id
  ).run();

  // Return the updated location
  const updatedLocation = {
    id,
    name: location.name,
    description: location.description || null,
    owner_id: userId,
    updated_at: new Date().toISOString()
  };

  return new Response(JSON.stringify(updatedLocation), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function deleteLocation(userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
  // Check if user is admin (only admins can delete locations)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to delete locations' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check if user has access to this location (only owner can delete)
  const accessStmt = env.DB.prepare(`
    SELECT id FROM locations WHERE id = ? AND owner_id = ?
  `);

  const accessResult = await accessStmt.bind(id, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Delete associated shelves and books first (cascading delete)
  await env.DB.prepare('DELETE FROM books WHERE shelf_id IN (SELECT id FROM shelves WHERE location_id = ?)').bind(id).run();
  await env.DB.prepare('DELETE FROM shelves WHERE location_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM location_members WHERE location_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM locations WHERE id = ?').bind(id).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function leaveLocation(locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  try {
    // Check if user has access to this location
    const accessStmt = env.DB.prepare(`
      SELECT 1 FROM location_members WHERE location_id = ? AND user_id = ?
    `);
    const accessResult = await accessStmt.bind(locationId, userId).first();
    
    if (!accessResult) {
      return new Response(JSON.stringify({ error: 'You are not a member of this location' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is the user's last location
    const locationCountStmt = env.DB.prepare(`
      SELECT COUNT(*) as count FROM location_members WHERE user_id = ?
    `);
    const countResult = await locationCountStmt.bind(userId).first();
    const locationCount = (countResult as any)?.count || 0;

    if (locationCount <= 1) {
      return new Response(JSON.stringify({ error: 'You cannot leave your last location. You need access to at least one library.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete user's books from this location
    const deleteBooksStmt = env.DB.prepare(`
      DELETE FROM books 
      WHERE added_by = ? AND shelf_id IN (
        SELECT id FROM shelves WHERE location_id = ?
      )
    `);
    await deleteBooksStmt.bind(userId, locationId).run();

    // Remove user from location membership
    const removeMemberStmt = env.DB.prepare(`
      DELETE FROM location_members WHERE location_id = ? AND user_id = ?
    `);
    await removeMemberStmt.bind(locationId, userId).run();

    return new Response(JSON.stringify({ 
      message: 'Successfully left the location. Your books from this location have been removed.',
      location_id: locationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error leaving location:', error);
    return new Response(JSON.stringify({ error: 'Failed to leave location' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Shelf functions
export async function getLocationShelves(locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
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

export async function createShelf(request: Request, locationId: number, userId: string, env: Env, corsHeaders: Record<string, string>) {
  const shelf: Shelf = await request.json();
  
  // Check if user is admin (only admins can create shelves)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to create shelves' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
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
    INSERT INTO shelves (name, location_id, created_at)
    VALUES (?, ?, datetime('now'))
  `);

  const result = await stmt.bind(shelf.name, locationId).run();

  return new Response(JSON.stringify({ 
    id: result.meta.last_row_id, 
    ...shelf, 
    location_id: locationId 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function updateShelf(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
  const shelf: Partial<Shelf> = await request.json();
  
  // Check if user is admin (only admins can update shelves)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to update shelves' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check if user has access to this shelf (through location ownership)
  const accessStmt = env.DB.prepare(`
    SELECT s.id FROM shelves s
    LEFT JOIN locations l ON s.location_id = l.id
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE s.id = ? AND (l.owner_id = ? OR lm.user_id = ?)
  `);

  const accessResult = await accessStmt.bind(id, userId, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stmt = env.DB.prepare(`
    UPDATE shelves 
    SET name = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  await stmt.bind(shelf.name, id).run();

  // Get the shelf's location_id for the response
  const shelfStmt = env.DB.prepare(`
    SELECT location_id FROM shelves WHERE id = ?
  `);
  const shelfResult = await shelfStmt.bind(id).first();

  // Return the updated shelf
  const updatedShelf = {
    id,
    name: shelf.name,
    location_id: (shelfResult as any)?.location_id,
    updated_at: new Date().toISOString()
  };

  return new Response(JSON.stringify(updatedShelf), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function deleteShelf(request: Request, userId: string, env: Env, corsHeaders: Record<string, string>, id: number) {
  // Check if user is admin (only admins can delete shelves)
  if (!(await isUserAdmin(userId, env))) {
    return new Response(JSON.stringify({ error: 'Admin privileges required to delete shelves' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Check if user has access to this shelf (through location ownership)
  const accessStmt = env.DB.prepare(`
    SELECT s.id, s.location_id FROM shelves s
    LEFT JOIN locations l ON s.location_id = l.id
    LEFT JOIN location_members lm ON l.id = lm.location_id
    WHERE s.id = ? AND (l.owner_id = ? OR lm.user_id = ?)
  `);

  const accessResult = await accessStmt.bind(id, userId, userId).first();
  
  if (!accessResult) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if there are books on this shelf
  const booksStmt = env.DB.prepare(`
    SELECT COUNT(*) as book_count FROM books WHERE shelf_id = ?
  `);
  const booksResult = await booksStmt.bind(id).first();
  const bookCount = (booksResult as any)?.book_count || 0;

  // Check how many shelves are in this location
  const shelfCountStmt = env.DB.prepare(`
    SELECT COUNT(*) as shelf_count FROM shelves WHERE location_id = ?
  `);
  const shelfCountResult = await shelfCountStmt.bind((accessResult as any).location_id).first();
  const totalShelves = (shelfCountResult as any)?.shelf_count || 0;

  // Get the request body to see if user provided a target shelf or wants to create one
  const body = await request.json() as { 
    targetShelfId?: number; 
    createNewShelf?: string; 
    confirmDeleteBooks?: boolean 
  };
  const { targetShelfId, createNewShelf, confirmDeleteBooks } = body;

  if (bookCount > 0) {

    // If this is the last shelf in the location
    if (totalShelves === 1) {
      if (createNewShelf) {
        // Create a new shelf to move books to
        const newShelfStmt = env.DB.prepare(`
          INSERT INTO shelves (name, location_id, created_at)
          VALUES (?, ?, datetime('now'))
        `);
        const newShelfResult = await newShelfStmt.bind(createNewShelf, (accessResult as any).location_id).run();
        const newShelfId = newShelfResult.meta.last_row_id;

        // Move books to the new shelf
        const moveStmt = env.DB.prepare(`
          UPDATE books SET shelf_id = ? WHERE shelf_id = ?
        `);
        await moveStmt.bind(newShelfId, id).run();
      } else if (confirmDeleteBooks) {
        // User confirmed they want to delete all books with the last shelf
        // Books will be deleted when we delete the shelf (no action needed here)
      } else {
        // Warn user about deleting the last shelf
        return new Response(JSON.stringify({ 
          error: 'This is the last shelf in the location. Deleting it will also delete all books in the location.',
          bookCount,
          isLastShelf: true,
          warningMessage: `Deleting this shelf will permanently delete ${bookCount} book(s) from the location. You can either create a new shelf to move the books to, or confirm deletion of all books.`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // There are other shelves in the location
      if (!targetShelfId) {
        // Get available shelves in the same location for the user to choose from
        const shelvesStmt = env.DB.prepare(`
          SELECT id, name FROM shelves 
          WHERE location_id = ? AND id != ?
          ORDER BY name
        `);
        const shelvesResult = await shelvesStmt.bind((accessResult as any).location_id, id).all();
        
        return new Response(JSON.stringify({ 
          error: 'Shelf contains books. Please select a target shelf to move them to.',
          bookCount,
          availableShelves: shelvesResult.results,
          isLastShelf: false
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Move books to target shelf
      const moveStmt = env.DB.prepare(`
        UPDATE books SET shelf_id = ? WHERE shelf_id = ?
      `);
      await moveStmt.bind(targetShelfId, id).run();
    }
  }

  // Delete the shelf (and books if it's the last shelf and user confirmed)
  if (totalShelves === 1 && bookCount > 0 && confirmDeleteBooks) {
    // Delete books first when deleting the last shelf
    await env.DB.prepare('DELETE FROM books WHERE shelf_id = ?').bind(id).run();
  }
  
  const deleteStmt = env.DB.prepare('DELETE FROM shelves WHERE id = ?');
  await deleteStmt.bind(id).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}