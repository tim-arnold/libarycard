'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { fetchBookData } from '@/lib/bookApi'
import { saveBook as saveBookAPI } from '@/lib/api'
import { BrowserMultiFormatReader } from '@zxing/library'

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
  const scannerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedBook, setScannedBook] = useState<Book | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [allShelves, setAllShelves] = useState<Shelf[]>([])
  const [selectedShelfId, setSelectedShelfId] = useState<number | null>(null)
  const [customTags, setCustomTags] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isScannerLoading, setIsScannerLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    // Initialize ZXing scanner
    try {
      const reader = new BrowserMultiFormatReader()
      setCodeReader(reader)
    } catch (error) {
      setError('Failed to initialize barcode scanner. Please refresh the page.')
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
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoadingData(false)
    }
  }

  const startScanner = async () => {
    if (!scannerRef.current) {
      setError('Scanner element not found. Please refresh the page.')
      return
    }
    
    if (!codeReader) {
      setError('ZXing scanner not initialized. Please refresh the page.')
      return
    }

    setIsScanning(true)
    setIsScannerLoading(true)
    setError('')


    try {
      // Check basic browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported in this browser. Please use manual ISBN entry.')
        setIsScanning(false)
        setIsScannerLoading(false)
        return
      }

      // Request camera permission first (iOS requirement)
      await requestCameraPermission()
      
      // Start ZXing scanner
      await startZXingScanner()
      
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings and try again.')
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device. Please use manual ISBN entry.')
      } else {
        setError(`Camera error: ${error.message || 'Unknown error'}. Please allow camera access and try again.`)
      }
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
    setError('')
    
    try {
      const bookData = await fetchBookData(isbn)
      if (bookData) {
        setScannedBook(bookData)
      } else {
        setError('Book not found for this ISBN')
      }
    } catch (err) {
      setError('Failed to fetch book data')
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
      setScannedBook(null)
      setSelectedShelfId(null)
      setCustomTags('')
      alert('Book saved to library!')
    } else {
      alert('Failed to save book. Please try again.')
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
          
          {error && !isScannerLoading && (
            <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '0.25rem' }}>
              <p style={{ fontSize: '0.9em', color: '#856404' }}>
                {error}
              </p>
            </div>
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
      
      {error && <p style={{ color: 'red' }}>{error}</p>}

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

          <div style={{ marginTop: '1rem' }}>
            <label>
              <strong>Shelf:</strong>
              {loadingData ? (
                <span style={{ marginLeft: '0.5rem', color: '#666' }}>Loading shelves...</span>
              ) : (
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
                  {locations.map(location => (
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
                  ))}
                </select>
              )}
            </label>
          </div>

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
              Save to Library
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
    </div>
  )
}