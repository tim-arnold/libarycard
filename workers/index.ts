import {
  Env,
  User,
} from './types';
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
  deleteBookRemovalRequest,
  rateBook,
  getBookRating
} from './books';
import {
  sendInvitationEmail,
  sendVerificationEmail,
  notifyAdminsOfSignupRequest,
  sendContactEmail
} from './email';
import {
  getSignupRequests,
  approveSignupRequest,
  denySignupRequest,
  cleanupUser,
  debugListUsers
} from './admin';
import {
  checkUserExists
} from './auth-utils';
import {
  createOrUpdateUser,
  registerUser,
  verifyCredentials,
  verifyEmail
} from './auth-core';
import {
  createLocationInvitation,
  acceptLocationInvitation,
  getLocationInvitations,
  getInvitationDetails,
  revokeLocationInvitation
} from './invitations';
import {
  getAdminAnalytics,
  getAdminUsers,
  updateUserRole,
  getAvailableAdmins
} from './admin-extended';
import {
  getUserProfile,
  updateUserProfile
} from './profile';
import {
  getUserFromRequest
} from './auth';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);  
    const path = url.pathname;
    
    console.log('🚀 Worker request:', request.method, path);
    console.log('🔍 Full URL:', request.url);
    console.log('📝 Headers:', Object.fromEntries(request.headers.entries()));


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


      // Contact form endpoint (public)
      if (path === '/api/contact' && request.method === 'POST') {
        return await sendContactEmail(request, env, corsHeaders);
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

      // Signup approval endpoints (admin only)
      if (path === '/api/signup-requests' && request.method === 'GET') {
        return await getSignupRequests(userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/signup-requests\/\d+\/approve$/) && request.method === 'POST') {
        const requestId = parseInt(path.split('/')[3]);
        return await approveSignupRequest(request, requestId, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/signup-requests\/\d+\/deny$/) && request.method === 'POST') {
        const requestId = parseInt(path.split('/')[3]);
        return await denySignupRequest(request, requestId, userId, env, corsHeaders);
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

      // Book rating endpoints
      if (path.match(/^\/api\/books\/\d+\/rate$/) && request.method === 'POST') {
        const bookId = parseInt(path.split('/')[3]);
        return await rateBook(request, bookId, userId, env, corsHeaders);
      }

      if (path.match(/^\/api\/books\/\d+\/ratings$/) && request.method === 'GET') {
        const bookId = parseInt(path.split('/')[3]);
        return await getBookRating(bookId, userId, env, corsHeaders);
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

      // Admin-only analytics endpoint
      if (path === '/api/admin/analytics' && request.method === 'GET') {
        return await getAdminAnalytics(userId, env, corsHeaders);
      }

      // Admin-only enhanced users endpoint
      if (path === '/api/admin/users' && request.method === 'GET') {
        return await getAdminUsers(userId, env, corsHeaders);
      }

      // Admin-only user role management endpoint
      if (path.match(/^\/api\/admin\/users\/[^\/]+\/role$/) && request.method === 'PUT') {
        const targetUserId = path.split('/')[4];
        return await updateUserRole(request, targetUserId, userId, env, corsHeaders);
      }

      // Admin-only endpoint to get available admin users for ownership transfer
      if (path === '/api/admin/available-admins' && request.method === 'GET') {
        return await getAvailableAdmins(userId, env, corsHeaders);
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


