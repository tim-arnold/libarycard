'use client'

import { useState, useEffect } from 'react'
import {
  Fab,
  Badge,
  Tooltip,
  Popover,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Box,
  Divider,
} from '@mui/material'
import {
  Inventory2,
  Delete,
  Visibility,
} from '@mui/icons-material'
import { useBookSelection } from '@/contexts/BookSelectionContext'

interface SelectionIndicatorProps {
  onViewSelection?: () => void
}

export default function CartIndicator({ onViewSelection }: SelectionIndicatorProps) {
  const { actions } = useBookSelection()
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [shouldPulse, setShouldPulse] = useState(false)
  
  const selectionCount = actions.getSelectionCount()
  const selectedBooks = actions.getSelectedBooks()
  const isOpen = Boolean(anchorEl)

  // Trigger pulse animation when selection count increases
  useEffect(() => {
    if (selectionCount > 0) {
      setShouldPulse(true)
      const timer = setTimeout(() => setShouldPulse(false), 600) // Animation duration
      return () => clearTimeout(timer)
    }
  }, [selectionCount])

  // Don't render if no selections
  if (selectionCount === 0) {
    return null
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleRemoveBook = (key: string) => {
    actions.removeFromSelection(key)
  }

  const handleViewSelection = () => {
    handleClose()
    onViewSelection?.()
  }

  return (
    <>
      {/* Floating Selection Box Button */}
      <Tooltip title={`${selectionCount} book${selectionCount === 1 ? '' : 's'} selected`}>
        <Fab
          color="primary"
          size="medium"
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            transform: shouldPulse ? 'scale(2)' : 'scale(1)',
            transition: shouldPulse 
              ? 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
              : 'transform 0.3s ease-out',
          }}
        >
          <Badge badgeContent={selectionCount} color="secondary">
            <Inventory2 />
          </Badge>
        </Fab>
      </Tooltip>

      {/* Selection Preview Popover */}
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 }
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            📦 Selected Books ({selectionCount})
          </Typography>
          
          <List dense sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
            {selectedBooks.map((selectedBook) => (
              <ListItem key={selectedBook.key} divider>
                <ListItemText
                  primary={selectedBook.book.title}
                  secondary={`By ${selectedBook.book.authors.join(', ')}`}
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    noWrap: true
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
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
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Visibility />}
              onClick={handleViewSelection}
              fullWidth
            >
              Review and Add ({selectionCount})
            </Button>
          </Box>
        </Paper>
      </Popover>
    </>
  )
}