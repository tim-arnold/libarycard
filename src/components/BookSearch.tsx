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
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import {
  Search,
  Add,
  CheckCircle,
  Clear,
  Warning,
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
  shouldAutoSearch?: boolean
  onSearchComplete?: () => void
  displayedResults?: number
  onDisplayedResultsChange?: (count: number) => void
  lastAddedBookKey?: string | null
  cancelledBookKey?: string | null
  onCancelledBookScrollComplete?: () => void
  searchResults?: GoogleBookItem[]
  onSearchResultsChange?: (results: GoogleBookItem[]) => void
  totalResults?: number
  onTotalResultsChange?: (total: number) => void
}

export default function BookSearch({
  searchQuery,
  onSearchQueryChange,
  onBookSelected,
  onError,
  existingBooks,
  justAddedBooks,
  disabled = false,
  shouldAutoSearch = false,
  onSearchComplete,
  displayedResults: parentDisplayedResults,
  onDisplayedResultsChange,
  lastAddedBookKey,
  cancelledBookKey,
  onCancelledBookScrollComplete,
  searchResults: parentSearchResults,
  onSearchResultsChange,
  totalResults: parentTotalResults,
  onTotalResultsChange,
}: BookSearchProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [displayedResults, setDisplayedResults] = useState(parentDisplayedResults || 10)
  
  // Use parent state if provided, otherwise use local state
  const searchResults = parentSearchResults || []
  const totalResults = parentTotalResults || 0
  const [addAnywayDialog, setAddAnywayDialog] = useState<{
    isOpen: boolean
    book: GoogleBookItem | null
  }>({ isOpen: false, book: null })
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchFormRef = useRef<HTMLDivElement>(null)

  // Auto-focus the search input field when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Sync displayedResults with parent prop when it changes
  useEffect(() => {
    if (parentDisplayedResults !== undefined && parentDisplayedResults !== displayedResults) {
      setDisplayedResults(parentDisplayedResults)
    }
  }, [parentDisplayedResults])

  // Scroll to newly added book when it appears in search results
  useEffect(() => {
    if (lastAddedBookKey && searchResults.length > 0) {
      setTimeout(() => {
        const bookCards = document.querySelectorAll('[data-book-key]')
        Array.from(bookCards).forEach(card => {
          if (card.getAttribute('data-book-key') === lastAddedBookKey) {
            const elementTop = (card as HTMLElement).offsetTop - 20
            window.scrollTo({
              top: elementTop,
              behavior: 'smooth'
            })
          }
        })
      }, 300)
    }
  }, [lastAddedBookKey, searchResults])

  // Scroll to cancelled book when returning from book selection
  useEffect(() => {
    if (cancelledBookKey && searchResults.length > 0) {
      setTimeout(() => {
        const bookCards = document.querySelectorAll('[data-book-key]')
        Array.from(bookCards).forEach(card => {
          if (card.getAttribute('data-book-key') === cancelledBookKey) {
            const elementTop = (card as HTMLElement).offsetTop - 20
            window.scrollTo({
              top: elementTop,
              behavior: 'smooth'
            })
          }
        })
        // Clear the cancelled book key after scrolling
        onCancelledBookScrollComplete?.()
      }, 300)
    }
  }, [cancelledBookKey, searchResults, onCancelledBookScrollComplete])

  // Auto-search when searchQuery is provided from OCR results or after adding a book
  useEffect(() => {
    if (shouldAutoSearch && searchQuery.trim() && searchResults.length === 0 && !isSearching) {
      searchGoogleBooks(searchQuery)
    }
  }, [searchQuery, shouldAutoSearch])

  const searchGoogleBooks = async (query: string) => {
    if (!query.trim()) return

    setIsSearching(true)
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40`
      )
      
      if (response.ok) {
        const data = await response.json()
        onSearchResultsChange?.(data.items || [])
        onTotalResultsChange?.(data.totalItems || 0)
        
        // Only reset to 10 if parent doesn't have a specific displayedResults value
        if (parentDisplayedResults === undefined) {
          setDisplayedResults(10)
          onDisplayedResultsChange?.(10)
        }
        
        // Scroll to search field at top of viewport after results are loaded
        setTimeout(() => {
          if (searchFormRef.current) {
            const elementTop = searchFormRef.current.offsetTop - 20 // Small offset from top
            window.scrollTo({
              top: elementTop,
              behavior: 'smooth'
            })
          }
        }, 100)
        
        // Notify parent component that search is complete
        onSearchComplete?.()
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

  const handleClearSearch = () => {
    onSearchQueryChange('')
    onSearchResultsChange?.([])
    onTotalResultsChange?.(0)
    setDisplayedResults(10)
    onDisplayedResultsChange?.(10)
    searchInputRef.current?.focus()
  }

  const handleLoadMore = () => {
    const remainingResults = searchResults.length - displayedResults
    const nextBatch = Math.min(remainingResults, 10)
    const newDisplayedResults = displayedResults + nextBatch
    setDisplayedResults(newDisplayedResults)
    onDisplayedResultsChange?.(newDisplayedResults)
  }

  const handleAddAnyway = (book: GoogleBookItem) => {
    setAddAnywayDialog({ isOpen: true, book })
  }

  const confirmAddAnyway = () => {
    if (addAnywayDialog.book) {
      onBookSelected(addAnywayDialog.book)
      setAddAnywayDialog({ isOpen: false, book: null })
    }
  }

  const cancelAddAnyway = () => {
    setAddAnywayDialog({ isOpen: false, book: null })
  }

  // Enhanced duplicate detection helper functions
  const getBookDuplicateInfo = (googleBookItem: GoogleBookItem): { isExactDuplicate: boolean; isPotentialDuplicate: boolean } => {
    const isbn = googleBookItem.volumeInfo.industryIdentifiers?.find(
      id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
    )?.identifier

    const title = googleBookItem.volumeInfo.title
    const authors = googleBookItem.volumeInfo.authors || []
    const publishedDate = googleBookItem.volumeInfo.publishedDate

    let isExactDuplicate = false
    let isPotentialDuplicate = false


    existingBooks.forEach(existingBook => {
      // Primary check: exact ISBN match (definite duplicate)
      if (isbn && existingBook.isbn === isbn) {
        isExactDuplicate = true
        return
      }
      
      // Secondary check: exact title match (case-insensitive)
      const titleMatch = existingBook.title.toLowerCase().trim() === title.toLowerCase().trim()
      
      if (titleMatch) {
        // If titles match exactly, check authors
        const authorMatch = authors.length === 0 || existingBook.authors.length === 0 || 
          authors.some(author => 
            existingBook.authors.some(existingAuthor => 
              existingAuthor.toLowerCase().trim() === author.toLowerCase().trim()
            )
          )
        
        if (authorMatch) {
          // If we have ISBNs for both books but they're different, this is NOT a duplicate
          if (isbn && existingBook.isbn && isbn !== existingBook.isbn) {
            // Different ISBNs = different books, even with same title/author
            return
          }
          
          // If both title and author match, check publication date for additional validation
          if (publishedDate && existingBook.publishedDate) {
            const newBookYear = publishedDate.split('-')[0]
            const existingBookYear = existingBook.publishedDate.split('-')[0]
            
            if (newBookYear === existingBookYear) {
              isExactDuplicate = true
            } else {
              // Different years, but same title/author - potential duplicate (different edition)
              isPotentialDuplicate = true
            }
          } else {
            // No publication date info available for comparison
            // For identical title + author, assume exact duplicate unless we have conflicting evidence
            isExactDuplicate = true
          }
        }
      }
    })

    return { isExactDuplicate, isPotentialDuplicate }
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
      <Box component="form" onSubmit={handleSearchSubmit} sx={{ mb: 3 }} ref={searchFormRef}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search by title, author, or keywords..."
            variant="outlined"
            disabled={isSearching || disabled}
            inputRef={searchInputRef}
            InputProps={{
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleClearSearch}
                    disabled={isSearching || disabled}
                    size="small"
                    aria-label="Clear search"
                  >
                    <Clear />
                  </IconButton>
                </InputAdornment>
              )
            }}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Search Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min(displayedResults, searchResults.length)} of {totalResults > searchResults.length ? `${searchResults.length}+ (${totalResults} total found)` : searchResults.length} results
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {searchResults.slice(0, displayedResults).map((item) => {
              const isbn = item.volumeInfo.industryIdentifiers?.find(
                id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
              )?.identifier
              const bookKey = isbn || item.volumeInfo.title
              
              return (
              <Card key={item.id} data-book-key={bookKey} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                      Published: {new Date(item.volumeInfo.publishedDate).getFullYear()}
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
                  ) : (() => {
                    const { isExactDuplicate, isPotentialDuplicate } = getBookDuplicateInfo(item)
                    
                    if (isExactDuplicate) {
                      // Exact duplicate - only show "Already in Your Library"
                      return (
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
                      )
                    } else if (isPotentialDuplicate) {
                      // Potential duplicate - show both buttons
                      return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                          <Button 
                            variant="outlined"
                            size="small"
                            startIcon={<CheckCircle />}
                            disabled
                            fullWidth
                            sx={{ 
                              color: 'warning.main',
                              borderColor: 'warning.main',
                              '&.Mui-disabled': {
                                color: 'warning.main',
                                borderColor: 'warning.main'
                              }
                            }}
                          >
                            Similar Book in Library
                          </Button>
                          <Button 
                            variant="text"
                            size="small"
                            startIcon={<Warning />}
                            onClick={() => handleAddAnyway(item)}
                            disabled={disabled}
                            fullWidth
                            sx={{ 
                              color: 'warning.main',
                              fontSize: '0.75rem',
                              minHeight: '32px'
                            }}
                          >
                            Add Anyway
                          </Button>
                        </Box>
                      )
                    } else {
                      // Not a duplicate - normal add button
                      return (
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
                      )
                    }
                  })()}
                </CardActions>
              </Card>
              )
            })}
          </Box>
          
          {/* Load More Button */}
          {displayedResults < searchResults.length && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {Math.min(displayedResults, searchResults.length)} of {totalResults > searchResults.length ? `${searchResults.length}+ (${totalResults} total found)` : searchResults.length} results
              </Typography>
              <Button 
                variant="outlined"
                onClick={handleLoadMore}
                disabled={disabled}
                size="large"
                sx={{ minWidth: 200 }}
              >
                {(() => {
                  const remaining = searchResults.length - displayedResults
                  const toLoad = Math.min(remaining, 10)
                  return toLoad < 10 
                    ? `Load the last ${toLoad} book${toLoad === 1 ? '' : 's'}`
                    : `Load ${toLoad} more books`
                })()}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Add Anyway Confirmation Dialog */}
      <Dialog 
        open={addAnywayDialog.isOpen} 
        onClose={cancelAddAnyway}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          Potential Duplicate Book
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This book appears to be similar to one already in your library. Adding it may create duplicates.
          </Alert>
          
          {addAnywayDialog.book && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Book to Add:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {addAnywayDialog.book.volumeInfo.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                by {addAnywayDialog.book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
              </Typography>
              {addAnywayDialog.book.volumeInfo.publishedDate && (
                <Typography variant="body2" color="text.secondary">
                  Published: {new Date(addAnywayDialog.book.volumeInfo.publishedDate).getFullYear()}
                </Typography>
              )}
              
              <Typography variant="body2" sx={{ mt: 2 }}>
                Are you sure you want to add this book anyway? This might be a different edition or you may have accidentally deleted it earlier.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelAddAnyway}>
            Cancel
          </Button>
          <Button 
            onClick={confirmAddAnyway} 
            variant="contained" 
            color="warning"
            startIcon={<Add />}
          >
            Add Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}