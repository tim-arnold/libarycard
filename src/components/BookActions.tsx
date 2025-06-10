'use client'

import { Box, Button } from '@mui/material'
import {
  Delete,
  ReportProblem,
  Cancel,
  CheckCircle,
  Undo,
  SwapHoriz,
} from '@mui/icons-material'
import type { EnhancedBook } from '@/lib/types'

export interface BookActionsProps {
  book: EnhancedBook
  userRole: string | null
  currentUserId: string | null
  shelves: Array<{ id: number; name: string; location_id: number; created_at: string }>
  pendingRemovalRequests: Record<string, number>
  viewMode: 'card' | 'list'
  onCheckout: (bookId: string, bookTitle: string) => Promise<void>
  onCheckin: (bookId: string, bookTitle: string) => Promise<void>
  onDelete: (bookId: string, bookTitle: string) => Promise<void>
  onRelocate: (book: EnhancedBook) => void
  onRequestRemoval: (bookId: string, bookTitle: string) => Promise<void>
  onCancelRemovalRequest: (bookId: string, bookTitle: string) => Promise<void>
}

export default function BookActions({
  book,
  userRole,
  currentUserId,
  shelves,
  pendingRemovalRequests,
  viewMode,
  onCheckout,
  onCheckin,
  onDelete,
  onRelocate,
  onRequestRemoval,
  onCancelRemovalRequest,
}: BookActionsProps) {
  const isCheckedOut = book.checked_out_by && book.checked_out_by !== ''
  const hasPendingRemovalRequest = pendingRemovalRequests[book.id]
  const hasMultipleShelves = shelves.length > 1
  
  // Only show return button if user checked out the book OR user is admin
  const canReturn = isCheckedOut && (userRole === 'admin' || book.checked_out_by === currentUserId)
  
  // Don't show relocate button if book is checked out
  const canRelocate = !isCheckedOut && hasMultipleShelves

  if (viewMode === 'list') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {userRole !== 'admin' && (
            <>
              {!isCheckedOut ? (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<CheckCircle />}
                  onClick={() => onCheckout(book.id, book.title)}
                >
                  Check Out
                </Button>
              ) : canReturn ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  startIcon={<Undo />}
                  onClick={() => onCheckin(book.id, book.title)}
                >
                  Return
                </Button>
              ) : null}
            </>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {userRole === 'admin' ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => onDelete(book.id, book.title)}
            >
              Remove
            </Button>
          ) : (
            <>
              {canRelocate && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SwapHoriz />}
                  onClick={() => onRelocate(book)}
                >
                  Relocate
                </Button>
              )}
              
              {!hasPendingRemovalRequest ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onRequestRemoval(book.id, book.title)}
                >
                  <ReportProblem />
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  onClick={() => onCancelRemovalRequest(book.id, book.title)}
                >
                  <Cancel />
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>
    )
  }

  // Card view
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {userRole === 'admin' ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => onDelete(book.id, book.title)}
          >
            Remove
          </Button>
        ) : (
          <>
            {!isCheckedOut ? (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<CheckCircle />}
                onClick={() => onCheckout(book.id, book.title)}
              >
                Check Out
              </Button>
            ) : canReturn ? (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<Undo />}
                onClick={() => onCheckin(book.id, book.title)}
              >
                Return
              </Button>
            ) : null}
            
            {canRelocate && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHoriz />}
                onClick={() => onRelocate(book)}
              >
                Relocate
              </Button>
            )}
          </>
        )}
      </Box>

      {userRole !== 'admin' && (
        <Box sx={{ ml: 1 }}>
          {!hasPendingRemovalRequest ? (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => onRequestRemoval(book.id, book.title)}
            >
              <ReportProblem />
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="info"
              onClick={() => onCancelRemovalRequest(book.id, book.title)}
            >
              <Cancel />
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}