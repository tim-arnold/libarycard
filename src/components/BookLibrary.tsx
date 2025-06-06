'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Card,
  CardContent,
  CardActions,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  Pagination,
} from '@mui/material'
import { 
  Search,
  Delete,
  ReportProblem,
  Cancel,
  CheckCircle,
  Undo,
  Info,
  GridView,
  ViewList,
  SwapHoriz,
} from '@mui/icons-material'
import type { EnhancedBook } from '@/lib/types'
import { getBooks, updateBook, deleteBook as deleteBookAPI } from '@/lib/api'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'
import { CURATED_GENRES } from '@/lib/genreClassifier'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

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
          
          {/* Complete Genres List */}
          {(book.enhancedGenres || book.categories) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                All Genres
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(book.enhancedGenres || book.categories || []).map((genre, index) => (
                  <Chip 
                    key={index} 
                    label={genre} 
                    size="small" 
                    color={book.enhancedGenres ? 'primary' : 'default'}
                  />
                ))}
              </Box>
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
          
          {book.subjects && book.subjects.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Subjects & Topics
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
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [pendingRemovalRequests, setPendingRemovalRequests] = useState<Record<string, number>>({})
  const [showMoreDetailsModal, setShowMoreDetailsModal] = useState(false)
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<EnhancedBook | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [currentPage, setCurrentPage] = useState(1)
  const [booksPerPage] = useState(10)
  const [showRelocateModal, setShowRelocateModal] = useState(false)
  const [selectedBookForRelocate, setSelectedBookForRelocate] = useState<EnhancedBook | null>(null)

  useEffect(() => {
    if (session?.user) {
      loadUserData()
    }
  }, [session])

  // Load saved view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('library-view-mode') as 'card' | 'list'
    if (savedViewMode && (savedViewMode === 'card' || savedViewMode === 'list')) {
      setViewMode(savedViewMode)
    }
  }, [])

  const handleViewModeChange = (newViewMode: 'card' | 'list') => {
    setViewMode(newViewMode)
    localStorage.setItem('library-view-mode', newViewMode)
  }

  // Pagination functions
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
      return getPaginatedBooks(filteredBooks)
    }
  }

  const loadUserData = async () => {
    if (!session?.user?.email) return
    
    // Load user role first
    let currentUserRole = 'user'
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        currentUserRole = data.user_role || 'user'
        setUserRole(currentUserRole)
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error)
      setUserRole('user')
    }

    // Load books
    const savedBooks = await getBooks()
    setBooks(savedBooks)
    setFilteredBooks(savedBooks)

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

  // Helper function to check if a book matches a curated genre filter
  const bookMatchesGenreFilter = (book: EnhancedBook, curatedGenre: string): boolean => {
    // Check enhanced genres first (these are already curated) - use case-insensitive matching
    if (book.enhancedGenres) {
      const curatedLower = curatedGenre.toLowerCase()
      const hasMatch = book.enhancedGenres.some(genre => genre.toLowerCase() === curatedLower)
      if (hasMatch) {
        return true
      }
    }
    
    // For raw categories, use flexible matching for compound genres
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

    setFilteredBooks(filtered)
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [books, searchTerm, shelfFilter, categoryFilter, locationFilter, userRole, shelves, allLocations])

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
      const modal = document.createElement('div')
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `

      const modalContent = document.createElement('div')
      modalContent.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `

      modalContent.innerHTML = `
        <h3 style="margin: 0 0 1rem 0;">Notify the Libarian</h3>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem;">
            <input type="radio" name="reason" value="lost" style="margin-right: 0.5rem;">
            Book is lost
          </label>
          <label style="display: block; margin-bottom: 0.5rem;">
            <input type="radio" name="reason" value="damaged" style="margin-right: 0.5rem;">
            Book is damaged beyond repair
          </label>
          <label style="display: block; margin-bottom: 0.5rem;">
            <input type="radio" name="reason" value="missing" style="margin-right: 0.5rem;">
            Book is missing from its location
          </label>
          <label style="display: block; margin-bottom: 1rem;">
            <input type="radio" name="reason" value="other" style="margin-right: 0.5rem;">
            Other reason
          </label>
        </div>
        <div style="margin-bottom: 1rem;">
          <label for="details" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Additional Details (optional):
          </label>
          <textarea 
            id="details" 
            placeholder="Provide any additional information about the reason for removal..."
            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical; min-height: 60px;"
          ></textarea>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button id="cancel" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">
            Cancel
          </button>
          <button id="submit" style="padding: 0.5rem 1rem; border: none; background: #fd7e14; color: white; border-radius: 4px; cursor: pointer;">
            Continue
          </button>
        </div>
      `

      modal.appendChild(modalContent)
      document.body.appendChild(modal)

      const reasonLabels: Record<string, string> = {
        lost: 'Book is lost',
        damaged: 'Book is damaged beyond repair',
        missing: 'Book tasted delicious',
        other: 'Other reason'
      }

      const handleSubmit = () => {
        const selectedRadio = modalContent.querySelector('input[name="reason"]:checked') as HTMLInputElement
        const detailsTextarea = modalContent.querySelector('#details') as HTMLTextAreaElement
        
        if (!selectedRadio) {
          // Show inline validation message
          let errorMsg = modalContent.querySelector('.error-message') as HTMLDivElement
          if (!errorMsg) {
            errorMsg = document.createElement('div')
            errorMsg.className = 'error-message'
            errorMsg.style.cssText = 'color: #dc3545; font-size: 0.9em; margin-bottom: 1rem; text-align: center;'
            modalContent.insertBefore(errorMsg, modalContent.querySelector('div:last-child')!)
          }
          errorMsg.textContent = 'Please select a reason for removal.'
          return
        }

        const reason = selectedRadio.value
        const details = detailsTextarea.value.trim()

        document.body.removeChild(modal)
        resolve({
          value: reason,
          label: reasonLabels[reason],
          details: details || undefined
        })
      }

      const handleCancel = () => {
        document.body.removeChild(modal)
        resolve(null)
      }

      modalContent.querySelector('#submit')?.addEventListener('click', handleSubmit)
      modalContent.querySelector('#cancel')?.addEventListener('click', handleCancel)

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          handleCancel()
        }
      })
    })
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

  // Render book in list format
  const renderBookListItem = (book: EnhancedBook) => (
    <ListItem
      key={book.id}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 2,
        p: { xs: 1.5, sm: 2, md: 3 },
        backgroundColor: 'background.paper',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          borderColor: 'primary.main'
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {/* Book Content Container - Image + Info */}
      <Box sx={{ 
        display: 'flex',
        alignItems: { xs: 'center', sm: 'flex-start' },
        gap: { xs: 2, sm: 3 },
        flex: 1,
        mb: { xs: 2, sm: 0 },
        width: { xs: '100%', sm: 'auto' }
      }}>
        {/* Book Image */}
        {book.thumbnail ? (
          <Box
            component="img"
            src={book.thumbnail}
            alt={book.title}
            sx={{ 
              width: { xs: 60, sm: 70 }, 
              height: { xs: 90, sm: 105 }, 
              objectFit: 'cover',
              borderRadius: 1,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              flexShrink: 0
            }}
          />
        ) : (
          <Box sx={{ 
            width: { xs: 60, sm: 70 }, 
            height: { xs: 90, sm: 105 }, 
            borderRadius: 1, 
            bgcolor: 'grey.300',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '1.5rem'
          }}>
            📖
          </Box>
        )}
        
        {/* Book Information Container */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Book Title */}
          <Typography 
            variant="h6" 
            component="h3" 
            sx={{ 
              fontWeight: 600, 
              mb: 1.5, 
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
              lineHeight: 1.3,
              wordBreak: 'break-word'
            }}
          >
            {book.title}
          </Typography>
          
          {/* Author */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom 
            sx={{ mb: 1.5, fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.9rem' } }}
          >
            <Typography component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
              By: 
            </Typography>
            {book.authors.map((author, index) => (
              <span key={index}>
                <Typography 
                  component="span" 
                  sx={{ 
                    color: 'primary.main', 
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    '&:hover': { textDecoration: 'none', color: 'primary.dark' },
                    fontWeight: 500,
                    ml: 0.5
                  }}
                  onClick={() => handleAuthorClick(author)}
                >
                  {author}
                </Typography>
                {index < book.authors.length - 1 && ', '}
              </span>
            ))}
          </Typography>
          
          {/* Publication info and Series */}
          {(book.publishedDate || book.series) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 1.5, md: 2 }, mb: 1.5 }}>
              {book.publishedDate && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' } }}
                >
                  <Typography component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    Published: 
                  </Typography>
                  {new Date(book.publishedDate).getFullYear()}
                </Typography>
              )}
              
              {book.series && (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' } }}
                >
                  <Typography component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    Series: 
                  </Typography>
                  <Typography 
                    component="span" 
                    sx={{ 
                      color: 'primary.main', 
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      ml: 0.5,
                      '&:hover': { textDecoration: 'none', color: 'primary.dark' },
                      fontWeight: 500
                    }}
                    onClick={() => handleSeriesClick(book.series!)}
                  >
                    {book.series}
                  </Typography>
                  {book.seriesNumber && (
                    <Typography component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
                      #{book.seriesNumber}
                    </Typography>
                  )}
                </Typography>
              )}
            </Box>
          )}

          {/* Genre - only show for regular users */}
          {userRole !== 'admin' && (book.enhancedGenres || book.categories) && (book.enhancedGenres?.[0] || book.categories?.[0]) && (
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={book.enhancedGenres?.[0] || book.categories?.[0]} 
                size="small" 
                color={book.enhancedGenres ? 'primary' : 'default'}
                sx={{ 
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8125rem' },
                  height: { xs: 20, sm: 24, md: 28 }
                }} 
              />
              {/* More Details button moved to right of genre */}
              {(book.extendedDescription || book.subjects || book.pageCount || book.averageRating || book.publisherInfo || book.openLibraryKey) && (
                <Button
                  size="small"
                  startIcon={<Info />}
                  onClick={() => handleMoreDetailsClick(book)}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.50'
                    }
                  }}
                >
                  More Details
                </Button>
              )}
            </Box>
          )}

          {/* Checkout status display */}
          {book.status === 'checked_out' && (
            <Box sx={{ 
              mt: 1.5, 
              p: { xs: 1, sm: 1.5 }, 
              backgroundColor: 'warning.light', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'warning.main'
            }}>
              <Typography 
                variant="body2" 
                color="text.primary"
                sx={{ fontWeight: 500, mb: 0.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                📖 Checked out by {book.checked_out_by_name || 'Unknown'}
              </Typography>
              {book.checked_out_date && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Since: {new Date(book.checked_out_date).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          )}

          
          {/* Show shelf info for all users */}
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
              <strong>Shelf:</strong> {book.shelf_name || 'No shelf assigned'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Action Controls Container */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 1.5, 
        alignItems: 'stretch',
        flexShrink: 0,
        width: { xs: '100%', sm: 180, md: 200 },
        maxWidth: { xs: '100%', sm: 200 }
      }}>
        {/* First row - Checkout/Return buttons for regular users */}
        {userRole !== 'admin' && (
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            order: 1,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            width: '100%'
          }}>
            {book.status === 'checked_out' ? (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<Undo />}
                onClick={() => checkinBook(book.id, book.title)}
                sx={{ 
                  flex: 1,
                  minWidth: 0,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                  px: { xs: 0.5, sm: 1, md: 2 }
                }}
              >
                Return
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<CheckCircle />}
                onClick={() => checkoutBook(book.id, book.title)}
                sx={{ 
                  flex: 1,
                  minWidth: 0,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                  px: { xs: 0.5, sm: 1, md: 2 }
                }}
              >
                Check Out
              </Button>
            )}
          </Box>
        )}
        
        {/* Second row - Relocate and Notify buttons */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          order: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          width: '100%'
        }}>
          {/* Admin Remove button OR Regular user Relocate button */}
          {userRole === 'admin' ? (
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={() => deleteBook(book.id, book.title)}
              sx={{ 
                flex: 1,
                minWidth: 0,
                fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                px: { xs: 0.5, sm: 1, md: 2 }
              }}
            >
              Remove
            </Button>
          ) : (
            // Relocate button for regular users with multiple shelves
            shelves.length > 1 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHoriz />}
                onClick={() => openRelocateModal(book)}
                sx={{ 
                  flex: 1,
                  minWidth: 0,
                  fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' },
                  px: { xs: 0.5, sm: 1, md: 2 },
                  whiteSpace: 'nowrap'
                }}
              >
                Relocate Book
              </Button>
            )
          )}
          
          {/* Request Removal / Notify Librarian button - only for regular users */}
          {userRole !== 'admin' && (
            <Button
              size="small"
              variant="contained"
              color={pendingRemovalRequests[book.id] ? 'inherit' : 'warning'}
              onClick={() => {
                if (pendingRemovalRequests[book.id]) {
                  cancelRemovalRequest(book.id, book.title)
                } else {
                  requestBookRemoval(book.id, book.title)
                }
              }}
              sx={{ 
                minWidth: 'auto', 
                px: { xs: 0.5, sm: 1 },
                fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' }
              }}
              title={pendingRemovalRequests[book.id] ? 'Cancel removal request' : 'Request removal'}
            >
              {pendingRemovalRequests[book.id] ? <Cancel /> : <ReportProblem />}
            </Button>
          )}
        </Box>
      </Box>
    </ListItem>
  )


  // Use curated genres that actually have books mapped to them in the user's library
  const allCategories = CURATED_GENRES.filter(curatedGenre => {
    return books.some(book => bookMatchesGenreFilter(book, curatedGenre))
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
                🔧 <strong>Admin View:</strong> You can see all {books.length} books across {allLocations.length} location{allLocations.length !== 1 ? 's' : ''} and {shelves.length} shelves. Use filters to organize your view. You can permanently remove books from the library.
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
              // Filter shelves based on selected location
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
              <ToggleButton value="list" aria-label="list view">
                <ViewList sx={{ mr: 1 }} />
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
            // List view
            userRole === 'admin' ? (
              // Admin list view with location grouping (paginated)
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
                    
                    <List sx={{ width: '100%' }}>
                      {location.books.map((book: EnhancedBook) => renderBookListItem(book))}
                    </List>
                  </div>
                ))}
              </div>
            ) : (
              // Regular user list view (paginated)
              <List sx={{ width: '100%' }}>
                {getPaginatedBooks(filteredBooks).map(book => renderBookListItem(book))}
              </List>
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
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                      {location.books.map((book: EnhancedBook) => (
                        <Card key={book.id} sx={{ height: '100%', backgroundColor: 'background.paper !important', display: 'flex', flexDirection: 'column' }}>
                          <CardContent sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              {book.thumbnail && (
                                <Box
                                  component="img"
                                  src={book.thumbnail}
                                  alt={book.title}
                                  sx={{ 
                                    width: 80, 
                                    height: 120, 
                                    objectFit: 'cover', 
                                    flexShrink: 0,
                                    borderRadius: 1
                                  }}
                                />
                              )}
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" gutterBottom>
                                  {book.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  <strong>Author:</strong> {book.authors.map((author, index) => (
                                    <span key={index}>
                                      <Typography 
                                        component="span" 
                                        sx={{ 
                                          color: 'primary.main', 
                                          cursor: 'pointer',
                                          textDecoration: 'underline',
                                          '&:hover': { textDecoration: 'none' }
                                        }}
                                        onClick={() => handleAuthorClick(author)}
                                      >
                                        {author}
                                      </Typography>
                                      {index < book.authors.length - 1 && ', '}
                                    </span>
                                  ))}
                                </Typography>
                                {book.publishedDate && (
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    <strong>Published:</strong> {new Date(book.publishedDate).getFullYear()}
                                  </Typography>
                                )}
                                {book.series && (
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    <strong>Series:</strong> 
                                    <Typography 
                                      component="span" 
                                      sx={{ 
                                        color: 'primary.main', 
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        ml: 0.5,
                                        '&:hover': { textDecoration: 'none' }
                                      }}
                                      onClick={() => handleSeriesClick(book.series!)}
                                    >
                                      {book.series}
                                    </Typography>
                                    {book.seriesNumber && ` (#${book.seriesNumber})`}
                                  </Typography>
                                )}
                                {/* Genre removed for admin card view to condense interface */}
                                {book.description && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {book.description.substring(0, 200)}...
                                  </Typography>
                                )}
                                {(book.extendedDescription || book.subjects || book.pageCount || book.averageRating || book.publisherInfo || book.openLibraryKey) && (
                                  <Box sx={{ mt: 1 }}>
                                    <Button
                                      size="small"
                                      startIcon={<Info />}
                                      onClick={() => handleMoreDetailsClick(book)}
                                      sx={{ textTransform: 'none' }}
                                    >
                                      More Details
                                    </Button>
                                  </Box>
                                )}
                                
                                {/* Show shelf info for admin */}
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Shelf:</strong> {book.shelf_name || 'No shelf assigned'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            
                            {book.tags && book.tags.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Tags:</strong> {book.tags.join(', ')}
                                </Typography>
                              </Box>
                            )}
                            
                            {/* Checkout status display */}
                            {book.status === 'checked_out' && (
                              <Box sx={{ mt: 2, p: 1, backgroundColor: 'warning.light', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.primary">
                                  📖 <strong>Checked out</strong> by {book.checked_out_by_name || 'Unknown'}
                                </Typography>
                                {book.checked_out_date && (
                                  <Typography variant="caption" color="text.secondary">
                                    Since: {new Date(book.checked_out_date).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </CardContent>

                          <CardActions>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<Delete />}
                              onClick={() => deleteBook(book.id, book.title)}
                            >
                              Remove
                            </Button>
                          </CardActions>
                        </Card>
                      ))}
                    </Box>
                  </div>
                ))}
              </div>
            ) : (
              // Regular user card view (paginated)
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                {getPaginatedBooks(filteredBooks).map(book => (
                <Card key={book.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {book.thumbnail && (
                        <Box
                          component="img"
                          src={book.thumbnail}
                          alt={book.title}
                          sx={{ 
                            width: 80, 
                            height: 120, 
                            objectFit: 'cover', 
                            flexShrink: 0,
                            borderRadius: 1
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {book.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Author:</strong> {book.authors.map((author, index) => (
                            <span key={index}>
                              <Typography 
                                component="span" 
                                sx={{ 
                                  color: 'primary.main', 
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  '&:hover': { textDecoration: 'none' }
                                }}
                                onClick={() => handleAuthorClick(author)}
                              >
                                {author}
                              </Typography>
                              {index < book.authors.length - 1 && ', '}
                            </span>
                          ))}
                        </Typography>
                        {book.publishedDate && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Published:</strong> {new Date(book.publishedDate).getFullYear()}
                          </Typography>
                        )}
                        {book.series && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Series:</strong> 
                            <Typography 
                              component="span" 
                              sx={{ 
                                color: 'primary.main', 
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                ml: 0.5,
                                '&:hover': { textDecoration: 'none' }
                              }}
                              onClick={() => handleSeriesClick(book.series!)}
                            >
                              {book.series}
                            </Typography>
                            {book.seriesNumber && ` (#${book.seriesNumber})`}
                          </Typography>
                        )}
                        {/* Genre - only show for regular users */}
                        {userRole !== 'admin' && (book.enhancedGenres || book.categories) && (book.enhancedGenres?.[0] || book.categories?.[0]) && (
                          <Box sx={{ mt: 1, mb: 1 }}>
                            <Chip 
                              label={book.enhancedGenres?.[0] || book.categories?.[0]} 
                              size="small" 
                              color={book.enhancedGenres ? 'primary' : 'default'}
                              sx={{ mr: 0.5, mb: 0.5 }} 
                            />
                          </Box>
                        )}
                        {book.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {book.description.substring(0, 200)}...
                          </Typography>
                        )}
                        {(book.extendedDescription || book.subjects || book.pageCount || book.averageRating || book.publisherInfo || book.openLibraryKey) && (
                          <Box sx={{ mt: 1 }}>
                            <Button
                              size="small"
                              startIcon={<Info />}
                              onClick={() => handleMoreDetailsClick(book)}
                              sx={{ textTransform: 'none' }}
                            >
                              More Details
                            </Button>
                          </Box>
                        )}
                        
                        {/* Show shelf info for all users */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Shelf:</strong> {book.shelf_name || 'No shelf assigned'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {book.tags && book.tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Tags:</strong> {book.tags.join(', ')}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Checkout status display */}
                    {book.status === 'checked_out' && (
                      <Box sx={{ mt: 2, p: 1, backgroundColor: 'warning.light', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.primary">
                          📖 <strong>Checked out</strong> by {book.checked_out_by_name || 'Unknown'}
                        </Typography>
                        {book.checked_out_date && (
                          <Typography variant="caption" color="text.secondary">
                            Since: {new Date(book.checked_out_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {/* Checkout/Return buttons - only show for regular users */}
                      {userRole !== 'admin' && (
                        <>
                          {book.status === 'checked_out' ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Undo />}
                              onClick={() => checkinBook(book.id, book.title)}
                            >
                              Return Book
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<CheckCircle />}
                              onClick={() => checkoutBook(book.id, book.title)}
                            >
                              Check Out
                            </Button>
                          )}
                          
                          {/* Relocate Book button - only show if multiple shelves available */}
                          {shelves.length > 1 && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<SwapHoriz />}
                              onClick={() => openRelocateModal(book)}
                            >
                              Relocate Book
                            </Button>
                          )}
                        </>
                      )}
                    </Box>
                    
                    <Button
                      size="small"
                      variant="contained"
                      color={pendingRemovalRequests[book.id] ? 'inherit' : 'warning'}
                      onClick={() => {
                        if (pendingRemovalRequests[book.id]) {
                          cancelRemovalRequest(book.id, book.title)
                        } else {
                          requestBookRemoval(book.id, book.title)
                        }
                      }}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      {pendingRemovalRequests[book.id] ? <Cancel /> : <ReportProblem />}
                    </Button>
                  </CardActions>
                </Card>
              ))}
              </Box>
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
                Select a new shelf for this book:
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Select Shelf</InputLabel>
                <Select
                  value=""
                  label="Select Shelf"
                  onChange={(e) => {
                    const newShelfId = parseInt(String(e.target.value))
                    handleRelocateBook(newShelfId)
                  }}
                >
                  {shelves
                    .filter(shelf => shelf.id !== selectedBookForRelocate.shelf_id)
                    .map(shelf => (
                      <MenuItem key={shelf.id} value={shelf.id}>
                        {shelf.name}
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
      </Paper>
    </Container>
  )
}