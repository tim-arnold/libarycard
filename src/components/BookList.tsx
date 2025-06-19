'use client'

import {
  Box,
  List,
  ListItem,
  Typography,
  Chip,
} from '@mui/material'
import type { EnhancedBook } from '@/lib/types'
import BookActions from './BookActions'

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
                by {book.authors.join(', ')}
              </Typography>
            </Box>

            {/* Compact info chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
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

              {/* Publication year */}
              {book.publishedDate && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', md: 'block' }
                  }}
                >
                  {new Date(book.publishedDate).getFullYear()}
                </Typography>
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