'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchBookData } from '@/lib/bookApi'
import { saveBook as saveBookAPI } from '@/lib/api'

declare global {
  interface Window {
    Html5Qrcode: any
    Html5QrcodeScanner: any
  }
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
  const [isQuaggaLoading, setIsQuaggaLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadScanner = async () => {
      console.log('Starting to load scanner library...')
      
      try {
        // Check if already loaded
        if (window.Html5QrcodeScanner) {
          console.log('html5-qrcode already loaded')
          setIsQuaggaLoading(false)
          return
        }

        // Load html5-qrcode library for better mobile support
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js'
        script.async = true
        script.defer = true
        
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('html5-qrcode script loaded, checking global...')
            // Give it a moment to initialize
            setTimeout(() => {
              if (window.Html5QrcodeScanner) {
                console.log('html5-qrcode loaded successfully')
                setIsQuaggaLoading(false)
                resolve(true)
              } else {
                console.error('html5-qrcode script loaded but global not available')
                setIsQuaggaLoading(false)
                reject(new Error('Scanner library initialization failed'))
              }
            }, 100)
          }
          script.onerror = (e) => {
            console.error('Failed to load html5-qrcode script:', e)
            setIsQuaggaLoading(false)
            reject(new Error('Failed to load scanner library'))
          }
        })

        console.log('Appending script to head...')
        document.head.appendChild(script)
        await loadPromise
      } catch (error) {
        console.error('Error loading scanner:', error)
        setIsQuaggaLoading(false)
        setError('Camera scanner unavailable. Please use manual ISBN entry.')
      }
    }

    loadScanner()
  }, [])

  const startScanner = async () => {
    if (!scannerRef.current) {
      setError('Scanner not available. Please use manual ISBN entry.')
      return
    }

    setIsScanning(true)
    setError('')

    console.log('Starting scanner...')
    console.log('Navigator mediaDevices available:', !!navigator.mediaDevices)
    console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia)

    try {
      // Check basic browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported in this browser. Please use manual ISBN entry.')
        setIsScanning(false)
        return
      }

      // Request camera permission first (iOS requirement)
      console.log('Requesting camera permission...')
      await requestCameraPermission()
      
      // Try to start the html5-qrcode scanner
      await startHtml5QrcodeScanner()
      
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

  const startHtml5QrcodeScanner = async () => {
    if (!window.Html5QrcodeScanner || !scannerRef.current) {
      throw new Error('Scanner library not loaded or DOM element not available')
    }

    try {
      // Make sure we have an ID for the scanner
      if (!scannerRef.current.id) {
        scannerRef.current.id = 'barcode-reader'
      }

      const html5QrcodeScanner = new window.Html5QrcodeScanner(
        scannerRef.current.id,
        { 
          fps: 10,
          qrbox: { width: 300, height: 150 },
          supportedScanTypes: ['SCAN_TYPE_BARCODE'],
          formatsToSupport: ['EAN_13', 'EAN_8'],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true
        },
        false
      )

      const onScanSuccess = (decodedText: string) => {
        console.log('Barcode scanned:', decodedText)
        html5QrcodeScanner.clear()
        setIsScanning(false)
        handleISBNDetected(decodedText)
      }

      const onScanFailure = (error: string) => {
        // Ignore scan failures, they're normal during scanning
        console.log('Scan attempt failed:', error)
      }

      html5QrcodeScanner.render(onScanSuccess, onScanFailure)
      console.log('html5-qrcode scanner started successfully')
      
    } catch (error) {
      console.error('html5-qrcode scanner failed:', error)
      throw error
    }
  }


  const stopScanner = () => {
    setIsScanning(false)
    
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
          <button 
            className="btn" 
            onClick={startScanner}
            disabled={isQuaggaLoading}
            style={{ marginBottom: '1rem' }}
          >
            {isQuaggaLoading ? 'Loading Scanner...' : 'Start Camera Scanner'}
          </button>
          
          {isQuaggaLoading && (
            <p style={{ fontSize: '0.8em', color: '#666' }}>
              Loading barcode scanner library...
            </p>
          )}
          
          {error && !isQuaggaLoading && (
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