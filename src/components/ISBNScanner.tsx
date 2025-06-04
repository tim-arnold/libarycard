'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { fetchBookData } from '@/lib/bookApi'
import { saveBook as saveBookAPI } from '@/lib/api'
import { BrowserMultiFormatReader } from '@zxing/library'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

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
    <div className="card">
      <h2>📱 Scan ISBN</h2>
      
      {/* Contextual help text based on available options */}
      {!loadingData && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '0.75rem', 
          background: '#f8f9fa', 
          border: '1px solid #e9ecef', 
          borderRadius: '0.375rem',
          fontSize: '0.9em',
          color: '#495057'
        }}>
          {allShelves.length === 0 ? (
            <>
              📚 <strong>Getting Started:</strong> You don't have access to any library yet. Contact an administrator to get access before adding books.
            </>
          ) : allShelves.length === 1 ? (
            <>
              📚 <strong>Ready to Add Books:</strong> Scan or enter an ISBN to add books to your library!
            </>
          ) : locations.length === 1 ? (
            <>
              📚 <strong>Ready to Scan:</strong> Choose from {allShelves.length} shelves in {locations[0].name}. Books will be organized automatically!
            </>
          ) : (
            <>
              📚 <strong>Multi-Location Setup:</strong> You have access to {locations.length} locations with {allShelves.length} total shelves. Select the right shelf when adding books.
            </>
          )}
        </div>
      )}
      
      {!isScanning && !scannedBook && (
        <div>
          <button 
            className="btn" 
            onClick={startScanner}
            disabled={isScannerLoading || isScanning || !codeReader}
            style={{ marginBottom: '1rem' }}
          >
            {isScannerLoading ? 'Starting Camera...' : isScanning ? 'Scanning...' : 'Start Camera Scanner'}
          </button>
          
          {isScannerLoading && (
            <p style={{ fontSize: '0.8em', color: '#666' }}>
              Initializing camera and scanner...
            </p>
          )}
          
          
          <form onSubmit={manualISBNEntry} style={{ marginTop: '1rem' }}>
            <input
              type="text"
              name="isbn"
              placeholder="Or enter ISBN manually"
              style={{ 
                padding: '0.5rem', 
                marginRight: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem'
              }}
            />
            <button type="submit" className="btn">
              Look Up Book
            </button>
          </form>
        </div>
      )}

      {/* Scanner container - always present for ref */}
      <div ref={scannerRef} style={{ width: '100%', maxWidth: '640px', minHeight: isScanning ? '300px' : '0px' }} />
      
      {isScanning && (
        <div>
          <button 
            className="btn" 
            onClick={stopScanner}
            style={{ marginTop: '1rem' }}
          >
            Stop Scanner
          </button>
        </div>
      )}

      {isLoading && <p>Loading book data...</p>}

      {scannedBook && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Book Found!</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            {scannedBook.thumbnail && (
              <img 
                src={scannedBook.thumbnail} 
                alt={scannedBook.title}
                style={{ width: '120px', height: 'auto' }}
              />
            )}
            <div>
              <h4>{scannedBook.title}</h4>
              <p><strong>Authors:</strong> {scannedBook.authors.join(', ')}</p>
              <p><strong>ISBN:</strong> {scannedBook.isbn}</p>
              {scannedBook.publishedDate && (
                <p><strong>Published:</strong> {scannedBook.publishedDate}</p>
              )}
              {scannedBook.categories && (
                <p><strong>Categories:</strong> {scannedBook.categories.join(', ')}</p>
              )}
              {scannedBook.description && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
                  {scannedBook.description.substring(0, 200)}...
                </p>
              )}
            </div>
          </div>

          {/* Only show shelf selector if multiple shelves available */}
          {!loadingData && allShelves.length > 1 && (
            <div style={{ marginTop: '1rem' }}>
              <label>
                <strong>Shelf:</strong>
                <select 
                  value={selectedShelfId || ''} 
                  onChange={(e) => setSelectedShelfId(e.target.value ? parseInt(e.target.value) : null)}
                  style={{ 
                    marginLeft: '0.5rem', 
                    padding: '0.25rem',
                    border: '1px solid #ccc',
                    borderRadius: '0.25rem',
                    minWidth: '200px'
                  }}
                >
                  <option value="">Select shelf...</option>
                  {locations.length === 1 ? (
                    // Single location - simple list without grouping
                    allShelves.map(shelf => (
                      <option key={shelf.id} value={shelf.id}>
                        {shelf.name}
                      </option>
                    ))
                  ) : (
                    // Multiple locations - group by location
                    locations.map(location => (
                      <optgroup key={location.id} label={location.name}>
                        {allShelves
                          .filter(shelf => shelf.location_id === location.id)
                          .map(shelf => (
                            <option key={shelf.id} value={shelf.id}>
                              {shelf.name}
                            </option>
                          ))
                        }
                      </optgroup>
                    ))
                  )}
                </select>
              </label>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <label>
              <strong>Tags (comma-separated):</strong>
              <input
                type="text"
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="e.g. fiction, mystery, favorite"
                style={{ 
                  marginLeft: '0.5rem', 
                  padding: '0.25rem',
                  border: '1px solid #ccc',
                  borderRadius: '0.25rem',
                  width: '200px'
                }}
              />
            </label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button 
              className="btn" 
              onClick={saveBook}
              disabled={!selectedShelfId}
              style={{ marginRight: '0.5rem' }}
            >
              {allShelves.length === 1 ? 'Add to Library' : 'Save to Library'}
            </button>
            <button 
              className="btn" 
              onClick={() => setScannedBook(null)}
              style={{ background: '#666' }}
            >
              Cancel
            </button>
          </div>
        </div>
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
    </div>
  )
}