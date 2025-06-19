'use client'

import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
} from '@mui/material'
import { Info } from '@mui/icons-material'
import type { EnhancedBook } from '@/lib/types'
import BookActions from './BookActions'

interface BookGridProps {
  books: EnhancedBook[]
  userRole: string | null
  currentUserId: string | null
  shelves: Array<{ id: number; name: string; location_id: number; created_at: string }>
  pendingRemovalRequests: Record<string, number>
  onCheckout: (bookId: string, bookTitle: string) => Promise<void>
  onCheckin: (bookId: string, bookTitle: string) => Promise<void>
  onDelete: (bookId: string, bookTitle: string) => Promise<void>
  onRelocate: (book: EnhancedBook) => void
  onRequestRemoval: (bookId: string, bookTitle: string) => Promise<void>
  onCancelRemovalRequest: (bookId: string, bookTitle: string) => Promise<void>
  onMoreDetailsClick: (book: EnhancedBook) => void
  onAuthorClick: (authorName: string) => void
  onSeriesClick: (seriesName: string) => void
}

export default function BookGrid({
  books,
  userRole,
  currentUserId,
  shelves,
  pendingRemovalRequests,
  onCheckout,
  onCheckin,
  onDelete,
  onRelocate,
  onRequestRemoval,
  onCancelRemovalRequest,
  onMoreDetailsClick,
  onAuthorClick,
  onSeriesClick,
}: BookGridProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
      {books.map(book => (
        <Card key={book.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {book.thumbnail ? (
                <Box
                  component="img"
                  src={book.thumbnail}
                  alt={book.title}
                  sx={{ 
                    width: 80, 
                    height: 120, 
                    objectFit: 'cover', 
                    flexShrink: 0,
                    borderRadius: 1
                  }}
                />
              ) : (
                <Box sx={{ 
                  width: 80, 
                  height: 120, 
                  borderRadius: 1, 
                  bgcolor: 'grey.300',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '2rem'
                }}>
                  📖
                </Box>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {book.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {book.authors.map((author, index) => (
                    <span key={index}>
                      <Typography 
                        component="span" 
                        sx={{ 
                          color: 'primary.main', 
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          '&:hover': { textDecoration: 'none' }
                        }}
                        onClick={() => onAuthorClick(author)}
                      >
                        {author}
                      </Typography>
                      {index < book.authors.length - 1 && ', '}
                    </span>
                  ))}
                  {book.publishedDate && (
                    <Typography component="span" color="text.secondary">
                      , {new Date(book.publishedDate).getFullYear()}
                    </Typography>
                  )}
                </Typography>
                {book.series && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Series:</strong> 
                    <Typography 
                      component="span" 
                      sx={{ 
                        color: 'primary.main', 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        ml: 0.5,
                        '&:hover': { textDecoration: 'none' }
                      }}
                      onClick={() => onSeriesClick(book.series!)}
                    >
                      {book.series}
                    </Typography>
                    {book.seriesNumber && ` (#${book.seriesNumber})`}
                  </Typography>
                )}
                {/* Genre - only show for regular users */}
                {userRole !== 'admin' && (book.enhancedGenres || book.categories) && (book.enhancedGenres?.[0] || book.categories?.[0]) && (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Chip 
                      label={book.enhancedGenres?.[0] || book.categories?.[0]} 
                      size="small" 
                      color={book.enhancedGenres ? 'primary' : 'default'}
                      sx={{ mr: 0.5, mb: 0.5 }} 
                    />
                  </Box>
                )}
                {book.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {book.description.substring(0, 200)}...
                  </Typography>
                )}
                {(book.extendedDescription || book.subjects || book.pageCount || book.averageRating || book.publisherInfo || book.openLibraryKey) && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Info />}
                      onClick={() => onMoreDetailsClick(book)}
                      sx={{ textTransform: 'none' }}
                    >
                      More Details
                    </Button>
                  </Box>
                )}
                
                {/* Show shelf info for all users */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Shelf:</strong> {book.shelf_name || 'No shelf assigned'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {book.tags && book.tags.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Tags:</strong> {book.tags.join(', ')}
                </Typography>
              </Box>
            )}
            
            {/* Checkout status display */}
            {book.status === 'checked_out' && (
              <Box sx={{ mt: 2, p: 1, border: 1, borderColor: 'warning.main', borderRadius: 1 }}>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  📖 Checked out by {book.checked_out_by === currentUserId ? 'you' : (book.checked_out_by_name || 'Unknown')}
                  {book.checked_out_date && (() => {
                    const checkoutDate = new Date(book.checked_out_date)
                    const today = new Date()
                    const diffTime = Math.abs(today.getTime() - checkoutDate.getTime())
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    return ` since ${checkoutDate.toLocaleDateString()} (${diffDays} day${diffDays !== 1 ? 's' : ''})`
                  })()}
                </Typography>
              </Box>
            )}
          </CardContent>

          <CardActions>
            <BookActions
              book={book}
              userRole={userRole}
              currentUserId={currentUserId}
              shelves={shelves}
              pendingRemovalRequests={pendingRemovalRequests}
              viewMode="card"
              onCheckout={onCheckout}
              onCheckin={onCheckin}
              onDelete={onDelete}
              onRelocate={onRelocate}
              onRequestRemoval={onRequestRemoval}
              onCancelRemovalRequest={onCancelRemovalRequest}
            />
          </CardActions>
        </Card>
      ))}
    </Box>
  )
}