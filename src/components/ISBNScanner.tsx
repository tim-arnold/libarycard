'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchBookData } from '@/lib/bookApi'
import { saveBook as saveBookAPI } from '@/lib/api'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

export interface Book {
  id: string
  isbn: string
  title: string
  authors: string[]
  description?: string
  thumbnail?: string
  publishedDate?: string
  categories?: string[]
  location?: string
  tags?: string[]
}

const LOCATIONS = [
  'basement',
  "julie's room",
  "tim's room", 
  'bench',
  "julie's office",
  'little library'
]

export default function ISBNScanner() {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedBook, setScannedBook] = useState<Book | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [customTags, setCustomTags] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isScannerLoading, setIsScannerLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    // Initialize ZXing scanner
    console.log('Initializing ZXing scanner...')
    try {
      const reader = new BrowserMultiFormatReader()
      setCodeReader(reader)
      console.log('ZXing scanner initialized successfully:', !!reader)
    } catch (error) {
      console.error('Failed to initialize ZXing scanner:', error)
      setError('Failed to initialize barcode scanner. Please refresh the page.')
    }
  }, [])

  const startScanner = async () => {
    console.log('startScanner called')
    console.log('scannerRef.current:', !!scannerRef.current)
    console.log('codeReader:', !!codeReader)
    
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

    console.log('Starting ZXing scanner...')
    console.log('Navigator mediaDevices available:', !!navigator.mediaDevices)
    console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia)

    try {
      // Check basic browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported in this browser. Please use manual ISBN entry.')
        setIsScanning(false)
        setIsScannerLoading(false)
        return
      }

      // Request camera permission first (iOS requirement)
      console.log('Requesting camera permission...')
      await requestCameraPermission()
      
      // Start ZXing scanner
      await startZXingScanner()
      
    } catch (error: any) {
      console.error('Scanner error:', error)
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
      console.log('Testing camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })
      
      console.log('Camera permission granted, stopping test stream...')
      // Stop the test stream immediately
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped track:', track.label)
      })
      
      console.log('Camera permission test completed successfully')
    } catch (error: any) {
      console.error('Camera permission failed:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      throw error
    }
  }

  const startZXingScanner = async () => {
    if (!codeReader || !scannerRef.current) {
      throw new Error('Scanner not available or DOM element not available')
    }

    try {
      console.log('Starting ZXing barcode scanning...')
      
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
      console.log('Starting continuous decode from video device...')
      await codeReader.decodeFromVideoDevice(
        null, // Use default camera
        videoElement,
        (result, error) => {
          if (result) {
            console.log('ZXing barcode detected:', result.getText())
            stopScanner()
            handleISBNDetected(result.getText())
          }
          if (error && !(error instanceof NotFoundException)) {
            console.log('ZXing scan error (continuing):', error)
          }
        }
      )
      
      setIsScannerLoading(false)
      console.log('ZXing scanner started successfully')
      
    } catch (error) {
      console.error('ZXing scanner failed:', error)
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
        console.log('ZXing scanner stopped and reset')
      } catch (e) {
        console.log('ZXing stop error (ignored):', e)
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
      console.error('Book fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const saveBook = async () => {
    if (!scannedBook) return

    const bookToSave = {
      ...scannedBook,
      location: selectedLocation,
      tags: customTags.split(',').map(tag => tag.trim()).filter(Boolean)
    }

    const success = await saveBookAPI(bookToSave)
    
    if (success) {
      setScannedBook(null)
      setSelectedLocation('')
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
          <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f0f0f0', borderRadius: '0.25rem', fontSize: '0.8em' }}>
            <strong>Debug Status:</strong><br />
            Scanner Element: {scannerRef.current ? '✅ Ready' : '❌ Not Found'}<br />
            ZXing Reader: {codeReader ? '✅ Initialized' : '❌ Not Ready'}<br />
            Loading: {isScannerLoading ? 'Yes' : 'No'}<br />
            Scanning: {isScanning ? 'Yes' : 'No'}
          </div>
          
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
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ fontSize: '0.8em', cursor: 'pointer' }}>Debug Info & Help</summary>
                <div style={{ fontSize: '0.7em', marginTop: '0.25rem' }}>
                  <p><strong>Browser:</strong> {navigator.userAgent.includes('iPhone') ? 'iPhone' : navigator.userAgent.includes('Android') ? 'Android' : 'Desktop'}</p>
                  <p><strong>HTTPS:</strong> {location.protocol === 'https:' ? 'Yes ✅' : 'No ❌ (Required for camera)'}</p>
                  <p><strong>MediaDevices:</strong> {navigator.mediaDevices ? 'Available ✅' : 'Not Available ❌'}</p>
                  <p><strong>getUserMedia:</strong> {typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'Available ✅' : 'Not Available ❌'}</p>
                  
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f8f9fa', borderRadius: '0.25rem' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Camera Permission Help:</p>
                    <p>• Make sure to allow camera access when prompted</p>
                    <p>• iOS Safari: Settings &gt; Safari &gt; Camera &gt; Allow</p>
                    <p>• iOS Chrome: Long-press reload button &gt; Request Desktop Site (try this)</p>
                    <p>• Check if another app is using the camera</p>
                  </div>
                </div>
              </details>
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

      {isScanning && (
        <div>
          <div ref={scannerRef} style={{ width: '100%', maxWidth: '640px' }} />
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
              <strong>Location:</strong>
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{ 
                  marginLeft: '0.5rem', 
                  padding: '0.25rem',
                  border: '1px solid #ccc',
                  borderRadius: '0.25rem'
                }}
              >
                <option value="">Select location...</option>
                {LOCATIONS.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
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
              disabled={!selectedLocation}
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