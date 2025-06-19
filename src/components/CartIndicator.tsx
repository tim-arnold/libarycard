'use client'

import { useState } from 'react'
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
  ShoppingCart,
  Delete,
  Visibility,
} from '@mui/icons-material'
import { useBookSelection } from '@/contexts/BookSelectionContext'

interface CartIndicatorProps {
  onViewCart?: () => void
}

export default function CartIndicator({ onViewCart }: CartIndicatorProps) {
  const { actions } = useBookSelection()
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  
  const selectionCount = actions.getSelectionCount()
  const selectedBooks = actions.getSelectedBooks()
  const isOpen = Boolean(anchorEl)

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

  const handleViewCart = () => {
    handleClose()
    onViewCart?.()
  }

  return (
    <>
      {/* Floating Cart Button */}
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
          }}
        >
          <Badge badgeContent={selectionCount} color="secondary">
            <ShoppingCart />
          </Badge>
        </Fab>
      </Tooltip>

      {/* Cart Preview Popover */}
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
            📚 Selected Books ({selectionCount})
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
                    aria-label="Remove from cart"
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
              onClick={handleViewCart}
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