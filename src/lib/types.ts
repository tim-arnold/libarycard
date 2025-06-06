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
  averageRating?: number
  ratingsCount?: number
}