'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Chip,
  Tabs,
  Tab,
} from '@mui/material'
import {
  QrCodeScanner,
  MenuBook,
  PhotoLibrary,
} from '@mui/icons-material'
import { fetchEnhancedBookData, fetchEnhancedBookFromSearch } from '@/lib/bookApi'
import type { EnhancedBook } from '@/lib/types'
import { saveBook as saveBookAPI, getBooks } from '@/lib/api'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import ShelfSelector from './ShelfSelector'
import ISBNScanner from './ISBNScanner'
import BookSearch from './BookSearch'
import BookPreview from './BookPreview'
import BookshelfScanner from './BookshelfScanner'
import { useModal } from '@/hooks/useModal'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

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
                  Average Rating
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

export default function AddBooks() {
  const { data: session } = useSession()
  const { modalState, alert, closeModal } = useModal()
  const [activeTab, setActiveTab] = useState<'scan' | 'search' | 'bookshelf'>(() => {
    // Remember user's preferred tab choice
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('addBooks_preferredTab') as 'scan' | 'search' | 'bookshelf'
      return savedTab || 'search'
    }
    return 'search'
  })
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  
  // Common state
  const [selectedBook, setSelectedBook] = useState<EnhancedBook | null>(null)
  const [showMoreDetailsModal, setShowMoreDetailsModal] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [allShelves, setAllShelves] = useState<Shelf[]>([])
  const [selectedShelfId, setSelectedShelfId] = useState<number | null>(null)
  const [customTags, setCustomTags] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [existingBooks, setExistingBooks] = useState<EnhancedBook[]>([])
  const [justAddedBooks, setJustAddedBooks] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load locations and shelves when session is available
    if (session?.user?.email) {
      loadLocationsAndShelves()
    }
  }, [session])

  const loadLocationsAndShelves = async () => {
    if (!session?.user?.email) return
    
    try {
      setLoadingData(true)
      const locationsResponse = await fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json()
        setLocations(locationsData)
        
        // Load shelves for all locations
        const allShelvesData: Shelf[] = []
        for (const location of locationsData) {
          const shelvesResponse = await fetch(`${API_BASE}/api/locations/${location.id}/shelves`, {
            headers: {
              'Authorization': `Bearer ${session.user.email}`,
              'Content-Type': 'application/json',
            },
          })
          if (shelvesResponse.ok) {
            const shelvesData = await shelvesResponse.json()
            allShelvesData.push(...shelvesData)
          }
        }
        setAllShelves(allShelvesData)
        
        // Smart UI: Auto-select shelf if only one available
        if (allShelvesData.length === 1) {
          setSelectedShelfId(allShelvesData[0].id)
        } else {
          // For multi-shelf users, restore the last selected shelf if it still exists
          const lastSelectedShelfId = localStorage.getItem('lastSelectedShelfId')
          if (lastSelectedShelfId) {
            const shelfId = parseInt(lastSelectedShelfId)
            const shelfExists = allShelvesData.some(shelf => shelf.id === shelfId)
            if (shelfExists) {
              setSelectedShelfId(shelfId)
            }
          }
        }
      }
      
      // Load existing books for duplicate detection
      const savedBooks = await getBooks()
      setExistingBooks(savedBooks)
    } catch (error) {
      // Handle error silently
    } finally {
      setLoadingData(false)
    }
  }

  const handleISBNDetected = async (isbn: string) => {
    setIsLoading(true)
    
    try {
      const bookData = await fetchEnhancedBookData(isbn)
      if (bookData) {
        setSelectedBook(bookData)
      } else {
        await alert({
          title: 'Book Not Found',
          message: 'Book not found for this ISBN. Please try a different ISBN or use the search feature.',
          variant: 'warning'
        })
      }
    } catch (err) {
      await alert({
        title: 'Lookup Error',
        message: 'Failed to fetch book data. Please check your internet connection and try again.',
        variant: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTitlesDetected = (titles: string[]) => {
    console.log('Detected titles from bookshelf:', titles)
    alert({
      title: 'Titles Detected!',
      message: `Found ${titles.length} potential book titles: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`,
      variant: 'success'
    })
    // TODO: Next step will be to search for these titles and show results
  }

  const selectBookFromSearch = async (item: GoogleBookItem) => {
    setIsLoading(true)
    try {
      const enhancedBook = await fetchEnhancedBookFromSearch(item)
      if (enhancedBook) {
        setSelectedBook(enhancedBook)
        // Keep search results populated - don't clear them
      } else {
        await alert({
          title: 'Book Enhancement Failed',
          message: 'Failed to get enhanced book data. Using basic information instead.',
          variant: 'warning'
        })
        
        // Fallback to basic book data
        const isbn = item.volumeInfo.industryIdentifiers?.find(
          id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
        )?.identifier || item.id

        const book: EnhancedBook = {
          id: item.id,
          isbn: isbn,
          title: item.volumeInfo.title,
          authors: item.volumeInfo.authors || ['Unknown Author'],
          description: item.volumeInfo.description,
          thumbnail: item.volumeInfo.imageLinks?.thumbnail,
          publishedDate: item.volumeInfo.publishedDate,
          categories: item.volumeInfo.categories,
        }

        setSelectedBook(book)
        // Keep search results populated - don't clear them
      }
    } catch (error) {
      await alert({
        title: 'Selection Error',
        message: 'Failed to select book. Please try again.',
        variant: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Common functions
  const saveBook = async () => {
    if (!selectedBook || !selectedShelfId) return

    const bookToSave = {
      ...selectedBook,
      shelf_id: selectedShelfId,
      tags: customTags.split(',').map(tag => tag.trim()).filter(Boolean)
    }

    const success = await saveBookAPI(bookToSave)
    
    if (success) {
      const bookTitle = selectedBook.title
      setSelectedBook(null)
      setCustomTags('')
      
      // Persist the selected shelf for future use, but don't clear it
      if (selectedShelfId) {
        localStorage.setItem('lastSelectedShelfId', selectedShelfId.toString())
      }
      
      // Update existing books list to include the newly added book for accurate duplicate detection
      try {
        const updatedBooks = await getBooks()
        setExistingBooks(updatedBooks)
        
        // Mark this book as just added for display purposes
        const bookKey = selectedBook.isbn || selectedBook.title
        setJustAddedBooks(prev => new Set(prev).add(bookKey))
      } catch (error) {
        // If we can't refresh the books list, continue anyway
        console.error('Failed to refresh books list:', error)
      }
      
      await alert({
        title: 'Book Added!',
        message: `"${bookTitle}" has been successfully added to your library!`,
        variant: 'success'
      })
    } else {
      await alert({
        title: 'Save Failed',
        message: 'Failed to save book. Please check your connection and try again.',
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'scan' | 'search' | 'bookshelf') => {
    setActiveTab(newValue)
    
    // Save user's preferred tab choice
    if (typeof window !== 'undefined') {
      localStorage.setItem('addBooks_preferredTab', newValue)
    }
    
    // Clear search query when switching away from search
    if (newValue !== 'search') {
      setSearchQuery('')
    }
  }

  // Duplicate detection helper function for selected book
  const isSelectedBookDuplicate = (): boolean => {
    if (!selectedBook) return false
    
    return existingBooks.some(existingBook => {
      // Check by ISBN
      if (existingBook.isbn === selectedBook.isbn) {
        return true
      }
      
      // Check by title and author combination
      const titleMatch = existingBook.title.toLowerCase() === selectedBook.title.toLowerCase()
      const authorMatch = selectedBook.authors.some(author => 
        existingBook.authors.some(existingAuthor => 
          existingAuthor.toLowerCase() === author.toLowerCase()
        )
      )
      
      return titleMatch && authorMatch
    })
  }

  // Error handler for components
  const handleError = async (title: string, message: string, variant: 'error' | 'warning' | 'info' = 'error') => {
    await alert({ title, message, variant })
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          📚 Add Books to the Libary
        </Typography>
      
        {/* Contextual help text based on available options */}
        {!loadingData && (
          <Alert 
            severity="info" 
            variant="outlined"
            sx={{ mb: 3 }}
          >
            {allShelves.length === 0 ? (
              <Typography variant="body2">
                📚 <strong>Getting Started:</strong> You don't have access to any library yet. Contact an administrator to get access before adding books.
              </Typography>
            ) : allShelves.length === 1 ? (
              <Typography variant="body2">
                📚 <strong>Ready to Add Books:</strong> Scan ISBN barcodes or search by title/author to add books to your library!
              </Typography>
            ) : locations.length === 1 ? (
              <Typography variant="body2">
                📚 <strong>Ready to Add:</strong> Choose from {allShelves.length} shelves in {locations[0].name}. Scan barcodes or search to find books!
              </Typography>
            ) : (
              <Typography variant="body2">
                📚 <strong>Multi-Location Setup:</strong> You have access to {locations.length} locations with {allShelves.length} total shelves. Select the right shelf when adding books.
              </Typography>
            )}
          </Alert>
        )}

        {/* Tab Navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
          >
            <Tab 
              value="search" 
              label="Search for Books" 
              icon={<MenuBook />}
              iconPosition="start"
            />
            <Tab 
              value="scan" 
              label="Scan/Enter ISBN" 
              icon={<QrCodeScanner />}
              iconPosition="start"
            />
            <Tab 
              value="bookshelf" 
              label="Scan Bookshelf" 
              icon={<PhotoLibrary />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* ISBN Scanner Tab */}
        {activeTab === 'scan' && !selectedBook && (
          <ISBNScanner
            onISBNDetected={handleISBNDetected}
            onError={handleError}
            isLoading={isLoading}
            disabled={loadingData}
          />
        )}

        {/* Search Tab */}
        {activeTab === 'search' && !selectedBook && (
          <BookSearch
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onBookSelected={selectBookFromSearch}
            onError={handleError}
            existingBooks={existingBooks}
            justAddedBooks={justAddedBooks}
            disabled={loadingData || isLoading}
          />
        )}

        {/* Bookshelf Scanner Tab */}
        {activeTab === 'bookshelf' && !selectedBook && (
          <BookshelfScanner
            onTitlesDetected={handleTitlesDetected}
            disabled={loadingData || isLoading}
          />
        )}

        {/* Selected Book Display (shared between tabs) */}
        {selectedBook && (
          <Box sx={{ mt: 3 }} data-testid="book-selected-section">
            <BookPreview
              book={selectedBook}
              customTags={customTags}
              onCustomTagsChange={setCustomTags}
              onSave={saveBook}
              onCancel={() => setSelectedBook(null)}
              onMoreDetails={() => setShowMoreDetailsModal(true)}
              onAuthorClick={handleAuthorClick}
              onSeriesClick={handleSeriesClick}
              isDuplicate={isSelectedBookDuplicate()}
              isLoading={isLoading}
              isSaveDisabled={!selectedShelfId}
              saveButtonText={allShelves.length === 1 ? 'Add to Library' : 'Save to Library'}
            />
            
            {/* Shelf selector */}
            <Box sx={{ mb: 2 }}>
              <ShelfSelector
                shelves={allShelves}
                locations={locations}
                selectedShelfId={selectedShelfId}
                onShelfChange={setSelectedShelfId}
                isLoading={loadingData}
              />
            </Box>
          </Box>
        )}

        {/* Modal Components */}
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
        {showMoreDetailsModal && selectedBook && (
          <MoreDetailsModal
            book={selectedBook}
            isOpen={showMoreDetailsModal}
            onClose={() => setShowMoreDetailsModal(false)}
          />
        )}
      </Paper>
    </Container>
  )
}