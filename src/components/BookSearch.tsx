'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  CircularProgress,
} from '@mui/material'
import {
  Search,
  Add,
  CheckCircle,
} from '@mui/icons-material'
import type { EnhancedBook } from '@/lib/types'

interface GoogleBookItem {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    description?: string
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    publishedDate?: string
    categories?: string[]
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
  }
}

interface BookSearchProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onBookSelected: (item: GoogleBookItem) => void
  onError: (title: string, message: string) => void
  existingBooks: EnhancedBook[]
  justAddedBooks: Set<string>
  disabled?: boolean
}

export default function BookSearch({
  searchQuery,
  onSearchQueryChange,
  onBookSelected,
  onError,
  existingBooks,
  justAddedBooks,
  disabled = false,
}: BookSearchProps) {
  const [searchResults, setSearchResults] = useState<GoogleBookItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the search input field when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Auto-search when searchQuery is provided (e.g., from OCR results)
  useEffect(() => {
    if (searchQuery.trim() && searchResults.length === 0 && !isSearching) {
      searchGoogleBooks(searchQuery)
    }
  }, [searchQuery])

  const searchGoogleBooks = async (query: string) => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`
      )
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.items || [])
      } else {
        onError(
          'Search Error',
          'Failed to search books. Please try again.'
        )
      }
    } catch (error) {
      onError(
        'Search Error',
        'Failed to search books. Please check your internet connection and try again.'
      )
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!disabled) {
      searchGoogleBooks(searchQuery)
    }
  }

  const handleBookSelect = (item: GoogleBookItem) => {
    if (!disabled) {
      onBookSelected(item)
    }
  }

  // Duplicate detection helper functions
  const isBookDuplicate = (googleBookItem: GoogleBookItem): boolean => {
    const isbn = googleBookItem.volumeInfo.industryIdentifiers?.find(
      id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
    )?.identifier

    const title = googleBookItem.volumeInfo.title
    const authors = googleBookItem.volumeInfo.authors || []

    return existingBooks.some(existingBook => {
      // Check by ISBN if available
      if (isbn && existingBook.isbn === isbn) {
        return true
      }
      
      // Check by title and author combination
      const titleMatch = existingBook.title.toLowerCase() === title.toLowerCase()
      const authorMatch = authors.some(author => 
        existingBook.authors.some(existingAuthor => 
          existingAuthor.toLowerCase() === author.toLowerCase()
        )
      )
      
      return titleMatch && authorMatch
    })
  }

  const wasBookJustAdded = (googleBookItem: GoogleBookItem): boolean => {
    const isbn = googleBookItem.volumeInfo.industryIdentifiers?.find(
      id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
    )?.identifier
    const bookKey = isbn || googleBookItem.volumeInfo.title
    return justAddedBooks.has(bookKey)
  }

  return (
    <Box>
      {/* Search Form */}
      <Box component="form" onSubmit={handleSearchSubmit} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by title, author, or keywords..."
            variant="outlined"
            disabled={isSearching || disabled}
            inputRef={searchInputRef}
          />
          <Button 
            type="submit" 
            variant="contained"
            startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <Search />}
            disabled={isSearching || !searchQuery.trim() || disabled}
            sx={{ minWidth: 120 }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Box>
      </Box>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box data-testid="search-results-section">
          <Typography variant="h6" gutterBottom>
            Search Results ({searchResults.length})
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {searchResults.map((item) => (
              <Card key={item.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  {item.volumeInfo.imageLinks?.thumbnail && (
                    <CardMedia
                      component="img"
                      src={item.volumeInfo.imageLinks.thumbnail}
                      alt={item.volumeInfo.title}
                      sx={{ width: 80, height: 'auto', mx: 'auto', mb: 1 }}
                    />
                  )}
                  <Typography variant="h6" component="h3" gutterBottom>
                    {item.volumeInfo.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {item.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                  </Typography>
                  {item.volumeInfo.publishedDate && (
                    <Typography variant="caption" color="text.secondary">
                      Published: {item.volumeInfo.publishedDate}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  {wasBookJustAdded(item) ? (
                    <Button 
                      variant="outlined"
                      size="small"
                      startIcon={<CheckCircle />}
                      disabled
                      fullWidth
                      sx={{ 
                        color: 'success.main',
                        borderColor: 'success.main',
                        '&.Mui-disabled': {
                          color: 'success.main',
                          borderColor: 'success.main'
                        }
                      }}
                    >
                      Book Added!
                    </Button>
                  ) : isBookDuplicate(item) ? (
                    <Button 
                      variant="outlined"
                      size="small"
                      startIcon={<CheckCircle />}
                      disabled
                      fullWidth
                      sx={{ 
                        color: 'text.secondary',
                        borderColor: 'grey.400',
                        '&.Mui-disabled': {
                          color: 'text.secondary',
                          borderColor: 'grey.400'
                        }
                      }}
                    >
                      Already in Your Library
                    </Button>
                  ) : (
                    <Button 
                      variant="contained"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => handleBookSelect(item)}
                      disabled={disabled}
                      fullWidth
                    >
                      Add This Book
                    </Button>
                  )}
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}