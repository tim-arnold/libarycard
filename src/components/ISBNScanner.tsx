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
} from '@mui/material'
import {
  Search,
  Save,
  Cancel,
  PhotoCamera,
  Stop,
} from '@mui/icons-material'
import { fetchBookData } from '@/lib/bookApi'
import type { Book } from '@/lib/types'
import { saveBook as saveBookAPI } from '@/lib/api'
import { BrowserMultiFormatReader } from '@zxing/library'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

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


export default function ISBNScanner() {
  const { data: session } = useSession()
  const { modalState, alert, closeModal } = useModal()
  const scannerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedBook, setScannedBook] = useState<Book | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [allShelves, setAllShelves] = useState<Shelf[]>([])
  const [selectedShelfId, setSelectedShelfId] = useState<number | null>(null)
  const [customTags, setCustomTags] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isScannerLoading, setIsScannerLoading] = useState(false)
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)
  const [loadingData, setLoadingData] = useState(true)

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
        }
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoadingData(false)
    }
  }

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
          message: 'Camera not supported in this browser. Please use manual ISBN entry.',
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
        message = 'No camera found on this device. Please use manual ISBN entry.'
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
          width: { ideal: 640 },
          height: { ideal: 480 }
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
      videoElement.playsInline = true
      
      // Clear any existing content and add video
      scannerRef.current.innerHTML = ''
      scannerRef.current.appendChild(videoElement)
      
      // Start continuous scanning
      await codeReader.decodeFromVideoDevice(
        null, // Use default camera
        videoElement,
        (result) => {
          if (result) {
            stopScanner()
            handleISBNDetected(result.getText())
          }
          // Ignore scan errors - they're normal during scanning
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
      const bookData = await fetchBookData(isbn)
      if (bookData) {
        setScannedBook(bookData)
      } else {
        await alert({
          title: 'Book Not Found',
          message: 'Book not found for this ISBN. Please try a different ISBN or enter the book details manually.',
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

  const saveBook = async () => {
    if (!scannedBook || !selectedShelfId) return

    const bookToSave = {
      ...scannedBook,
      shelf_id: selectedShelfId,
      tags: customTags.split(',').map(tag => tag.trim()).filter(Boolean)
    }

    const success = await saveBookAPI(bookToSave)
    
    if (success) {
      const bookTitle = scannedBook.title
      setScannedBook(null)
      setCustomTags('')
      
      // For single-shelf users, keep the shelf selected for next book
      if (allShelves.length !== 1) {
        setSelectedShelfId(null)
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

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          📱 Scan ISBN
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
                📚 <strong>Ready to Add Books:</strong> Scan or enter an ISBN to add books to your library!
              </Typography>
            ) : locations.length === 1 ? (
              <Typography variant="body2">
                📚 <strong>Ready to Scan:</strong> Choose from {allShelves.length} shelves in {locations[0].name}. Books will be organized automatically!
              </Typography>
            ) : (
              <Typography variant="body2">
                📚 <strong>Multi-Location Setup:</strong> You have access to {locations.length} locations with {allShelves.length} total shelves. Select the right shelf when adding books.
              </Typography>
            )}
          </Alert>
        )}
      
        {!isScanning && !scannedBook && (
          <Box>
            <Button
              variant="contained"
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
                size="small"
                sx={{ flexGrow: 1 }}
              />
              <Button 
                type="submit" 
                variant="outlined"
                startIcon={<Search />}
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
            border: isScanning ? '1px solid #e0e0e0' : 'none',
            borderRadius: 1,
            overflow: 'hidden'
          }} 
        />
      
        {isScanning && (
          <Box sx={{ mt: 2 }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading book data...
          </Typography>
        )}

        {scannedBook && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom color="success.main">
              Book Found!
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {scannedBook.thumbnail && (
                    <CardMedia
                      component="img"
                      src={scannedBook.thumbnail}
                      alt={scannedBook.title}
                      sx={{ width: 120, height: 'auto', flexShrink: 0 }}
                    />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {scannedBook.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Authors:</strong> {scannedBook.authors.join(', ')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>ISBN:</strong> {scannedBook.isbn}
                    </Typography>
                    {scannedBook.publishedDate && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Published:</strong> {scannedBook.publishedDate}
                      </Typography>
                    )}
                    {scannedBook.categories && (
                      <Box sx={{ mt: 1, mb: 1 }}>
                        {scannedBook.categories.slice(0, 3).map((category, index) => (
                          <Chip key={index} label={category} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                    )}
                    {scannedBook.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {scannedBook.description.substring(0, 200)}...
                      </Typography>
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
                    onChange={(e) => setSelectedShelfId(e.target.value ? parseInt(String(e.target.value)) : null)}
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
                onClick={() => setScannedBook(null)}
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
      </Paper>
    </Container>
  )
}