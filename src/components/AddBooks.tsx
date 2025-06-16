'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  CircularProgress,
} from '@mui/material'
import {
  QrCodeScanner,
  MenuBook,
  PhotoLibrary,
  CheckCircle,
  Add,
  Save,
  Cancel,
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
import { getStorageItem, setStorageItem } from '@/lib/storage'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'

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
    const savedTab = getStorageItem('addBooks_preferredTab', 'functional') as 'scan' | 'search' | 'bookshelf'
    return savedTab || 'search'
  })
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDisplayedResults, setSearchDisplayedResults] = useState(10)
  const [preserveSearchState, setPreserveSearchState] = useState(false)
  const [cancelledBookKey, setCancelledBookKey] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<GoogleBookItem[]>([])
  const [searchTotalResults, setSearchTotalResults] = useState(0)
  
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

  // Refs for scroll targets
  const capturedImageRef = useRef<HTMLDivElement>(null)
  const bookSearchResultsRef = useRef<HTMLDivElement>(null)
  const bookSelectedRef = useRef<HTMLDivElement>(null)
  const [lastAddedBookKey, setLastAddedBookKey] = useState<string | null>(null)

  // Scroll utility function
  const scrollToElement = (ref: React.RefObject<HTMLElement>, offset: number = 0) => {
    if (ref.current) {
      const elementTop = ref.current.offsetTop + offset
      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      })
    }
  }

  // Scroll to newly added book when it's added
  useEffect(() => {
    if (lastAddedBookKey) {
      setTimeout(() => {
        // Find the book card element that was just added
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
  }, [lastAddedBookKey])

  // Scroll to book selected section when a book is selected
  useEffect(() => {
    if (selectedBook) {
      setTimeout(() => {
        scrollToElement(bookSelectedRef, 0)
      }, 100)
    }
  }, [selectedBook])

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
          const lastSelectedShelfId = getStorageItem('lastSelectedShelfId', 'functional')
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
    } catch {
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
    } catch {
      await alert({
        title: 'Lookup Error',
        message: 'Failed to fetch book data. Please check your internet connection and try again.',
        variant: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const [detectedTitles, setDetectedTitles] = useState<string[]>([])
  const [bulkSearchResults, setBulkSearchResults] = useState<{ [title: string]: GoogleBookItem[] }>({})
  const [isBulkSearching, setIsBulkSearching] = useState(false)
  const [preserveOcrResults, setPreserveOcrResults] = useState(false)
  const [autoSearchAfterAdd, setAutoSearchAfterAdd] = useState(false)

  const handleImageCaptured = () => {
    // Clear previous search results when starting a new scan
    setDetectedTitles([])
    setBulkSearchResults({})
    
    // Scroll to captured image section after image is selected
    setTimeout(() => {
      scrollToElement(capturedImageRef, -20)
    }, 100)
  }

  const handleTitlesDetected = async (titles: string[]) => {
    console.log('Detected titles from bookshelf:', titles)
    setDetectedTitles(titles)
    
    // Start bulk search immediately
    await performBulkSearch(titles)
    
    // Scroll to search results when Google API processing completes
    setTimeout(() => {
      scrollToElement(bookSearchResultsRef, -20)
    }, 200)
  }

  const performBulkSearch = async (titles: string[]) => {
    setIsBulkSearching(true)
    setBulkSearchResults({})
    
    try {
      const searchPromises = titles.map(async (title) => {
        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=3`
          )
          
          if (response.ok) {
            const data = await response.json()
            return { title, results: data.items || [] }
          } else {
            return { title, results: [] }
          }
        } catch (error) {
          console.error(`Failed to search for "${title}":`, error)
          return { title, results: [] }
        }
      })
      
      const searchResults = await Promise.all(searchPromises)
      
      const resultsMap: { [title: string]: GoogleBookItem[] } = {}
      searchResults.forEach(({ title, results }) => {
        resultsMap[title] = results
      })
      
      setBulkSearchResults(resultsMap)
      setIsBulkSearching(false)
    } catch (error) {
      setIsBulkSearching(false)
      console.error('Bulk search failed:', error)
    }
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
    } catch {
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
        setStorageItem('lastSelectedShelfId', selectedShelfId.toString(), 'functional')
      }
      
      // Update existing books list to include the newly added book for accurate duplicate detection
      try {
        const updatedBooks = await getBooks()
        setExistingBooks(updatedBooks)
        
        // Mark this book as just added for display purposes
        const bookKey = selectedBook.isbn || selectedBook.title
        setJustAddedBooks(prev => new Set(prev).add(bookKey))
        setLastAddedBookKey(bookKey)
      } catch (error) {
        // If we can't refresh the books list, continue anyway
        console.error('Failed to refresh books list:', error)
      }
      
      // Trigger auto-search when returning to search screen
      if (activeTab === 'search' || searchQuery.trim()) {
        setAutoSearchAfterAdd(true)
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'scan' | 'search' | 'bookshelf') => {
    setActiveTab(newValue)
    
    // Save user's preferred tab choice
    setStorageItem('addBooks_preferredTab', newValue, 'functional')
    
    // Clear search query when switching away from search
    // BUT don't clear it if we're preserving OCR results (user clicked an OCR term)
    if (newValue !== 'search' && !preserveOcrResults) {
      setSearchQuery('')
    }
    
    // Reset bookshelf scanner when switching to it from another tab
    // BUT preserve results if user navigated from OCR results to search and back
    if (newValue === 'bookshelf') {
      if (!preserveOcrResults) {
        setDetectedTitles([])
        setBulkSearchResults({})
        setIsBulkSearching(false)
      }
      // Reset the preserve flag after handling the tab switch
      setPreserveOcrResults(false)
    }
  }

  // Enhanced duplicate detection helper function for selected book
  const isSelectedBookDuplicate = (): boolean => {
    if (!selectedBook) return false
    
    return existingBooks.some(existingBook => {
      // Primary check: exact ISBN match (most reliable)
      if (existingBook.isbn === selectedBook.isbn) {
        return true
      }
      
      // Secondary check: title and author combination
      const titleMatch = existingBook.title.toLowerCase() === selectedBook.title.toLowerCase()
      const authorMatch = selectedBook.authors.some(author => 
        existingBook.authors.some(existingAuthor => 
          existingAuthor.toLowerCase() === author.toLowerCase()
        )
      )
      
      // If title and author match, check additional criteria for better accuracy
      if (titleMatch && authorMatch) {
        // If both books have publication dates, they should match for it to be a duplicate
        if (selectedBook.publishedDate && existingBook.publishedDate) {
          // Extract year from dates for comparison (handles different date formats)
          const newBookYear = selectedBook.publishedDate.split('-')[0]
          const existingBookYear = existingBook.publishedDate.split('-')[0]
          
          // Only consider it a duplicate if published in the same year
          return newBookYear === existingBookYear
        }
        
        // If one or both books lack publication date, be more conservative
        // This reduces false positives for books with identical titles/authors but different editions
        return false
      }
      
      return false
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
          📚  Books
        </Typography>
      

        {/* Tab Navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
          >
            <Tab 
              value="search" 
              label="Search"
              icon={<MenuBook />}
              iconPosition="start"
            />
            <Tab 
              value="scan" 
              label="Scan ISBN"
              icon={<QrCodeScanner />}
              iconPosition="start"
            />
            <Tab 
              value="bookshelf" 
              label="Scan Shelf"
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
            shouldAutoSearch={(preserveOcrResults || autoSearchAfterAdd) && !preserveSearchState}
            onSearchComplete={() => {
              setAutoSearchAfterAdd(false)
              setPreserveSearchState(false)
            }}
            displayedResults={searchDisplayedResults}
            onDisplayedResultsChange={setSearchDisplayedResults}
            lastAddedBookKey={lastAddedBookKey}
            cancelledBookKey={cancelledBookKey}
            onCancelledBookScrollComplete={() => setCancelledBookKey(null)}
            searchResults={searchResults}
            onSearchResultsChange={setSearchResults}
            totalResults={searchTotalResults}
            onTotalResultsChange={setSearchTotalResults}
          />
        )}

        {/* Bookshelf Scanner Tab */}
        {activeTab === 'bookshelf' && !selectedBook && (
          <Box>
            <BookshelfScanner
              key={activeTab} // Force reset when switching to this tab
              onTitlesDetected={handleTitlesDetected}
              onImageCaptured={handleImageCaptured}
              capturedImageRef={capturedImageRef}
              disabled={loadingData || isLoading || isBulkSearching}
            />
            
            {/* Bulk Search Results */}
            {(detectedTitles.length > 0 || isBulkSearching) && (
              <Box sx={{ mt: 3 }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography variant="h6" ref={bookSearchResultsRef}>
                      📚 Book Search Results
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Searching Google Books for {detectedTitles.length} detected terms...
                  </Typography>

                  {Object.keys(bulkSearchResults).length > 0 && (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Found matches for your bookshelf scan. Select books to add to your library.
                        <br />
                        💡 <strong>Tip:</strong> Click any search term below to see more results in the Search tab.
                      </Typography>
                      
                      {Object.entries(bulkSearchResults).map(([searchTerm, results]) => (
                      <Box key={searchTerm} sx={{ mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                          🔍 <Typography 
                            component="span" 
                            sx={{ 
                              cursor: 'pointer', 
                              color: 'primary.main', 
                              textDecoration: 'underline',
                              '&:hover': { color: 'primary.dark' }
                            }}
                            onClick={() => {
                              setSearchQuery(searchTerm)
                              setPreserveOcrResults(true)
                              setActiveTab('search')
                            }}
                          >
                            &quot;{searchTerm}&quot;
                          </Typography> ({results.length} results{results.length === 3 ? ' - click for more' : ''})
                        </Typography>
                        
                        {results.length > 0 ? (
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                            {results.map((item) => {
                              const isbn = item.volumeInfo.industryIdentifiers?.find(
                                id => id.type === 'ISBN_13' || id.type === 'ISBN_10'
                              )?.identifier
                              const bookKey = isbn || item.volumeInfo.title
                              const isJustAdded = justAddedBooks.has(bookKey)
                              const isDuplicate = existingBooks.some(existingBook => {
                                if (isbn && existingBook.isbn === isbn) return true
                                const titleMatch = existingBook.title.toLowerCase() === item.volumeInfo.title.toLowerCase()
                                const authorMatch = (item.volumeInfo.authors || []).some(author => 
                                  existingBook.authors.some(existingAuthor => 
                                    existingAuthor.toLowerCase() === author.toLowerCase()
                                  )
                                )
                                return titleMatch && authorMatch
                              })
                              
                              return (
                                <Card key={item.id} data-book-key={bookKey} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                  <CardContent sx={{ flex: 1 }}>
                                    {item.volumeInfo.imageLinks?.thumbnail && (
                                      <CardMedia
                                        component="img"
                                        src={item.volumeInfo.imageLinks.thumbnail}
                                        alt={item.volumeInfo.title}
                                        sx={{ width: 60, height: 'auto', mx: 'auto', mb: 1 }}
                                      />
                                    )}
                                    <Typography variant="subtitle2" component="h3" gutterBottom sx={{ fontSize: '0.9rem' }}>
                                      {item.volumeInfo.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '0.8rem' }}>
                                      {item.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                                    </Typography>
                                    {item.volumeInfo.publishedDate && (
                                      <Typography variant="caption" color="text.secondary">
                                        {item.volumeInfo.publishedDate}
                                      </Typography>
                                    )}
                                  </CardContent>
                                  <CardActions>
                                    {isJustAdded ? (
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
                                        Added!
                                      </Button>
                                    ) : isDuplicate ? (
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
                                        In Library
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="contained"
                                        size="small"
                                        startIcon={<Add />}
                                        onClick={() => selectBookFromSearch(item)}
                                        disabled={isLoading}
                                        fullWidth
                                      >
                                        Add Book
                                      </Button>
                                    )}
                                  </CardActions>
                                </Card>
                              )
                            })}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No matches found for this search term.
                          </Typography>
                        )}
                      </Box>
                    ))}
                    
                    {/* Clear results button */}
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                      <Button 
                        variant="outlined" 
                        onClick={() => {
                          setDetectedTitles([])
                          setBulkSearchResults({})
                        }}
                      >
                        Clear Results & Scan New Bookshelf
                      </Button>
                    </Box>
                    </>
                  )}
                </Paper>
              </Box>
            )}
          </Box>
        )}

        {/* Selected Book Display (shared between tabs) */}
        {selectedBook && (
          <Box sx={{ mt: 3 }} data-testid="book-selected-section" ref={bookSelectedRef}>
            <BookPreview
              book={selectedBook}
              customTags={customTags}
              onCustomTagsChange={setCustomTags}
              onSave={saveBook}
              onCancel={() => {
                const bookKey = selectedBook?.isbn || selectedBook?.title || null
                setSelectedBook(null)
                setPreserveSearchState(true)
                setAutoSearchAfterAdd(false)
                setCancelledBookKey(bookKey)
              }}
              onMoreDetails={() => setShowMoreDetailsModal(true)}
              onAuthorClick={handleAuthorClick}
              onSeriesClick={handleSeriesClick}
              isDuplicate={isSelectedBookDuplicate()}
              isLoading={isLoading}
              isSaveDisabled={!selectedShelfId}
              saveButtonText={allShelves.length === 1 ? 'Add to Library' : 'Save to Library'}
              showActionButtons={false}
            />
            
            {/* Shelf selector */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <ShelfSelector
                shelves={allShelves}
                locations={locations}
                selectedShelfId={selectedShelfId}
                onShelfChange={setSelectedShelfId}
                isLoading={loadingData}
              />
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button 
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={saveBook}
                disabled={!selectedShelfId || isLoading}
              >
                {isLoading ? 'Saving...' : (allShelves.length === 1 ? 'Add to Library' : 'Save to Library')}
              </Button>
              <Button 
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => {
                  const bookKey = selectedBook?.isbn || selectedBook?.title || null
                  setSelectedBook(null)
                  setPreserveSearchState(true)
                  setAutoSearchAfterAdd(false) // Prevent auto-search when returning
                  setCancelledBookKey(bookKey)
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
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