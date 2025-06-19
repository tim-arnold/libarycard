'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import { 
  GridView,
  ViewList,
  FormatListBulleted,
} from '@mui/icons-material'
import type { EnhancedBook } from '@/lib/types'
import { getBooks, updateBook, deleteBook as deleteBookAPI } from '@/lib/api'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import BookFilters, { SortField, SortDirection } from './BookFilters'
import BookGrid from './BookGrid'
import BookCompact from './BookCompact'
import BookList from './BookList'
import RemovalReasonModal from './RemovalReasonModal'
import { useModal } from '@/hooks/useModal'
import { CURATED_GENRES } from '@/lib/genreClassifier'
import { getStorageItem, setStorageItem } from '@/lib/storage'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'

interface Shelf {
  id: number
  name: string
  location_id: number
  created_at: string
}

interface Location {
  id: number
  name: string
  description?: string
  owner_id: string
  created_at: string
}

// More Details Modal Component
interface MoreDetailsModalProps {
  book: EnhancedBook
  isOpen: boolean
  onClose: () => void
}

function MoreDetailsModal({ book, isOpen, onClose }: MoreDetailsModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        📖 More Details: {book.title}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 1 }}>
          {/* ISBN Number */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              ISBN
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {book.isbn}
            </Typography>
          </Box>
          
          {/* Curated Genres (Enhanced) */}
          {book.enhancedGenres && book.enhancedGenres.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Curated Genres
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {book.enhancedGenres.map((genre, index) => (
                  <Chip 
                    key={index} 
                    label={genre} 
                    size="small" 
                    color="primary"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Google Books Categories (Raw) */}
          {book.categories && book.categories.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Google Books Categories
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {book.categories.map((category, index) => (
                  <Chip 
                    key={index} 
                    label={category} 
                    size="small" 
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* OpenLibrary Subjects */}
          {book.subjects && book.subjects.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                OpenLibrary Subjects
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {book.subjects.slice(0, 10).map((subject, index) => (
                  <Chip key={index} label={subject} size="small" variant="outlined" />
                ))}
                {book.subjects.length > 10 && (
                  <Chip label={`+${book.subjects.length - 10} more`} size="small" variant="outlined" />
                )}
              </Box>
            </Box>
          )}
          
          {/* Basic Description */}
          {book.description && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {book.description}
              </Typography>
            </Box>
          )}
          
          {book.extendedDescription && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Extended Description
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {book.extendedDescription}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            {book.publisherInfo && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Publisher
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {book.publisherInfo}
                </Typography>
              </Box>
            )}
            
            {book.pageCount && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Page Count
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {book.pageCount} pages
                </Typography>
              </Box>
            )}
            
            {book.averageRating && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Google Books Rating
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {book.averageRating}/5 ({book.ratingsCount || 0} ratings)
                </Typography>
              </Box>
            )}
            
            {book.openLibraryKey && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  OpenLibrary ID
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {book.openLibraryKey}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function BookLibrary() {
  const { data: session } = useSession()
  const { modalState, confirmAsync, alert, closeModal } = useModal()
  const [books, setBooks] = useState<EnhancedBook[]>([])
  const [filteredBooks, setFilteredBooks] = useState<EnhancedBook[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [shelfFilter, setShelfFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [pendingRemovalRequests, setPendingRemovalRequests] = useState<Record<string, number>>({})
  const [showMoreDetailsModal, setShowMoreDetailsModal] = useState(false)
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<EnhancedBook | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'compact' | 'list'>('card')
  const [currentPage, setCurrentPage] = useState(1)
  const [booksPerPage] = useState(10)
  const [showRelocateModal, setShowRelocateModal] = useState(false)
  const [selectedBookForRelocate, setSelectedBookForRelocate] = useState<EnhancedBook | null>(null)
  const [showRemovalReasonModal, setShowRemovalReasonModal] = useState(false)
  const [removalReasonCallback, setRemovalReasonCallback] = useState<((result: { value: string; label: string; details?: string } | null) => void) | null>(null)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadUserData()
    } else if (session === null) {
      // Session loading is complete but user is not logged in
      setIsLoading(false)
    }
  }, [session])

  // Load saved view mode from localStorage
  useEffect(() => {
    const savedViewMode = getStorageItem('library-view-mode', 'functional') as 'card' | 'compact' | 'list'
    if (savedViewMode && (savedViewMode === 'card' || savedViewMode === 'compact' || savedViewMode === 'list')) {
      setViewMode(savedViewMode)
    }
  }, [])

  const handleViewModeChange = (newViewMode: 'card' | 'compact' | 'list') => {
    setViewMode(newViewMode)
    setStorageItem('library-view-mode', newViewMode, 'functional')
  }

  const handleSortFieldChange = (newSortField: SortField) => {
    setSortField(newSortField)
  }

  const handleSortDirectionChange = (newSortDirection: SortDirection) => {
    setSortDirection(newSortDirection)
  }

  // Pagination functions (for admin view only now)
  const getPaginatedBooks = (books: EnhancedBook[]) => {
    const startIndex = (currentPage - 1) * booksPerPage
    const endIndex = startIndex + booksPerPage
    return books.slice(startIndex, endIndex)
  }

  const getTotalPages = (books: EnhancedBook[]) => {
    return Math.ceil(books.length / booksPerPage)
  }

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Memoized paginated books to prevent stale renders
  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * booksPerPage
    const endIndex = startIndex + booksPerPage
    return filteredBooks.slice(startIndex, endIndex)
  }, [filteredBooks, currentPage, booksPerPage])

  // Get paginated books for current view
  const getPaginatedBooksForView = () => {
    if (userRole === 'admin' && booksByLocation) {
      // For admin view, we need to handle pagination across grouped locations
      // We'll flatten all books, paginate them, then regroup
      const allBooks = booksByLocation.flatMap(location => location.books)
      const paginatedBooks = getPaginatedBooks(allBooks)
      
      // Regroup paginated books by location
      const locationMap = new Map()
      allLocations.forEach(location => {
        locationMap.set(location.id, {
          ...location,
          shelves: shelves.filter(shelf => shelf.location_id === location.id),
          books: []
        })
      })
      
      paginatedBooks.forEach(book => {
        const shelf = shelves.find(s => s.id === book.shelf_id)
        if (shelf) {
          const locationData = locationMap.get(shelf.location_id)
          if (locationData) {
            locationData.books.push(book)
          }
        }
      })
      
      return Array.from(locationMap.values()).filter(location => location.books.length > 0)
    } else {
      // For regular users, simple pagination
      return paginatedBooks
    }
  }

  const loadUserData = async () => {
    if (!session?.user?.email) return
    
    setIsLoading(true)
    
    // Load user role and ID first
    let currentUserRole = 'user'
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        currentUserRole = data.user_role || 'user'
        setUserRole(currentUserRole)
        setCurrentUserId(data.id || null)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      setUserRole('user')
      setCurrentUserId(null)
    }

    // Load books
    const savedBooks = await getBooks()
    setBooks(savedBooks)

    // Load locations and shelves
    try {
      const response = await fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const locations = await response.json()
        if (locations.length > 0) {
          if (currentUserRole === 'admin') {
            // Admin users: store all locations and load all shelves
            setAllLocations(locations)
            
            // Default to the first location (oldest one)
            setLocationFilter(locations[0].name)
            
            // Load shelves from all locations for admin users
            const allShelves: Shelf[] = []
            for (const location of locations) {
              const shelvesResponse = await fetch(`${API_BASE}/api/locations/${location.id}/shelves`, {
                headers: {
                  'Authorization': `Bearer ${session.user.email}`,
                  'Content-Type': 'application/json',
                },
              })
              if (shelvesResponse.ok) {
                const shelvesData = await shelvesResponse.json()
                allShelves.push(...shelvesData)
              }
            }
            setShelves(allShelves)
          } else {
            // Regular users: store first location and its shelves only
            setCurrentLocation(locations[0])
            
            const shelvesResponse = await fetch(`${API_BASE}/api/locations/${locations[0].id}/shelves`, {
              headers: {
                'Authorization': `Bearer ${session.user.email}`,
                'Content-Type': 'application/json',
              },
            })
            if (shelvesResponse.ok) {
              const shelvesData = await shelvesResponse.json()
              setShelves(shelvesData)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load locations and shelves:', error)
    }

    // Load pending removal requests for regular users
    if (currentUserRole !== 'admin') {
      await loadPendingRemovalRequests()
    }
    
    setIsLoading(false)
  }

  const loadPendingRemovalRequests = async () => {
    if (!session?.user?.email) return

    try {
      const response = await fetch(`${API_BASE}/api/book-removal-requests`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const requests = await response.json()
        // Create a map of book_id -> request_id for pending requests
        const pendingMap: Record<string, number> = {}
        requests.forEach((request: any) => {
          if (request.status === 'pending') {
            pendingMap[request.book_id.toString()] = request.id
          }
        })
        setPendingRemovalRequests(pendingMap)
      }
    } catch (error) {
      console.error('Failed to load pending removal requests:', error)
    }
  }

  const cancelRemovalRequest = async (bookId: string, bookTitle: string) => {
    if (!session?.user?.email) return

    const requestId = pendingRemovalRequests[bookId]
    if (!requestId) return

    const confirmed = await confirmAsync(
      {
        title: 'Cancel Removal Request',
        message: `Cancel your removal request for "${bookTitle}"?`,
        confirmText: 'Cancel Request',
        variant: 'warning'
      },
      async () => {
        try {
          const response = await fetch(`${API_BASE}/api/book-removal-requests/${requestId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.user.email}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch {
              try {
                const errorText = await response.text()
                errorMessage = errorText || errorMessage
              } catch {
                errorMessage = `Request failed with status ${response.status}`
              }
            }
            throw new Error(errorMessage)
          }

          const result = await response.json()
          
          // Remove from pending requests map
          const updatedPendingRequests = { ...pendingRemovalRequests }
          delete updatedPendingRequests[bookId]
          setPendingRemovalRequests(updatedPendingRequests)
          
          await alert({
            title: 'Request Cancelled',
            message: `Your removal request for "${bookTitle}" has been cancelled.`,
            variant: 'success'
          })
        } catch (error) {
          console.error('Error cancelling removal request:', error)
          await alert({
            title: 'Cancel Failed',
            message: error instanceof Error ? error.message : 'Failed to cancel removal request. Please try again.',
            variant: 'error'
          })
        }
      }
    )

    if (!confirmed) {
      return
    }
  }

  // Helper function for dropdown generation - only check enhanced genres and categories
  const bookHasGenreForDropdown = (book: EnhancedBook, curatedGenre: string): boolean => {
    // Check enhanced genres first (these are already curated) - use case-insensitive matching
    if (book.enhancedGenres) {
      const curatedLower = curatedGenre.toLowerCase()
      const hasMatch = book.enhancedGenres.some(genre => genre.toLowerCase() === curatedLower)
      if (hasMatch) {
        return true
      }
    }
    
    // For raw categories only, use flexible matching for compound genres
    const rawGenres = book.categories || []
    return rawGenres.some(rawGenre => {
      const rawLower = rawGenre.toLowerCase()
      const curatedLower = curatedGenre.toLowerCase()
      
      // Handle special compound genres FIRST to prevent incorrect matches
      if (curatedGenre === 'Historical Fiction') {
        // Only match explicit historical fiction references, never horror/fantasy/sci-fi
        if (rawLower.includes('horror') || rawLower.includes('fantasy') || rawLower.includes('science fiction')) {
          return false
        }
        return rawLower.includes('historical fiction') || 
               (rawLower.includes('fiction') && rawLower.includes('historical'))
      }
      
      if (curatedGenre === 'Literary Fiction') {
        // Only match explicit literary fiction references, never horror/fantasy/sci-fi
        if (rawLower.includes('horror') || rawLower.includes('fantasy') || rawLower.includes('science fiction')) {
          return false
        }
        return rawLower.includes('literary fiction') ||
               (rawLower.includes('fiction') && rawLower.includes('literary'))
      }
      
      if (curatedGenre === 'Young Adult') {
        return rawLower.includes('young adult') || rawLower.includes('juvenile') || 
               (rawLower.includes('young') && rawLower.includes('adult'))
      }
      
      // Direct substring matching for single-word genres
      if (rawLower.includes(curatedLower) || curatedLower.includes(rawLower)) {
        return true
      }
      
      // Word-based matching for partial matches (e.g., "Horror" matches "American horror tales")
      const rawWords = rawLower.split(/\s+|[,&-]+/).filter(word => word.length > 0)
      const curatedWords = curatedLower.split(/\s+/).filter(word => word.length > 0)
      
      // Check if all words from the curated genre appear in the raw genre
      const allWordsMatch = curatedWords.every(curatedWord => 
        rawWords.some(rawWord => rawWord.includes(curatedWord) || curatedWord.includes(rawWord))
      )
      
      return allWordsMatch
    })
  }

  // Helper function to check if a book matches a curated genre filter - includes subjects for comprehensive filtering
  const bookMatchesGenreFilter = (book: EnhancedBook, curatedGenre: string): boolean => {
    // Check enhanced genres first (these are already curated) - use case-insensitive matching
    if (book.enhancedGenres) {
      const curatedLower = curatedGenre.toLowerCase()
      const hasMatch = book.enhancedGenres.some(genre => genre.toLowerCase() === curatedLower)
      if (hasMatch) {
        return true
      }
    }
    
    // For raw categories and subjects, use flexible matching for compound genres
    const rawGenres = [...(book.categories || []), ...(book.subjects || [])]
    return rawGenres.some(rawGenre => {
      const rawLower = rawGenre.toLowerCase()
      const curatedLower = curatedGenre.toLowerCase()
      
      // Handle special compound genres FIRST to prevent incorrect matches
      if (curatedGenre === 'Historical Fiction') {
        // Only match explicit historical fiction references, never horror/fantasy/sci-fi
        if (rawLower.includes('horror') || rawLower.includes('fantasy') || rawLower.includes('science fiction')) {
          return false
        }
        return rawLower.includes('historical fiction') || 
               (rawLower.includes('fiction') && rawLower.includes('historical'))
      }
      
      if (curatedGenre === 'Literary Fiction') {
        // Only match explicit literary fiction references, never horror/fantasy/sci-fi
        if (rawLower.includes('horror') || rawLower.includes('fantasy') || rawLower.includes('science fiction')) {
          return false
        }
        return rawLower.includes('literary fiction') ||
               (rawLower.includes('fiction') && rawLower.includes('literary'))
      }
      
      if (curatedGenre === 'Young Adult') {
        return rawLower.includes('young adult') || rawLower.includes('juvenile') || 
               (rawLower.includes('young') && rawLower.includes('adult'))
      }
      
      // Direct substring matching for single-word genres
      if (rawLower.includes(curatedLower) || curatedLower.includes(rawLower)) {
        return true
      }
      
      // Word-based matching for partial matches (e.g., "Horror" matches "American horror tales")
      const rawWords = rawLower.split(/\s+|[,&-]+/).filter(word => word.length > 0)
      const curatedWords = curatedLower.split(/\s+/).filter(word => word.length > 0)
      
      // Check if all words from the curated genre appear in the raw genre
      const allWordsMatch = curatedWords.every(curatedWord => 
        rawWords.some(rawWord => rawWord.includes(curatedWord) || curatedWord.includes(rawWord))
      )
      
      return allWordsMatch
    })
  }

  useEffect(() => {
    let filtered = books

    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.authors.some(author => 
          author.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        book.isbn.includes(searchTerm)
      )
    }

    if (shelfFilter) {
      filtered = filtered.filter(book => book.shelf_name === shelfFilter)
    }

    if (categoryFilter) {
      filtered = filtered.filter(book => bookMatchesGenreFilter(book, categoryFilter))
    }

    // Admin location filter
    if (userRole === 'admin' && locationFilter) {
      filtered = filtered.filter(book => {
        const shelf = shelves.find(s => s.id === book.shelf_id)
        if (!shelf) return false
        const location = allLocations.find(l => l.id === shelf.location_id)
        return location?.name === locationFilter
      })
    }

    // Apply sorting (create new array to ensure React detects the change)
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'title':
          // Remove articles (a, an, the) for better alphabetical sorting
          const titleA = a.title.replace(/^(the|a|an)\s+/i, '').trim()
          const titleB = b.title.replace(/^(the|a|an)\s+/i, '').trim()
          comparison = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' })
          break
        case 'author':
          // Sort by last name when possible (look for comma, otherwise use last word)
          const getAuthorSortKey = (authors: string[]) => {
            if (authors.length === 0) return 'zzz' // Put books without authors at the end
            const firstAuthor = authors[0]
            // If author is in "Last, First" format, use that directly
            if (firstAuthor.includes(',')) {
              return firstAuthor.toLowerCase()
            }
            // Otherwise, try to extract last name
            const words = firstAuthor.trim().split(/\s+/)
            const lastName = words[words.length - 1]
            return lastName.toLowerCase()
          }
          const authorA = getAuthorSortKey(a.authors)
          const authorB = getAuthorSortKey(b.authors)
          comparison = authorA.localeCompare(authorB, undefined, { numeric: true, sensitivity: 'base' })
          break
        case 'publishedDate':
          // Handle missing publication dates by treating them as very old dates for ascending, very new for descending
          const getDateValue = (dateStr?: string) => {
            if (!dateStr) return sortDirection === 'asc' ? -Infinity : Infinity
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? (sortDirection === 'asc' ? -Infinity : Infinity) : date.getTime()
          }
          const dateA = getDateValue(a.publishedDate)
          const dateB = getDateValue(b.publishedDate)
          comparison = dateA - dateB
          break
        case 'dateAdded':
          // For now, use the book ID as a proxy for date added (since newer books typically have higher IDs)
          // In a future enhancement, we could add an actual dateAdded field to the database
          const idA = parseInt(a.id) || 0
          const idB = parseInt(b.id) || 0
          comparison = idA - idB
          break
        default:
          comparison = 0
      }
      
      return sortDirection === 'desc' ? -comparison : comparison
    })

    setFilteredBooks(filtered)
    // Reset to first page when filters or sorting change
    setCurrentPage(1)
  }, [books, searchTerm, shelfFilter, categoryFilter, locationFilter, userRole, shelves, allLocations, sortField, sortDirection])

  const deleteBook = async (bookId: string, bookTitle: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Remove Book',
        message: `Are you sure you want to remove "${bookTitle}" from your library? This action cannot be undone.`,
        confirmText: 'Remove Book',
        variant: 'danger'
      },
      async () => {
        const success = await deleteBookAPI(bookId)
        if (success) {
          const updatedBooks = books.filter(book => book.id !== bookId)
          setBooks(updatedBooks)
          await alert({
            title: 'Book Removed',
            message: `"${bookTitle}" has been successfully removed from your library.`,
            variant: 'success'
          })
        } else {
          throw new Error('Failed to remove book')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Remove Failed',
        message: 'Failed to remove the book. Please try again.',
        variant: 'error'
      })
    }
  }

  const handleAuthorClick = (authorName: string) => {
    alert({
      title: 'Author Search',
      message: `This feature will search your library for other books by ${authorName}. Feature coming soon!`,
      variant: 'info'
    })
  }

  const handleSeriesClick = (seriesName: string) => {
    alert({
      title: 'Series Search', 
      message: `This feature will search your library for other books in the ${seriesName} series. Feature coming soon!`,
      variant: 'info'
    })
  }

  const handleMoreDetailsClick = (book: EnhancedBook) => {
    setSelectedBookForDetails(book)
    setShowMoreDetailsModal(true)
  }

  const requestBookRemoval = async (bookId: string, bookTitle: string) => {
    if (!session?.user?.email) return

    // First, ask user to select a reason
    const reason = await selectRemovalReason()
    if (!reason) return // User cancelled reason selection

    const confirmed = await confirmAsync(
      {
        title: 'Request Book Removal',
        message: `Submit a request to remove "${bookTitle}" from the library?\n\nReason: ${reason.label}${reason.details ? `\nDetails: ${reason.details}` : ''}\n\nAn administrator will review your request.`,
        confirmText: 'Submit Request',
        variant: 'warning'
      },
      async () => {
        try {
          const response = await fetch(`${API_BASE}/api/book-removal-requests`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.user.email}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              book_id: parseInt(bookId),
              reason: reason.value,
              reason_details: reason.details || null
            })
          })

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch {
              // If JSON parsing fails, use the response text
              try {
                const errorText = await response.text()
                errorMessage = errorText || errorMessage
              } catch {
                // Fallback to status message
                errorMessage = `Request failed with status ${response.status}`
              }
            }
            throw new Error(errorMessage)
          }

          const result = await response.json()
          
          // Refresh pending removal requests after successful submission
          await loadPendingRemovalRequests()
          
          await alert({
            title: 'Removal Request Submitted',
            message: `Your request to remove "${bookTitle}" has been submitted to the administrator for review. Request ID: ${result.id}`,
            variant: 'success'
          })
        } catch (error) {
          console.error('Error submitting removal request:', error)
          await alert({
            title: 'Request Failed',
            message: error instanceof Error ? error.message : 'Failed to submit removal request. Please try again.',
            variant: 'error'
          })
        }
      }
    )

    if (!confirmed) {
      // User cancelled confirmation - no need to show additional alert
      return
    }
  }

  const selectRemovalReason = async (): Promise<{ value: string; label: string; details?: string } | null> => {
    return new Promise((resolve) => {
      setRemovalReasonCallback(() => resolve)
      setShowRemovalReasonModal(true)
    })
  }

  const handleRemovalReasonModalClose = (result: { value: string; label: string; details?: string } | null) => {
    setShowRemovalReasonModal(false)
    if (removalReasonCallback) {
      removalReasonCallback(result)
      setRemovalReasonCallback(null)
    }
  }

  const updateBookShelf = async (bookId: string, newShelfId: number) => {
    const success = await updateBook(bookId, { shelf_id: newShelfId })
    if (success) {
      const shelfName = shelves.find(s => s.id === newShelfId)?.name || ''
      const updatedBooks = books.map(book =>
        book.id === bookId ? { ...book, shelf_id: newShelfId, shelf_name: shelfName } : book
      )
      setBooks(updatedBooks)
    }
  }

  const openRelocateModal = (book: EnhancedBook) => {
    setSelectedBookForRelocate(book)
    setShowRelocateModal(true)
  }

  const handleRelocateBook = async (newShelfId: number) => {
    if (!selectedBookForRelocate) return

    const success = await updateBook(selectedBookForRelocate.id, { shelf_id: newShelfId })
    if (success) {
      const shelfName = shelves.find(s => s.id === newShelfId)?.name || ''
      const updatedBooks = books.map(book =>
        book.id === selectedBookForRelocate.id 
          ? { ...book, shelf_id: newShelfId, shelf_name: shelfName } 
          : book
      )
      setBooks(updatedBooks)
      setShowRelocateModal(false)
      setSelectedBookForRelocate(null)
      
      await alert({
        title: 'Book Relocated',
        message: `"${selectedBookForRelocate.title}" has been moved to ${shelfName}.`,
        variant: 'success'
      })
    } else {
      await alert({
        title: 'Relocation Failed',
        message: 'Failed to relocate book. Please try again.',
        variant: 'error'
      })
    }
  }

  const checkoutBook = async (bookId: string, bookTitle: string) => {
    if (!session?.user?.email) return

    const confirmed = await confirmAsync(
      {
        title: 'Check Out Book',
        message: `Check out "${bookTitle}"? You'll be marked as the current reader.`,
        confirmText: 'Check Out',
        variant: 'primary'
      },
      async () => {
        try {
          const response = await fetch(`/api/books/${bookId}?action=checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch {
              try {
                const errorText = await response.text()
                errorMessage = errorText || errorMessage
              } catch {
                errorMessage = `Request failed with status ${response.status}`
              }
            }
            throw new Error(errorMessage)
          }

          const result = await response.json()
          
          // Update local state
          const updatedBooks = books.map(book => 
            book.id === bookId 
              ? { 
                  ...book, 
                  status: 'checked_out',
                  checked_out_by: result.checked_out_by,
                  checked_out_by_name: result.checked_out_by_name,
                  checked_out_date: result.checked_out_date
                }
              : book
          )
          setBooks(updatedBooks)
          
          await alert({
            title: 'Book Checked Out',
            message: `"${bookTitle}" has been checked out to you.`,
            variant: 'success'
          })
        } catch (error) {
          console.error('Error checking out book:', error)
          await alert({
            title: 'Checkout Failed',
            message: error instanceof Error ? error.message : 'Failed to check out book. Please try again.',
            variant: 'error'
          })
        }
      }
    )

    if (!confirmed) {
      return
    }
  }

  const checkinBook = async (bookId: string, bookTitle: string) => {
    if (!session?.user?.email) return

    const confirmed = await confirmAsync(
      {
        title: 'Return Book',
        message: `Return "${bookTitle}"? This will mark the book as available.`,
        confirmText: 'Return Book',
        variant: 'primary'
      },
      async () => {
        try {
          const response = await fetch(`/api/books/${bookId}?action=checkin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch {
              try {
                const errorText = await response.text()
                errorMessage = errorText || errorMessage
              } catch {
                errorMessage = `Request failed with status ${response.status}`
              }
            }
            throw new Error(errorMessage)
          }

          const result = await response.json()
          
          // Update local state
          const updatedBooks = books.map(book => 
            book.id === bookId 
              ? { 
                  ...book, 
                  status: 'available',
                  checked_out_by: undefined,
                  checked_out_by_name: undefined,
                  checked_out_date: undefined
                }
              : book
          )
          setBooks(updatedBooks)
          
          await alert({
            title: 'Book Returned',
            message: `"${bookTitle}" has been returned and is now available.`,
            variant: 'success'
          })
        } catch (error) {
          console.error('Error returning book:', error)
          await alert({
            title: 'Return Failed',
            message: error instanceof Error ? error.message : 'Failed to return book. Please try again.',
            variant: 'error'
          })
        }
      }
    )

    if (!confirmed) {
      return
    }
  }



  // Use curated genres that actually have books mapped to them in the user's library (categories only for dropdown)
  const allCategories = CURATED_GENRES.filter(curatedGenre => {
    return books.some(book => bookHasGenreForDropdown(book, curatedGenre))
  }).sort()

  const booksByShelf = shelves.reduce((acc: Record<string, number>, shelf) => {
    acc[shelf.name] = books.filter(book => book.shelf_name === shelf.name).length
    return acc
  }, {})

  const handleShelfTileClick = (shelfName: string) => {
    setShelfFilter(shelfFilter === shelfName ? '' : shelfName)
  }

  // Generate title based on user role and current filters
  const getLibraryTitle = () => {
    if (userRole === 'admin') {
      return `📚 ${locationFilter} (${filteredBooks.length} books)`
    }
    
    if (!currentLocation) {
      return `📖 My Library (${books.length} books)`
    }
    
    if (shelves.length <= 1) {
      // Single shelf - show location and shelf name
      const shelfName = shelves[0]?.name || 'Main Library'
      return `📖 ${currentLocation.name}: ${shelfName} (${books.length} books)`
    }
    
    // Multiple shelves - show current filter or "All Shelves"
    if (shelfFilter) {
      return `📖 ${currentLocation.name}: ${shelfFilter} (${filteredBooks.length} books)`
    } else {
      return `📖 ${currentLocation.name}: All Shelves (${books.length} books)`
    }
  }

  // Group books by location for admin users
  const getBooksByLocation = () => {
    if (userRole !== 'admin') {
      return null // Regular users don't need location grouping
    }

    // Create a map of location_id -> location info
    const locationMap = new Map()
    allLocations.forEach(location => {
      locationMap.set(location.id, {
        ...location,
        shelves: shelves.filter(shelf => shelf.location_id === location.id),
        books: []
      })
    })

    // Group filtered books by their location
    filteredBooks.forEach(book => {
      const shelf = shelves.find(s => s.id === book.shelf_id)
      if (shelf) {
        const locationData = locationMap.get(shelf.location_id)
        if (locationData) {
          locationData.books.push(book)
        }
      }
    })

    return Array.from(locationMap.values()).filter(location => location.books.length > 0)
  }

  const booksByLocation = getBooksByLocation()

  // Show loading screen while data is being fetched
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              📚 Loading Your Library
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
              Please wait while we fetch your books, shelves, and settings...
            </Typography>
          </Box>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h2">
            {getLibraryTitle()}
          </Typography>
        </Box>


        {/* Contextual help text based on user role and library state */}
        {books.length === 0 ? (
          <Alert 
            severity="info" 
            icon={<Typography sx={{ fontSize: '1.5rem' }}>📚</Typography>}
            sx={{ mb: 3, textAlign: 'center' }}
          >
            <Typography variant="h6" gutterBottom>
              Welcome to Your Library!
            </Typography>
            <Typography variant="body2">
              Your library is empty. Head over to the <strong>ISBN Scanner</strong> to add your first book!
            </Typography>
          </Alert>
        ) : (
          <Alert 
            severity="info" 
            variant="outlined"
            sx={{ mb: 3 }}
          >
            {shelves.length <= 1 ? (
              <Typography variant="body2">
                📖 <strong>Your Library:</strong> Use search and category filters to find what you're looking for.{userRole !== 'admin' && ' Click "Request Removal" to submit requests to an administrator.'}
              </Typography>
            ) : userRole === 'admin' ? (
              <Typography variant="body2">
                🔧 <strong>Admin View:</strong> {books.length} books across {allLocations.length} location{allLocations.length !== 1 ? 's' : ''} and {shelves.length} shelves.
              </Typography>
            ) : (
              <Typography variant="body2">
                📚 <strong>Your Collection:</strong> Browse your {books.length} books across {shelves.length} shelves. Click shelf tiles to filter, or use the search bar to find specific titles. Click "Request Removal" to submit requests to an administrator.
              </Typography>
            )}
          </Alert>
        )}

      {/* Shelf tiles for regular users, hidden for admin */}
        {userRole !== 'admin' && shelves.length > 1 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📚 My Shelves
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, mt: 1 }}>
              {/* All Shelves tile */}
              <Button
                variant={!shelfFilter ? 'contained' : 'outlined'}
                onClick={() => setShelfFilter('')}
                sx={{ 
                  p: 1,
                  textAlign: 'center',
                  flexDirection: 'column',
                  height: 'auto',
                  minHeight: '60px'
                }}
              >
                <Typography variant="h6" component="div">
                  {books.length}
                </Typography>
                <Typography variant="caption">
                  All Shelves
                </Typography>
              </Button>
              
              {/* Individual shelf tiles */}
              {shelves.map(shelf => (
                <Button
                  key={shelf.id}
                  variant={shelfFilter === shelf.name ? 'contained' : 'outlined'}
                  onClick={() => handleShelfTileClick(shelf.name)}
                  sx={{ 
                    p: 1,
                    textAlign: 'center',
                    flexDirection: 'column',
                    height: 'auto',
                    minHeight: '60px'
                  }}
                >
                  <Typography variant="h6" component="div">
                    {booksByShelf[shelf.name] || 0}
                  </Typography>
                  <Typography variant="caption">
                    {shelf.name}
                  </Typography>
                </Button>
              ))}
            </Box>
          </Box>
        )}

        <BookFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          shelfFilter={shelfFilter}
          setShelfFilter={setShelfFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          sortField={sortField}
          setSortField={handleSortFieldChange}
          sortDirection={sortDirection}
          setSortDirection={handleSortDirectionChange}
          userRole={userRole || ''}
          shelves={shelves}
          allLocations={allLocations}
          allCategories={allCategories}
        />

        {/* View Mode Toggle - Only show if there are books to display */}
        {filteredBooks.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newViewMode) => {
                if (newViewMode !== null) {
                  handleViewModeChange(newViewMode)
                }
              }}
              size="small"
              aria-label="view mode"
            >
              <ToggleButton value="card" aria-label="card view">
                <GridView sx={{ mr: 1 }} />
                Cards
              </ToggleButton>
              <ToggleButton value="compact" aria-label="compact view">
                <ViewList sx={{ mr: 1 }} />
                Compact
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                <FormatListBulleted sx={{ mr: 1 }} />
                List
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

      {filteredBooks.length === 0 ? (
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ textAlign: 'center', p: 4 }}
        >
          {books.length === 0 ? 'No books in your library yet. Start scanning!' : 'No books match your filters.'}
        </Typography>
      ) : (
        <Box>
          {/* Conditional rendering based on view mode */}
          {viewMode === 'list' ? (
            // Ultra-compact list view (text only)
            userRole === 'admin' ? (
              // Admin ultra-compact view with location grouping (paginated)
              <div>
                {getPaginatedBooksForView().map((location: any) => (
                  <div key={location.id} style={{ marginBottom: '2rem' }}>
                    {/* Only show location header when viewing all locations (no location filter active) */}
                    {!locationFilter && (
                      <Box sx={{ 
                        bgcolor: 'action.hover',
                        p: '0.75rem 1rem', 
                        borderRadius: 1, 
                        mb: 2,
                        border: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="h6" sx={{ m: 0, fontSize: '1.1rem' }}>
                          📍 {location.name} ({location.books.length} book{location.books.length !== 1 ? 's' : ''})
                        </Typography>
                        {location.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ m: 0, fontStyle: 'italic' }}>
                            {location.description}
                          </Typography>
                        )}
                      </Box>
                    )}
                    
                    <BookList
                      books={location.books}
                      userRole={userRole}
                      currentUserId={currentUserId}
                      shelves={shelves}
                      pendingRemovalRequests={pendingRemovalRequests}
                      onCheckout={checkoutBook}
                      onCheckin={checkinBook}
                      onDelete={deleteBook}
                      onRelocate={openRelocateModal}
                      onRequestRemoval={requestBookRemoval}
                      onCancelRemovalRequest={cancelRemovalRequest}
                      onMoreDetailsClick={handleMoreDetailsClick}
                      onAuthorClick={handleAuthorClick}
                      onSeriesClick={handleSeriesClick}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Regular user ultra-compact view (paginated)
              <BookList
                books={paginatedBooks}
                userRole={userRole}
                currentUserId={currentUserId}
                shelves={shelves}
                pendingRemovalRequests={pendingRemovalRequests}
                onCheckout={checkoutBook}
                onCheckin={checkinBook}
                onDelete={deleteBook}
                onRelocate={openRelocateModal}
                onRequestRemoval={requestBookRemoval}
                onCancelRemovalRequest={cancelRemovalRequest}
                onMoreDetailsClick={handleMoreDetailsClick}
                onAuthorClick={handleAuthorClick}
                onSeriesClick={handleSeriesClick}
              />
            )
          ) : viewMode === 'compact' ? (
            // Compact list view (with images)
            userRole === 'admin' ? (
              // Admin compact list view with location grouping (paginated)
              <div>
                {getPaginatedBooksForView().map((location: any) => (
                  <div key={location.id} style={{ marginBottom: '2rem' }}>
                    {/* Only show location header when viewing all locations (no location filter active) */}
                    {!locationFilter && (
                      <Box sx={{ 
                        bgcolor: 'action.hover',
                        p: '0.75rem 1rem', 
                        borderRadius: 1, 
                        mb: 2,
                        border: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="h6" sx={{ m: 0, fontSize: '1.1rem' }}>
                          📍 {location.name} ({location.books.length} book{location.books.length !== 1 ? 's' : ''})
                        </Typography>
                        {location.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ m: 0, fontStyle: 'italic' }}>
                            {location.description}
                          </Typography>
                        )}
                      </Box>
                    )}
                    
                    <BookCompact
                      books={location.books}
                      userRole={userRole}
                      currentUserId={currentUserId}
                      shelves={shelves}
                      pendingRemovalRequests={pendingRemovalRequests}
                      onCheckout={checkoutBook}
                      onCheckin={checkinBook}
                      onDelete={deleteBook}
                      onRelocate={openRelocateModal}
                      onRequestRemoval={requestBookRemoval}
                      onCancelRemovalRequest={cancelRemovalRequest}
                      onMoreDetailsClick={handleMoreDetailsClick}
                      onAuthorClick={handleAuthorClick}
                      onSeriesClick={handleSeriesClick}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Regular user compact list view (paginated)
              <BookCompact
                books={paginatedBooks}
                userRole={userRole}
                currentUserId={currentUserId}
                shelves={shelves}
                pendingRemovalRequests={pendingRemovalRequests}
                onCheckout={checkoutBook}
                onCheckin={checkinBook}
                onDelete={deleteBook}
                onRelocate={openRelocateModal}
                onRequestRemoval={requestBookRemoval}
                onCancelRemovalRequest={cancelRemovalRequest}
                onMoreDetailsClick={handleMoreDetailsClick}
                onAuthorClick={handleAuthorClick}
                onSeriesClick={handleSeriesClick}
              />
            )
          ) : (
            // Card view (default)
            userRole === 'admin' ? (
              // Admin card view with location grouping (paginated)
              <div>
                {getPaginatedBooksForView().map((location: any) => (
                  <div key={location.id} style={{ marginBottom: '2rem' }}>
                    {/* Only show location header when viewing all locations (no location filter active) */}
                    {!locationFilter && (
                      <Box sx={{ 
                        bgcolor: 'action.hover',
                        p: '0.75rem 1rem', 
                        borderRadius: 1, 
                        mb: 2,
                        border: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="h6" sx={{ m: 0, fontSize: '1.1rem' }}>
                          📍 {location.name} ({location.books.length} book{location.books.length !== 1 ? 's' : ''})
                        </Typography>
                        {location.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ m: 0, fontStyle: 'italic' }}>
                            {location.description}
                          </Typography>
                        )}
                      </Box>
                    )}
                    
                    <BookGrid
                      books={location.books}
                      userRole={userRole}
                      currentUserId={currentUserId}
                      shelves={shelves}
                      pendingRemovalRequests={pendingRemovalRequests}
                      onCheckout={checkoutBook}
                      onCheckin={checkinBook}
                      onDelete={deleteBook}
                      onRelocate={openRelocateModal}
                      onRequestRemoval={requestBookRemoval}
                      onCancelRemovalRequest={cancelRemovalRequest}
                      onMoreDetailsClick={handleMoreDetailsClick}
                      onAuthorClick={handleAuthorClick}
                      onSeriesClick={handleSeriesClick}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Regular user card view (paginated)
              <BookGrid
                books={paginatedBooks}
                userRole={userRole}
                currentUserId={currentUserId}
                shelves={shelves}
                pendingRemovalRequests={pendingRemovalRequests}
                onCheckout={checkoutBook}
                onCheckin={checkinBook}
                onDelete={deleteBook}
                onRelocate={openRelocateModal}
                onRequestRemoval={requestBookRemoval}
                onCancelRemovalRequest={cancelRemovalRequest}
                onMoreDetailsClick={handleMoreDetailsClick}
                onAuthorClick={handleAuthorClick}
                onSeriesClick={handleSeriesClick}
              />
            )
          )}
          
          {/* Pagination Controls */}
          {filteredBooks.length > booksPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={getTotalPages(filteredBooks)}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}
      
      {/* Bootstrap Modal Components */}
      {modalState.type === 'confirm' && (
        <ConfirmationModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onConfirm={modalState.onConfirm!}
          title={modalState.options.title}
          message={modalState.options.message}
          confirmText={modalState.options.confirmText}
          cancelText={modalState.options.cancelText}
          variant={modalState.options.variant}
          loading={modalState.loading}
        />
      )}
      
      {modalState.type === 'alert' && (
        <AlertModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.options.title}
          message={modalState.options.message}
          variant={modalState.options.variant}
          buttonText={modalState.options.buttonText}
        />
      )}

      {/* More Details Modal */}
      {showMoreDetailsModal && selectedBookForDetails && (
        <MoreDetailsModal
          book={selectedBookForDetails}
          isOpen={showMoreDetailsModal}
          onClose={() => {
            setShowMoreDetailsModal(false)
            setSelectedBookForDetails(null)
          }}
        />
      )}

      {/* Relocate Book Modal */}
      {showRelocateModal && selectedBookForRelocate && (
        <Dialog open={showRelocateModal} onClose={() => setShowRelocateModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            📦 Relocate "{selectedBookForRelocate.title}"
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Current shelf: <strong>{selectedBookForRelocate.shelf_name || 'No shelf assigned'}</strong><br />
                Select a new shelf for this book:
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Select Shelf</InputLabel>
                <Select
                  value={selectedBookForRelocate.shelf_id || ""}
                  label="Select Shelf"
                  onChange={(e) => {
                    const newShelfId = parseInt(String(e.target.value))
                    handleRelocateBook(newShelfId)
                  }}
                >
                  {shelves.map(shelf => (
                    <MenuItem key={shelf.id} value={shelf.id}>
                      {shelf.name} {shelf.id === selectedBookForRelocate.shelf_id ? '(current)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRelocateModal(false)} variant="outlined">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Removal Reason Modal */}
      <RemovalReasonModal
        open={showRemovalReasonModal}
        onClose={handleRemovalReasonModalClose}
      />
      </Paper>
    </Container>
  )
}