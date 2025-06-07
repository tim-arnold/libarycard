'use client'

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Search } from '@mui/icons-material'

interface BookFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  shelfFilter: string
  setShelfFilter: (shelf: string) => void
  categoryFilter: string
  setCategoryFilter: (category: string) => void
  locationFilter: string
  setLocationFilter: (location: string) => void
  userRole: string
  shelves: Array<{ id: number; name: string; location_id: number }>
  allLocations: Array<{ id: number; name: string }>
  allCategories: string[]
}

export default function BookFilters({
  searchTerm,
  setSearchTerm,
  shelfFilter,
  setShelfFilter,
  categoryFilter,
  setCategoryFilter,
  locationFilter,
  setLocationFilter,
  userRole,
  shelves,
  allLocations,
  allCategories,
}: BookFiltersProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }
          }}
        />
      </Box>
      
      {userRole === 'admin' && allLocations.length > 1 && (
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Location</InputLabel>
            <Select
              value={locationFilter}
              label="Location"
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              {allLocations.map(location => (
                <MenuItem key={location.id} value={location.name}>{location.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {userRole === 'admin' && shelves.length > 1 && (
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Shelf</InputLabel>
            <Select
              value={shelfFilter}
              label="Shelf"
              onChange={(e) => setShelfFilter(e.target.value)}
            >
              <MenuItem value="">All shelves</MenuItem>
              {(() => {
                const filteredShelves = locationFilter 
                  ? shelves.filter(shelf => {
                      const location = allLocations.find(loc => loc.id === shelf.location_id)
                      return location?.name === locationFilter
                    })
                  : shelves
                
                return filteredShelves.map(shelf => (
                  <MenuItem key={shelf.id} value={shelf.name}>{shelf.name}</MenuItem>
                ))
              })()}
            </Select>
          </FormControl>
        </Box>
      )}

      <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Genre</InputLabel>
          <Select
            value={categoryFilter}
            label="Genre"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">All genres</MenuItem>
            {allCategories.map(genre => (
              <MenuItem key={genre} value={genre}>{genre}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}