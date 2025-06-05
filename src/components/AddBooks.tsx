'use client'

import { useEffect, useRef, useState } from 'react'
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
  CardMedia,
  CircularProgress,
  Tabs,
  Tab,
  CardActions,
} from '@mui/material'
import {
  Search,
  Save,
  Cancel,
  PhotoCamera,
  Stop,
  QrCodeScanner,
  MenuBook,
  Add,
  Info,
  CheckCircle,
} from '@mui/icons-material'
import { fetchEnhancedBookData, fetchEnhancedBookFromSearch, type EnhancedBook } from '@/lib/bookApi'
import { saveBook as saveBookAPI, getBooks } from '@/lib/api'
import { BrowserMultiFormatReader } from '@zxing/library'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

export interface Book {
  id: string
  isbn: string
  title: string
  authors: string[]
  description?: string
  thumbnail?: string
  publishedDate?: string
  categories?: string[]
  shelf_id?: number
  tags?: string[]
  location_name?: string
  shelf_name?: string
  status?: string // 'available', 'checked_out'
  checked_out_by?: string
  checked_out_by_name?: string
  checked_out_date?: string
  due_date?: string
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
  const scannerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'scan' | 'search'>(() => {
    // Remember user's preferred tab choice
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('addBooks_preferredTab') as 'scan' | 'search'
      return savedTab || 'search'
    }
    return 'search'
  })
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false)
  const [isScannerLoading, setIsScannerLoading] = useState(false)
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GoogleBookItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Refs for auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isbnInputRef = useRef<HTMLInputElement>(null)
  
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

  useEffect(() => {
    // Initialize ZXing scanner
    try {
      const reader = new BrowserMultiFormatReader()
      setCodeReader(reader)
    } catch (error) {
      alert({
        title: 'Scanner Error',
        message: 'Failed to initialize barcode scanner. Please refresh the page.',
        variant: 'error'
      })
    }
  }, [])

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

  // Scanner functions
  const startScanner = async () => {
    if (!scannerRef.current) {
      await alert({
        title: 'Scanner Error',
        message: 'Scanner element not found. Please refresh the page.',
        variant: 'error'
      })
      return
    }
    
    if (!codeReader) {
      await alert({
        title: 'Scanner Error',
        message: 'ZXing scanner not initialized. Please refresh the page.',
        variant: 'error'
      })
      return
    }

    setIsScanning(true)
    setIsScannerLoading(true)

    try {
      // Check basic browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        await alert({
          title: 'Camera Not Supported',
          message: 'Camera not supported in this browser. Please use manual ISBN entry or the search feature.',
          variant: 'warning'
        })
        setIsScanning(false)
        setIsScannerLoading(false)
        return
      }

      // Request camera permission first (iOS requirement)
      await requestCameraPermission()
      
      // Start ZXing scanner
      await startZXingScanner()
      
    } catch (error: any) {
      let message = 'Unknown camera error. Please try again.'
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera access in your browser settings and try again.'
      } else if (error.name === 'NotFoundError') {
        message = 'No camera found on this device. Please use manual ISBN entry or the search feature.'
      } else if (error.message) {
        message = `Camera error: ${error.message}. Please allow camera access and try again.`
      }
      
      await alert({
        title: 'Camera Error',
        message,
        variant: 'error'
      })
      setIsScanning(false)
      setIsScannerLoading(false)
    }
  }

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      })
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => {
        track.stop()
      })
    } catch (error: any) {
      throw error
    }
  }

  const startZXingScanner = async () => {
    if (!codeReader || !scannerRef.current) {
      throw new Error('Scanner not available or DOM element not available')
    }

    try {
      // Create video element for camera preview
      const videoElement = document.createElement('video')
      videoElement.style.width = '100%'
      videoElement.style.maxWidth = '640px'
      videoElement.style.height = 'auto'
      videoElement.style.borderRadius = '8px'
      videoElement.playsInline = true
      
      // Clear any existing content and add video
      scannerRef.current.innerHTML = ''
      scannerRef.current.appendChild(videoElement)
      
      // Start continuous scanning with improved settings
      await codeReader.decodeFromVideoDevice(
        null, // Use default camera
        videoElement,
        (result) => {
          if (result) {
            stopScanner()
            handleISBNDetected(result.getText())
          }
        }
      )
      
      setIsScannerLoading(false)
      
    } catch (error) {
      setIsScannerLoading(false)
      throw error
    }
  }

  const stopScanner = () => {
    setIsScanning(false)
    setIsScannerLoading(false)
    
    // Stop ZXing scanner
    if (codeReader) {
      try {
        codeReader.reset()
      } catch (e) {
        // Ignore stop errors
      }
    }
    
    // Clear the scanner element
    if (scannerRef.current) {
      scannerRef.current.innerHTML = ''
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

  // Search functions
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
        await alert({
          title: 'Search Error',
          message: 'Failed to search books. Please try again.',
          variant: 'error'
        })
      }
    } catch (error) {
      await alert({
        title: 'Search Error',
        message: 'Failed to search books. Please check your internet connection and try again.',
        variant: 'error'
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    searchGoogleBooks(searchQuery)
  }

  const selectBookFromSearch = async (item: GoogleBookItem) => {
    setIsLoading(true)
    try {
      const enhancedBook = await fetchEnhancedBookFromSearch(item)
      if (enhancedBook) {
        setSelectedBook(enhancedBook)
        setSearchResults([])
        setSearchQuery('')
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
        setSearchResults([])
        setSearchQuery('')
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

  const manualISBNEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const isbn = formData.get('isbn') as string
    if (isbn) {
      handleISBNDetected(isbn)
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'scan' | 'search') => {
    setActiveTab(newValue)
    
    // Save user's preferred tab choice
    if (typeof window !== 'undefined') {
      localStorage.setItem('addBooks_preferredTab', newValue)
    }
    
    // Clear any ongoing scans when switching tabs
    if (newValue === 'search' && isScanning) {
      stopScanner()
    }
    // Clear search results when switching to scan
    if (newValue === 'scan') {
      setSearchResults([])
      setSearchQuery('')
    }
    
    // Auto-focus the appropriate input field
    setTimeout(() => {
      if (newValue === 'search') {
        searchInputRef.current?.focus()
      } else if (newValue === 'scan') {
        isbnInputRef.current?.focus()
      }
    }, 100) // Small delay to ensure the tab content is rendered
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
              label="Search Books" 
              icon={<MenuBook />}
              iconPosition="start"
            />
            <Tab 
              value="scan" 
              label="Scan ISBN" 
              icon={<QrCodeScanner />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* ISBN Scanner Tab */}
        {activeTab === 'scan' && (
          <Box>
            {!isScanning && !selectedBook && (
              <Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={isScannerLoading ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera />}
                  onClick={startScanner}
                  disabled={isScannerLoading || isScanning || !codeReader}
                  sx={{ mb: 2 }}
                >
                  {isScannerLoading ? 'Starting Camera...' : isScanning ? 'Scanning...' : 'Start Camera Scanner'}
                </Button>
                
                {isScannerLoading && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Initializing camera and scanner...
                  </Typography>
                )}
                
                <Box component="form" onSubmit={manualISBNEntry} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
                  <TextField
                    name="isbn"
                    placeholder="Or enter ISBN manually"
                    variant="outlined"
                    sx={{ flexGrow: 1 }}
                    inputRef={isbnInputRef}
                    inputMode="numeric"
                  />
                  <Button 
                    type="submit" 
                    variant="outlined"
                    startIcon={<Search />}
                    sx={{ minWidth: 120 }}
                  >
                    Look Up Book
                  </Button>
                </Box>
              </Box>
            )}

            {/* Scanner container - always present for ref */}
            <Box 
              ref={scannerRef} 
              sx={{ 
                width: '100%', 
                maxWidth: '640px', 
                minHeight: isScanning ? '300px' : '0px',
                border: isScanning ? '2px solid #673ab7' : 'none',
                borderRadius: 2,
                overflow: 'hidden',
                margin: '0 auto'
              }} 
            />
          
            {isScanning && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body1" color="primary" sx={{ mb: 2 }}>
                  📱 Point your camera at the ISBN barcode
                </Typography>
                <Button 
                  variant="outlined"
                  color="error"
                  startIcon={<Stop />}
                  onClick={stopScanner}
                >
                  Stop Scanner
                </Button>
              </Box>
            )}

            {isLoading && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Looking up book data...
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <Box>
            <Box component="form" onSubmit={handleSearchSubmit} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, author, or keywords..."
                  variant="outlined"
                  disabled={isSearching}
                  inputRef={searchInputRef}
                />
                <Button 
                  type="submit" 
                  variant="contained"
                  startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <Search />}
                  disabled={isSearching || !searchQuery.trim()}
                  sx={{ minWidth: 120 }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </Box>
            </Box>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box>
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
                        {isBookDuplicate(item) ? (
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
                            onClick={() => selectBookFromSearch(item)}
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
        )}

        {/* Selected Book Display (shared between tabs) */}
        {selectedBook && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom color="success.main">
              Book Selected!
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {selectedBook.thumbnail && (
                    <CardMedia
                      component="img"
                      src={selectedBook.thumbnail}
                      alt={selectedBook.title}
                      sx={{ width: 120, height: 'auto', flexShrink: 0 }}
                    />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {selectedBook.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Authors:</strong> {selectedBook.authors.map((author, index) => (
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
                          {index < selectedBook.authors.length - 1 && ', '}
                        </span>
                      ))}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>ISBN:</strong> {selectedBook.isbn}
                    </Typography>
                    {selectedBook.publishedDate && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Published:</strong> {selectedBook.publishedDate}
                      </Typography>
                    )}
                    {selectedBook.series && (
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
                          onClick={() => handleSeriesClick(selectedBook.series!)}
                        >
                          {selectedBook.series}
                        </Typography>
                        {selectedBook.seriesNumber && ` (#${selectedBook.seriesNumber})`}
                      </Typography>
                    )}
                    {/* Enhanced genres with fallback to categories */}
                    {(selectedBook.enhancedGenres || selectedBook.categories) && (
                      <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          <strong>Genres:</strong>
                        </Typography>
                        {(selectedBook.enhancedGenres || selectedBook.categories || []).slice(0, 4).map((genre, index) => (
                          <Chip 
                            key={index} 
                            label={genre} 
                            size="small" 
                            color={selectedBook.enhancedGenres ? 'primary' : 'default'}
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                        ))}
                        {selectedBook.enhancedGenres && selectedBook.enhancedGenres.length > 4 && (
                          <Chip 
                            label={`+${selectedBook.enhancedGenres.length - 4} more`} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                        )}
                      </Box>
                    )}
                    {selectedBook.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {selectedBook.description.substring(0, 200)}...
                      </Typography>
                    )}
                    {(selectedBook.extendedDescription || selectedBook.subjects || selectedBook.pageCount || selectedBook.averageRating) && (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Info />}
                          onClick={() => setShowMoreDetailsModal(true)}
                          sx={{ textTransform: 'none' }}
                        >
                          More Details
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Only show shelf selector if multiple shelves available */}
            {!loadingData && allShelves.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Shelf</InputLabel>
                  <Select 
                    value={selectedShelfId || ''} 
                    label="Shelf"
                    onChange={(e) => {
                      const newShelfId = e.target.value ? parseInt(String(e.target.value)) : null
                      setSelectedShelfId(newShelfId)
                      // Persist the shelf selection for future use
                      if (newShelfId) {
                        localStorage.setItem('lastSelectedShelfId', newShelfId.toString())
                      }
                    }}
                  >
                    <MenuItem value="">Select shelf...</MenuItem>
                    {locations.length === 1 ? (
                      // Single location - simple list without grouping
                      allShelves.map(shelf => (
                        <MenuItem key={shelf.id} value={shelf.id}>
                          {shelf.name}
                        </MenuItem>
                      ))
                    ) : (
                      // Multiple locations - group by location
                      locations.map(location => [
                        <MenuItem key={`${location.id}-header`} disabled sx={{ fontWeight: 'bold' }}>
                          {location.name}
                        </MenuItem>,
                        ...allShelves
                          .filter(shelf => shelf.location_id === location.id)
                          .map(shelf => (
                            <MenuItem key={shelf.id} value={shelf.id} sx={{ pl: 3 }}>
                              {shelf.name}
                            </MenuItem>
                          ))
                      ]).flat()
                    )}
                  </Select>
                </FormControl>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Tags (comma-separated)"
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="e.g. fiction, mystery, favorite"
                helperText="Add custom tags to organize your books"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained"
                startIcon={<Save />}
                onClick={saveBook}
                disabled={!selectedShelfId}
              >
                {allShelves.length === 1 ? 'Add to Library' : 'Save to Library'}
              </Button>
              <Button 
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => setSelectedBook(null)}
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