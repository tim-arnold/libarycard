'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material'
import {
  PhotoCamera,
  Stop,
  Search,
} from '@mui/icons-material'
import { BrowserMultiFormatReader } from '@zxing/library'

interface ISBNScannerProps {
  onISBNDetected: (isbn: string) => void
  onError: (title: string, message: string, variant?: 'error' | 'warning' | 'info') => void
  isLoading?: boolean
  disabled?: boolean
}

export default function ISBNScanner({ 
  onISBNDetected, 
  onError, 
  isLoading = false, 
  disabled = false 
}: ISBNScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const isbnInputRef = useRef<HTMLInputElement>(null)
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false)
  const [isScannerLoading, setIsScannerLoading] = useState(false)
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    // Initialize ZXing scanner
    try {
      const reader = new BrowserMultiFormatReader()
      setCodeReader(reader)
    } catch (error) {
      onError(
        'Scanner Error',
        'Failed to initialize barcode scanner. Please refresh the page.',
        'error'
      )
    }
  }, [onError])

  useEffect(() => {
    // Auto-focus the ISBN input field when component mounts
    const timer = setTimeout(() => {
      isbnInputRef.current?.focus()
    }, 100) // Small delay to ensure the content is rendered

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Cleanup scanner resources on unmount
    return () => {
      if (codeReader && isScanning) {
        try {
          codeReader.reset()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      // Clear the scanner element
      if (scannerRef.current) {
        scannerRef.current.innerHTML = ''
      }
    }
  }, [codeReader, isScanning])

  const startScanner = async () => {
    if (!scannerRef.current) {
      onError(
        'Scanner Error',
        'Scanner element not found. Please refresh the page.',
        'error'
      )
      return
    }
    
    if (!codeReader) {
      onError(
        'Scanner Error',
        'ZXing scanner not initialized. Please refresh the page.',
        'error'
      )
      return
    }

    setIsScanning(true)
    setIsScannerLoading(true)

    try {
      // Check basic browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError(
          'Camera Not Supported',
          'Camera not supported in this browser. Please use manual ISBN entry.',
          'warning'
        )
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
      
      onError('Camera Error', message, 'error')
      setIsScanning(false)
      setIsScannerLoading(false)
    }
  }

  const requestCameraPermission = async () => {
    try {
      console.log('Requesting camera permission...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      })
      
      console.log('Camera permission granted, stream obtained:', stream)
      console.log('Video tracks:', stream.getVideoTracks())
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.label)
        track.stop()
      })
    } catch (error: any) {
      console.error('Camera permission error:', error)
      throw error
    }
  }

  const startZXingScanner = async () => {
    if (!codeReader || !scannerRef.current) {
      throw new Error('Scanner not available or DOM element not available')
    }

    try {
      console.log('Starting ZXing scanner...')
      
      // Create video element for ZXing to use
      const videoElement = document.createElement('video')
      videoElement.style.width = '100%'
      videoElement.style.maxWidth = '640px'
      videoElement.style.height = 'auto'
      videoElement.style.borderRadius = '8px'
      videoElement.playsInline = true
      
      // Clear container and add video element
      scannerRef.current.innerHTML = ''
      scannerRef.current.appendChild(videoElement)
      
      console.log('Video element created, starting ZXing...')
      
      // Let ZXing handle stream management for the video element
      await codeReader.decodeFromVideoDevice(
        null, // Use default camera
        videoElement, // Pass the video element directly
        (result) => {
          if (result) {
            console.log('Barcode detected:', result.getText())
            stopScanner()
            onISBNDetected(result.getText())
          }
        }
      )
      
      console.log('ZXing scanner started successfully')
      setIsScannerLoading(false)
      
    } catch (error) {
      console.error('ZXing scanner error:', error)
      setIsScannerLoading(false)
      throw error
    }
  }

  const stopScanner = () => {
    console.log('Stopping scanner...')
    setIsScanning(false)
    setIsScannerLoading(false)
    
    // Stop ZXing scanner
    if (codeReader) {
      try {
        console.log('Resetting ZXing code reader...')
        codeReader.reset()
      } catch (e) {
        console.log('ZXing reset error (expected):', e)
      }
    }
    
    // Clear the scanner element
    if (scannerRef.current) {
      console.log('Clearing scanner container...')
      scannerRef.current.innerHTML = ''
    }
  }

  const handleManualISBNEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const isbn = formData.get('isbn') as string
    if (isbn) {
      onISBNDetected(isbn)
      // Clear the input after successful submission
      const form = e.currentTarget
      form.reset()
      // Re-focus the input for next entry
      setTimeout(() => {
        isbnInputRef.current?.focus()
      }, 100)
    }
  }

  return (
    <Box>
      {!isScanning && (
        <Box>
          <Button
            variant="contained"
            size="large"
            startIcon={isScannerLoading ? <CircularProgress size={16} color="inherit" /> : <PhotoCamera />}
            onClick={startScanner}
            disabled={isScannerLoading || isScanning || !codeReader || disabled}
            sx={{ mb: 2 }}
          >
            {isScannerLoading ? 'Starting Camera...' : isScanning ? 'Scanning...' : 'Start Camera Scanner'}
          </Button>
          
          {isScannerLoading && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Initializing camera and scanner...
            </Typography>
          )}
          
          <Box 
            component="form" 
            onSubmit={handleManualISBNEntry} 
            sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}
          >
            <TextField
              name="isbn"
              placeholder="Or enter ISBN manually"
              variant="outlined"
              sx={{ flexGrow: 1 }}
              inputRef={isbnInputRef}
              type="number"
              disabled={disabled || isLoading}
              slotProps={{
                input: {
                  inputMode: 'numeric'
                }
              }}
            />
            <Button 
              type="submit" 
              variant="outlined"
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Search />}
              disabled={disabled || isLoading}
              sx={{ minWidth: 120 }}
            >
              {isLoading ? 'Looking Up...' : 'Look Up Book'}
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
            disabled={disabled}
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
  )
}