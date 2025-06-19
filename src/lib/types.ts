export interface Book {
  id: string
  isbn: string
  title: string
  authors: string[]
  description?: string
  thumbnail?: string
  publishedDate?: string
  categories?: string[]
  shelf_id?: number
  tags?: string[]
  location_name?: string
  shelf_name?: string
  status?: string // 'available', 'checked_out'
  checked_out_by?: string
  checked_out_by_name?: string
  checked_out_date?: string
  due_date?: string
}

export interface EnhancedBook extends Book {
  enhancedGenres?: string[]
  series?: string
  seriesNumber?: string
  openLibraryKey?: string
  extendedDescription?: string
  subjects?: string[]
  publisherInfo?: string
  pageCount?: number
  // Rating system fields
  userRating?: number | null      // Current user's rating (1-5 stars)
  userReview?: string | null      // Current user's review text
  averageRating?: number | null   // Library-specific average rating
  ratingCount?: number            // Number of library-specific ratings
  googleAverageRating?: number | null  // Google Books average rating (for More Details)
  googleRatingCount?: number           // Google Books rating count (for More Details)
  ratingUpdatedAt?: string        // Last rating update timestamp
}

// Rating-specific interfaces
export interface BookRating {
  id: number
  bookId: number
  userId: string
  rating: number
  reviewText?: string | null
  userName?: string
  createdAt: string
  updatedAt: string
}

export interface RateBookRequest {
  rating: number // 1-5
  reviewText?: string
  bookId: number
  userId: string
}

export interface BookRatingsResponse {
  userRating: number | null
  userReview?: string | null
  averageRating: number | null
  ratingCount: number
  locationId: number
  allRatings?: BookRating[]  // For showing all reviews in More Details
}