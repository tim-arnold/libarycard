'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Box,
  Chip,
  TextField,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Delete,
  MenuBook,
  Save,
} from '@mui/icons-material'
import { useBookSelection } from '@/contexts/BookSelectionContext'
import ShelfSelector from './ShelfSelector'
import type { SelectedBook } from '@/contexts/BookSelectionContext'

interface Location {
  id: number
  name: string
  description?: string
  owner_id: string
  created_at: string
}

interface Shelf {
  id: number
  name: string
  location_id: number
  created_at: string
}

interface BulkReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onBulkSave: () => Promise<void>
  locations: Location[]
  shelves: Shelf[]
  selectedShelfId: number | null
  onShelfChange: (shelfId: number | null) => void
}

export default function BulkReviewModal({
  isOpen,
  onClose,
  onBulkSave,
  locations,
  shelves,
  selectedShelfId,
  onShelfChange,
}: BulkReviewModalProps) {
  const { actions } = useBookSelection()
  const [bulkTags, setBulkTags] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBooks = actions.getSelectedBooks()
  const selectionCount = actions.getSelectionCount()

  // Update bulk tags in context when changed
  useEffect(() => {
    actions.setBulkTags(bulkTags)
  }, [bulkTags, actions])

  // Update bulk shelf in context when changed
  useEffect(() => {
    actions.setBulkShelf(selectedShelfId)
  }, [selectedShelfId, actions])

  const handleRemoveBook = (key: string) => {
    actions.removeFromSelection(key)
  }

  const handleBulkSave = async () => {
    if (!selectedShelfId) {
      setError('Please select a shelf for all books')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onBulkSave()
      // Don't call onClose() here - let the parent handle closing after success
    } catch (error) {
      setError('Failed to save books. Please try again.')
      console.error('Bulk save error:', error)
      setIsLoading(false) // Only reset loading on error
    }
  }

  const handleClearAll = () => {
    actions.clearSelections()
    onClose()
  }

  const formatAuthors = (authors: string[]): string => {
    if (authors.length === 0) return 'Unknown Author'
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return authors.join(' & ')
    return `${authors[0]} & ${authors.length - 1} others`
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBook />
          <Typography variant="h6">
            Review Selected Books ({selectionCount})
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Books List */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Books
          </Typography>
          <List dense sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {selectedBooks.map((selectedBook: SelectedBook) => (
              <ListItem key={selectedBook.key} divider>
                <ListItemAvatar>
                  <Avatar 
                    src={selectedBook.book.thumbnail} 
                    variant="rounded"
                    sx={{ width: 40, height: 56 }}
                  >
                    <MenuBook />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={selectedBook.book.title}
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        By {formatAuthors(selectedBook.book.authors)}
                      </Typography>
                      {selectedBook.book.publishedDate && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          • {new Date(selectedBook.book.publishedDate).getFullYear()}
                        </Typography>
                      )}
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                          label={selectedBook.source === 'search' ? 'From Search' : 'From ISBN'} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>
                    </Box>
                  }
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    noWrap: true
                  }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleRemoveBook(selectedBook.key)}
                    aria-label="Remove from selection"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Bulk Settings */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Bulk Settings
          </Typography>
          
          {/* Shelf Selector */}
          <Box sx={{ mb: 2 }}>
            <ShelfSelector
              shelves={shelves}
              locations={locations}
              selectedShelfId={selectedShelfId}
              onShelfChange={onShelfChange}
              isLoading={false}
              label="Select shelf for all books"
            />
          </Box>

          {/* Tags Input */}
          <TextField
            fullWidth
            label="Tags (comma-separated)"
            value={bulkTags}
            onChange={(e) => setBulkTags(e.target.value)}
            placeholder="e.g., fiction, fantasy, to-read"
            variant="outlined"
            size="small"
            helperText="These tags will be applied to all selected books"
          />
        </Box>

        {/* Summary */}
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Summary:</strong> Save {selectionCount} book{selectionCount === 1 ? '' : 's'} 
            {selectedShelfId && shelves.find(s => s.id === selectedShelfId) && (
              <> to <strong>{shelves.find(s => s.id === selectedShelfId)?.name}</strong></>
            )}
            {bulkTags && <> with tags: <strong>{bulkTags}</strong></>}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClearAll} 
          color="error"
          disabled={isLoading}
        >
          Clear All
        </Button>
        <Button 
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleBulkSave}
          disabled={!selectedShelfId || selectionCount === 0 || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <Save />}
        >
          {isLoading ? 'Saving...' : `Save ${selectionCount} Books`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}