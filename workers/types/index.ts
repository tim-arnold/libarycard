export interface Env {
  DB: D1Database;
  NEXTAUTH_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  FROM_EMAIL: string;
  APP_URL: string;
  ENVIRONMENT?: string;
  RESEND_API_KEY?: string;
  POSTMARK_API_TOKEN?: string;
  FRONTEND_URL?: string;
  GOOGLE_CLOUD_PROJECT_ID?: string;
  GOOGLE_APPLICATION_CREDENTIALS_JSON?: string;
  GOOGLE_API_KEY?: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  password_hash?: string;
  auth_provider?: string;
  email_verified?: boolean;
  email_verification_token?: string;
  email_verification_expires?: string;
  user_role?: string;
}

export interface Location {
  id?: number;
  name: string;
  description?: string;
  owner_id: string;
}

export interface Shelf {
  id?: number;
  name: string;
  location_id: number;
}

export interface Book {
  id?: number;
  isbn: string;
  title: string;
  authors: string | string[]; // Can be string or array
  description?: string;
  thumbnail?: string;
  published_date?: string;
  categories?: string | string[]; // Can be string or array
  shelf_id?: number;
  tags?: string | string[]; // Can be string or array
  added_by: string;
  status?: string; // 'available', 'checked_out'
  checked_out_by?: string;
  checked_out_date?: string;
  due_date?: string;
  // Enhanced book fields
  extended_description?: string;
  subjects?: string | string[]; // Can be string or array
  page_count?: number;
  average_rating?: number;
  ratings_count?: number;
  publisher_info?: string;
  open_library_key?: string;
  enhanced_genres?: string | string[]; // Can be string or array
  series?: string;
  series_number?: string;
}

export interface LocationInvitation {
  id?: number;
  location_id: number;
  invited_email: string;
  invitation_token: string;
  invited_by: string;
  expires_at: string;
  used_at?: string;
  created_at?: string;
}

export interface BookRemovalRequest {
  id?: number;
  book_id: number;
  requester_id: string;
  reason: string;
  reason_details?: string;
  status: string;
  reviewed_by?: string;
  review_comment?: string;
  created_at?: string;
  reviewed_at?: string;
}

export interface SignupApprovalRequest {
  id?: number;
  email: string;
  first_name: string;
  last_name?: string;
  password_hash: string;
  auth_provider: string;
  status: string; // 'pending', 'approved', 'denied'
  requested_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comment?: string;
  created_user_id?: string;
}

export const DEFAULT_SHELVES = [
  'my first shelf'
];