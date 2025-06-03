'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchBookData } from '@/lib/bookApi'
import { saveBook as saveBookAPI } from '@/lib/api'

declare global {
  interface Window {
    Quagga: any
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
    const loadQuagga = async () => {
      // Check if already loaded
      if (window.Quagga) {
        console.log('Quagga already loaded')
        setIsQuaggaLoading(false)
        return
      }

      try {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js'
        
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('Quagga loaded successfully')
            setIsQuaggaLoading(false)
            resolve(true)
          }
          script.onerror = () => {
            console.error('Failed to load Quagga.js')
            setIsQuaggaLoading(false)
            reject(new Error('Failed to load Quagga.js'))
          }
        })

        document.head.appendChild(script)
        await loadPromise
      } catch (error) {
        console.error('Error loading Quagga:', error)
        setIsQuaggaLoading(false)
        setError('Camera scanner unavailable. Please use manual ISBN entry.')
      }
    }

    loadQuagga()

    return () => {
      // Cleanup if needed
      if (window.Quagga) {
        try {
          window.Quagga.stop()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  const startScanner = () => {
    if (!window.Quagga || !scannerRef.current) {
      setError('Scanner not available. Please use manual ISBN entry.')
      return
    }

    setIsScanning(true)
    setError('')

    window.Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          facingMode: "environment",
          aspectRatio: { min: 1, max: 2 }
        }
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 2,
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "ean_5_reader"]
      },
      locate: true
    }, (err: any) => {
      if (err) {
        console.error('Scanner initialization error:', err)
        setError('Failed to access camera. Please check permissions and try manual ISBN entry.')
        setIsScanning(false)
        return
      }
      console.log('Scanner initialized successfully')
      window.Quagga.start()
    })

    window.Quagga.onDetected((data: any) => {
      const isbn = data.codeResult.code
      console.log('ISBN detected:', isbn)
      stopScanner()
      handleISBNDetected(isbn)
    })
  }

  const stopScanner = () => {
    if (window.Quagga) {
      window.Quagga.stop()
    }
    setIsScanning(false)
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