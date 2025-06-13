'use client'

import { useEffect } from 'react'
import { setStorageItem } from '@/lib/storage'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material'

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

interface ShelfSelectorProps {
  shelves: Shelf[]
  locations: Location[]
  selectedShelfId: number | null
  onShelfChange: (shelfId: number | null) => void
  isLoading?: boolean
  disabled?: boolean
  size?: 'small' | 'medium'
  label?: string
  placeholder?: string
}

export default function ShelfSelector({
  shelves,
  locations,
  selectedShelfId,
  onShelfChange,
  isLoading = false,
  disabled = false,
  size = 'small',
  label = 'Shelf',
  placeholder = 'Select shelf...'
}: ShelfSelectorProps) {
  
  // Auto-select shelf if only one is available
  useEffect(() => {
    if (shelves.length === 1 && !selectedShelfId) {
      onShelfChange(shelves[0].id)
    }
  }, [shelves, selectedShelfId, onShelfChange])

  // Persist shelf selection to localStorage
  const handleShelfChange = (shelfId: number | null) => {
    onShelfChange(shelfId)
    if (shelfId) {
      setStorageItem('lastSelectedShelfId', shelfId.toString(), 'functional')
    }
  }

  // Don't render if no shelves are available
  if (shelves.length === 0) {
    return null
  }

  // Don't render for single shelf scenarios (auto-selected)
  if (shelves.length === 1) {
    return (
      <Box sx={{ mb: 2, display: 'none' }}>
        <Typography variant="caption" color="text.secondary">
          Adding to: {shelves[0].name}
          {locations.length > 1 && (
            <span> ({locations.find(loc => loc.id === shelves[0].location_id)?.name})</span>
          )}
        </Typography>
      </Box>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Loading shelves...
        </Typography>
      </Box>
    )
  }

  const renderShelfOptions = () => {
    if (locations.length === 1) {
      // Single location - simple list without grouping
      return shelves.map(shelf => (
        <MenuItem key={shelf.id} value={shelf.id}>
          {shelf.name}
        </MenuItem>
      ))
    } else {
      // Multiple locations - group by location
      return locations.map(location => {
        const locationShelves = shelves.filter(shelf => shelf.location_id === location.id)
        
        // Skip locations with no shelves
        if (locationShelves.length === 0) {
          return null
        }

        return [
          <MenuItem 
            key={`${location.id}-header`} 
            disabled 
            sx={{ 
              fontWeight: 'bold',
              backgroundColor: 'action.hover',
              '&.Mui-disabled': {
                opacity: 1,
                color: 'text.primary'
              }
            }}
          >
            📍 {location.name}
          </MenuItem>,
          ...locationShelves.map(shelf => (
            <MenuItem 
              key={shelf.id} 
              value={shelf.id} 
              sx={{ pl: 3 }}
            >
              📚 {shelf.name}
            </MenuItem>
          ))
        ]
      }).filter(Boolean).flat()
    }
  }

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl fullWidth size={size}>
        <InputLabel id="shelf-selector-label">{label}</InputLabel>
        <Select
          labelId="shelf-selector-label"
          value={selectedShelfId || ''}
          label={label}
          onChange={(e) => {
            const newShelfId = e.target.value ? parseInt(String(e.target.value)) : null
            handleShelfChange(newShelfId)
          }}
          disabled={disabled}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
              },
            },
          }}
        >
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
          {renderShelfOptions()}
        </Select>
      </FormControl>
      
      {/* Helper text showing current selection context */}
      {selectedShelfId && locations.length > 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {(() => {
            const selectedShelf = shelves.find(shelf => shelf.id === selectedShelfId)
            const selectedLocation = locations.find(loc => loc.id === selectedShelf?.location_id)
            return selectedLocation ? `📍 ${selectedLocation.name}` : ''
          })()}
        </Typography>
      )}
    </Box>
  )
}