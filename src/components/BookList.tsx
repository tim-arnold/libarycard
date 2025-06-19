'use client'

import {
  Box,
  List,
  ListItem,
  Typography,
  Chip,
  IconButton,
} from '@mui/material'
import { Info, Star } from '@mui/icons-material'
import type { EnhancedBook } from '@/lib/types'
import BookActions from './BookActions'
import StarRating from './StarRating'

interface BookTextProps {
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

export default function BookText({
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
}: BookTextProps) {
  return (
    <List sx={{ width: '100%', p: 0 }}>
      {books.map(book => (
        <ListItem
          key={book.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            mb: 0.5,
            p: 1,
            backgroundColor: 'background.paper',
            '&:hover': {
              backgroundColor: 'action.hover',
              borderColor: 'primary.main'
            },
            transition: 'all 0.2s ease-in-out',
            minHeight: 48
          }}
        >
          {/* Book Information - Single Line */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden'
          }}>
            {/* Title and Author */}
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 600,
                  display: 'inline',
                  mr: 1
                }}
                noWrap
              >
                {book.title}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  display: 'inline',
                  fontStyle: 'italic'
                }}
              >
                {book.authors.join(', ')}
                {book.publishedDate && `, ${new Date(book.publishedDate).getFullYear()}`}
              </Typography>
            </Box>

            {/* Compact info chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              {/* Star rating - compact chip variant */}
              <StarRating
                userRating={book.userRating}
                averageRating={book.averageRating}
                ratingCount={book.ratingCount}
                size="small"
                variant="chip"
                onClick={onRateBook ? () => onRateBook(book) : undefined}
              />
              
              {/* Rate this book button - ultra compact */}
              {!(book.userRating || book.averageRating) && onRateBook && (
                <IconButton
                  size="small"
                  onClick={() => onRateBook(book)}
                  sx={{ 
                    p: 0.5,
                    color: 'warning.main',
                    '&:hover': {
                      backgroundColor: 'warning.50'
                    }
                  }}
                  title="Rate this book"
                >
                  <Star sx={{ fontSize: '1rem' }} />
                </IconButton>
              )}
              
              {/* Checkout status */}
              {book.status === 'checked_out' && (
                <Chip 
                  label={book.checked_out_by === currentUserId ? 'Checked out by you' : `Checked out by ${book.checked_out_by_name || 'Unknown'}`}
                  size="small"
                  color="warning"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
              
              {/* Genre - only show for regular users */}
              {userRole !== 'admin' && (book.enhancedGenres?.[0] || book.categories?.[0]) && (
                <Chip 
                  label={book.enhancedGenres?.[0] || book.categories?.[0]} 
                  size="small" 
                  color={book.enhancedGenres ? 'primary' : 'default'}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
              
              {/* Shelf info */}
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                {book.shelf_name}
              </Typography>

              {/* More Details button */}
              {(book.extendedDescription || book.subjects || book.pageCount || book.averageRating || book.publisherInfo || book.openLibraryKey) && (
                <IconButton
                  size="small"
                  onClick={() => onMoreDetailsClick(book)}
                  sx={{ 
                    p: 0.5,
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.50'
                    }
                  }}
                  title="More Details"
                >
                  <Info sx={{ fontSize: '1rem' }} />
                </IconButton>
              )}

            </Box>
          </Box>

          {/* Action Controls - Compact */}
          <Box sx={{ ml: 2, flexShrink: 0 }}>
            <BookActions
              book={book}
              userRole={userRole}
              currentUserId={currentUserId}
              shelves={shelves}
              pendingRemovalRequests={pendingRemovalRequests}
              viewMode="list"
              onCheckout={onCheckout}
              onCheckin={onCheckin}
              onDelete={onDelete}
              onRelocate={onRelocate}
              onRequestRemoval={onRequestRemoval}
              onCancelRemovalRequest={onCancelRemovalRequest}
            />
          </Box>
        </ListItem>
      ))}
    </List>
  )
}