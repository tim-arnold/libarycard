'use client'

import {
  Box,
  List,
  ListItem,
  Typography,
  Chip,
  Button,
} from '@mui/material'
import { Info, Star } from '@mui/icons-material'
import type { EnhancedBook } from '@/lib/types'
import BookActions from './BookActions'
import StarRating from './StarRating'

interface BookListProps {
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
  onRateBook?: (book: EnhancedBook) => void
}

export default function BookList({
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
  onRateBook,
}: BookListProps) {
  return (
    <List sx={{ width: '100%' }}>
      {books.map(book => (
        <ListItem
          key={book.id}
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            mb: 2,
            p: { xs: 1.5, sm: 2, md: 3 },
            backgroundColor: 'background.paper',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              borderColor: 'primary.main'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {/* Book Content Container - Image + Info */}
          <Box sx={{ 
            display: 'flex',
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: { xs: 2, sm: 3 },
            flex: 1,
            mb: { xs: 2, sm: 0 },
            width: { xs: '100%', sm: 'auto' }
          }}>
            {/* Book Image */}
            {book.thumbnail ? (
              <Box
                component="img"
                src={book.thumbnail}
                alt={book.title}
                sx={{ 
                  width: { xs: 60, sm: 70 }, 
                  height: { xs: 90, sm: 105 }, 
                  objectFit: 'cover',
                  borderRadius: 1,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  flexShrink: 0
                }}
              />
            ) : (
              <Box sx={{ 
                width: { xs: 60, sm: 70 }, 
                height: { xs: 90, sm: 105 }, 
                borderRadius: 1, 
                bgcolor: 'grey.300',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '1.5rem'
              }}>
                📖
              </Box>
            )}
            
            {/* Book Information Container */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Book Title */}
              <Typography 
                variant="h6" 
                component="h3" 
                sx={{ 
                  fontWeight: 600, 
                  mb: 1.5, 
                  fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                  lineHeight: 1.3,
                  wordBreak: 'break-word'
                }}
              >
                {book.title}
              </Typography>
              
              {/* Author */}
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom 
                sx={{ mb: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.9rem' } }}
              >
                {book.authors.map((author, index) => (
                  <span key={index}>
                    <Typography 
                      component="span" 
                      sx={{ 
                        color: 'primary.main', 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        '&:hover': { textDecoration: 'none', color: 'primary.dark' },
                        fontWeight: 500,
                        ml: 0.5
                      }}
                      onClick={() => onAuthorClick(author)}
                    >
                      {author}
                    </Typography>
                    {index < book.authors.length - 1 && ', '}
                  </span>
                ))}
                {book.publishedDate && (
                  <Typography component="span" sx={{ color: 'text.secondary' }}>
                    , {new Date(book.publishedDate).getFullYear()}
                  </Typography>
                )}
              </Typography>
              
              {/* Series info */}
              {book.series && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' } }}
                  >
                    <Typography component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      Series: 
                    </Typography>
                    <Typography 
                      component="span" 
                      sx={{ 
                        color: 'primary.main', 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        ml: 0.5,
                        '&:hover': { textDecoration: 'none', color: 'primary.dark' },
                        fontWeight: 500
                      }}
                      onClick={() => onSeriesClick(book.series!)}
                    >
                      {book.series}
                    </Typography>
                    {book.seriesNumber && (
                      <Typography component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
                        #{book.seriesNumber}
                      </Typography>
                    )}
                  </Typography>
                </Box>
              )}

              {/* Rating and Genre area - mini star chips alongside genre */}
              {(userRole !== 'admin' && (book.enhancedGenres || book.categories) && (book.enhancedGenres?.[0] || book.categories?.[0])) || (book.userRating || book.averageRating) || onRateBook ? (
                <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {/* Star rating - mini variant for compact space */}
                  <StarRating
                    userRating={book.userRating}
                    averageRating={book.averageRating}
                    ratingCount={book.ratingCount}
                    size="small"
                    variant="mini"
                    onClick={onRateBook ? () => onRateBook(book) : undefined}
                  />
                  
                  {/* Rate this book button - only show when no rating exists */}
                  {!(book.userRating || book.averageRating) && onRateBook && (
                    <Button
                      size="small"
                      startIcon={<Star />}
                      onClick={() => onRateBook(book)}
                      sx={{ 
                        textTransform: 'none',
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        color: 'warning.main',
                        minHeight: { xs: 20, sm: 24 },
                        '&:hover': {
                          backgroundColor: 'warning.50'
                        }
                      }}
                    >
                      Rate
                    </Button>
                  )}
                  
                  {/* Genre chip - only show for regular users */}
                  {userRole !== 'admin' && (book.enhancedGenres || book.categories) && (book.enhancedGenres?.[0] || book.categories?.[0]) && (
                    <Chip 
                      label={book.enhancedGenres?.[0] || book.categories?.[0]} 
                      size="small" 
                      color={book.enhancedGenres ? 'primary' : 'default'}
                      sx={{ 
                        fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8125rem' },
                        height: { xs: 20, sm: 24, md: 28 }
                      }} 
                    />
                  )}
                  
                  {/* More Details button moved to right of genre and rating */}
                  {(book.extendedDescription || book.subjects || book.pageCount || book.averageRating || book.publisherInfo || book.openLibraryKey) && (
                    <Button
                      size="small"
                      startIcon={<Info />}
                      onClick={() => onMoreDetailsClick(book)}
                      sx={{ 
                        textTransform: 'none',
                        fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.50'
                        }
                      }}
                    >
                      More Details
                    </Button>
                  )}
                </Box>
              ) : null}

              {/* More Details button for when no genre or rating is shown */}
              {(userRole === 'admin' || (!book.enhancedGenres?.[0] && !book.categories?.[0])) && !(book.userRating || book.averageRating) && (book.extendedDescription || book.subjects || book.pageCount || book.googleAverageRating || book.publisherInfo || book.openLibraryKey) && (
                <Box sx={{ mb: 1.5 }}>
                  <Button
                    size="small"
                    startIcon={<Info />}
                    onClick={() => onMoreDetailsClick(book)}
                    sx={{ 
                      textTransform: 'none',
                      fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.50'
                      }
                    }}
                  >
                    More Details
                  </Button>
                </Box>
              )}

              {/* Checkout status display */}
              {book.status === 'checked_out' && (
                <Box sx={{ 
                  mt: 1.5, 
                  p: { xs: 1, sm: 1.5 }, 
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'warning.main'
                }}>
                  <Typography 
                    variant="body2" 
                    color="text.primary"
                    sx={{ fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                  >
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

              
              {/* Show shelf info for all users */}
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
                  <strong>Shelf:</strong> {book.shelf_name || 'No shelf assigned'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Action Controls Container */}
          <BookActions
            book={book}
            userRole={userRole}
            currentUserId={currentUserId}
            shelves={shelves}
            pendingRemovalRequests={pendingRemovalRequests}
            viewMode="compact"
            onCheckout={onCheckout}
            onCheckin={onCheckin}
            onDelete={onDelete}
            onRelocate={onRelocate}
            onRequestRemoval={onRequestRemoval}
            onCancelRemovalRequest={onCancelRemovalRequest}
          />
        </ListItem>
      ))}
    </List>
  )
}