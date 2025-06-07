'use client'

import { useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  PhotoCamera,
  RestartAlt,
} from '@mui/icons-material'

interface BookshelfScannerProps {
  onTitlesDetected: (titles: string[]) => void
  onImageCaptured?: () => void
  capturedImageRef?: React.RefObject<HTMLDivElement>
  disabled?: boolean
}

interface OCRResult {
  engine: string
  text: string
  titles: string[]
  confidence?: number
  processingTime: number
}

export default function BookshelfScanner({
  onTitlesDetected,
  onImageCaptured,
  capturedImageRef,
  disabled = false,
}: BookshelfScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [detectedTitles, setDetectedTitles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Create preview URL
    const imageUrl = URL.createObjectURL(file)
    setCapturedImage(imageUrl)
    setError(null)
    
    // Call the onImageCaptured callback for scrolling
    if (onImageCaptured) {
      onImageCaptured()
    }
    
    // Start OCR processing
    processImage(file)
  }

  const preprocessImage = (imageFile: File): Promise<File[]> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        const processedImages: File[] = []
        
        // Try multiple rotations (book spines are often vertical)
        const rotations = [0, 90, 270] // 0°, 90° clockwise, 270° clockwise (90° counter-clockwise)
        
        rotations.forEach((rotation) => {
          // Set canvas size based on rotation
          if (rotation === 90 || rotation === 270) {
            canvas.width = img.height
            canvas.height = img.width
          } else {
            canvas.width = img.width
            canvas.height = img.height
          }
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Apply rotation
          ctx.save()
          if (rotation === 90) {
            ctx.translate(canvas.width, 0)
            ctx.rotate(Math.PI / 2)
          } else if (rotation === 270) {
            ctx.translate(0, canvas.height)
            ctx.rotate(-Math.PI / 2)
          }
          
          // Draw image
          ctx.drawImage(img, 0, 0)
          ctx.restore()
          
          // Get image data for enhancement
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          // Enhance contrast and convert to grayscale
          for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale first
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            
            // Apply strong contrast enhancement for better text recognition
            const enhanced = gray > 128 ? Math.min(255, gray * 1.3) : Math.max(0, gray * 0.7)
            
            data[i] = data[i + 1] = data[i + 2] = enhanced
          }
          
          // Put enhanced image back
          ctx.putImageData(imageData, 0, 0)
          
          // Convert to blob and create file
          canvas.toBlob((blob) => {
            const fileName = `processed-${rotation}deg.jpg`
            const processedFile = new File([blob!], fileName, { type: 'image/jpeg' })
            processedImages.push(processedFile)
            
            // Resolve when all rotations are done
            if (processedImages.length === rotations.length) {
              resolve(processedImages)
            }
          }, 'image/jpeg', 0.95)
        })
      }
      
      img.src = URL.createObjectURL(imageFile)
    })
  }

  const extractHighConfidenceTerms = (rawText: string): string[] => {
    console.log('Extracting high-confidence terms from:', rawText.substring(0, 200) + '...')
    
    // Focus on extracting clean, searchable terms that we're confident about
    const allText = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
    const candidateTerms: string[] = []
    
    // Extract individual meaningful words that are likely book-related
    const words = allText.split(/\s+/).filter(word => {
      const cleanWord = word.replace(/\W/g, '')
      return cleanWord.length >= 4 && // At least 4 characters
             cleanWord.length <= 15 && // Not too long
             /^[A-Za-z]/.test(cleanWord) && // Starts with letter
             !/^\d+$/.test(cleanWord) && // Not just numbers
             !cleanWord.includes('$') && // No prices
             !/^(FIC|Dell|Can|USD|CAD)$/i.test(cleanWord) // Skip common non-book words
    })
    
    // Add clean individual words
    words.forEach(word => {
      const cleanWord = word.replace(/\W/g, '')
      if (cleanWord.length >= 4) {
        candidateTerms.push(cleanWord)
        console.log('Added clean word:', cleanWord)
      }
    })
    
    // Look for specific high-confidence patterns
    
    // 1. Author names (First Last pattern)
    const authorMatches = allText.match(/\b([A-Z][a-z]{3,12})\s+([A-Z][A-Z]{3,12})\b/g)
    if (authorMatches) {
      authorMatches.forEach(match => {
        const cleanAuthor = match.trim()
        if (cleanAuthor.length >= 8 && cleanAuthor.length <= 25) {
          candidateTerms.push(cleanAuthor)
          console.log('Added author:', cleanAuthor)
        }
      })
    }
    
    // 2. "THE" titles
    const theMatches = allText.match(/\bTHE\s+([A-Z]{4,15})\b/g)
    if (theMatches) {
      theMatches.forEach(match => {
        const cleanTitle = match.trim()
        if (cleanTitle.length >= 8 && cleanTitle.length <= 20) {
          candidateTerms.push(cleanTitle)
          console.log('Added THE title:', cleanTitle)
        }
      })
    }
    
    // 3. Known book series/titles
    const knownBooks = allText.match(/\b(COMPASS|SPYGLASS|KNIFE|MAGICIANS|CHRONICLES|FOUNDATION|DUNE|HOBBIT|RINGS|POTTER|WIZARD|CRASH|NEUROMANCER)\b/gi)
    if (knownBooks) {
      knownBooks.forEach(book => {
        candidateTerms.push(book.toUpperCase())
        console.log('Added known book term:', book.toUpperCase())
      })
    }
    
    // 4. Two-word combinations that look like titles
    const twoWordMatches = allText.match(/\b([A-Z]{4,12})\s+([A-Z]{4,12})\b/g)
    if (twoWordMatches) {
      twoWordMatches.forEach(match => {
        const cleanMatch = match.trim()
        const words = cleanMatch.split(' ')
        
        // Filter using general patterns instead of hardcoded terms
        const isValidTitlePattern = 
          cleanMatch.length >= 8 && cleanMatch.length <= 20 && // Reasonable length
          words.length === 2 && // Exactly two words
          !cleanMatch.includes('$') && // No prices
          !/\d{2,}/.test(cleanMatch) && // No long numbers (ISBN, prices, etc.)
          !/^[A-Z]{1,3}\s+[A-Z]{1,3}$/.test(cleanMatch) && // Not just abbreviations
          !/(INC|LLC|CORP|LTD|PUB|PRESS)/.test(cleanMatch) && // Not corporate terms
          !/^(FIC|NON|SCI|ROM|MYS|THR)\s/.test(cleanMatch) && // Not genre codes
          words.every(word => word.length >= 3) // Each word at least 3 chars
        
        if (isValidTitlePattern) {
          candidateTerms.push(cleanMatch)
          console.log('Added two-word term:', cleanMatch)
        }
      })
    }
    
    // Remove duplicates and sort by length (longer first, as they're more specific)
    const uniqueTerms = Array.from(new Set(candidateTerms))
      .filter(term => term.length >= 4) // Final length check
      .sort((a, b) => b.length - a.length)
      .slice(0, 15) // Limit to top 15 most promising terms
    
    console.log('Final high-confidence terms:', uniqueTerms)
    return uniqueTerms
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const runGoogleVisionOCR = async (processedImages: File[]): Promise<OCRResult> => {
    const startTime = Date.now()
    let allExtractedText = ''
    let allTitles: string[] = []
    let totalConfidence = 0
    let confidenceCount = 0
    
    // Process each rotated image
    for (let i = 0; i < processedImages.length; i++) {
      const rotatedImage = processedImages[i]
      console.log(`Google Vision: Processing rotation ${i + 1}/${processedImages.length}...`)
      
      // Convert to base64
      const base64Image = await fileToBase64(rotatedImage)
      
      // Call our API endpoint
      const response = await fetch('/api/ocr-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Image }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Google Vision API HTTP ${response.status}:`, errorText)
        throw new Error(`Google Vision API returned ${response.status}: ${errorText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('Google Vision API error:', result.error)
        
        // Check if it's a configuration error
        if (result.error.includes('not configured')) {
          throw new Error(
            'Google Vision API is not configured. This feature requires Google Cloud Vision API setup with service account credentials. ' +
            'Please contact the administrator to enable this feature.'
          )
        }
        
        throw new Error(result.error)
      }
      
      const { text, confidence } = result.data
      console.log(`Google Vision rotation ${i + 1} OCR text:`, text.substring(0, 200) + '...')
      
      allExtractedText += `\n--- GOOGLE VISION ROTATION ${i + 1} ---\n${text}\n`
      
      if (confidence !== undefined) {
        totalConfidence += confidence
        confidenceCount++
      }
      
      // Extract high-confidence terms from this rotation
      const rotationTitles = extractHighConfidenceTerms(text)
      console.log(`Google Vision rotation ${i + 1} clean terms:`, rotationTitles)
      allTitles.push(...rotationTitles)
    }
    
    // Combine and deduplicate all titles
    const finalTitles = Array.from(new Set(allTitles))
      .sort((a, b) => b.length - a.length) // Longer titles first
      .slice(0, 20) // Limit to top 20 candidates
    
    return {
      engine: 'Google Vision',
      text: allExtractedText,
      titles: finalTitles,
      confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : undefined,
      processingTime: Date.now() - startTime
    }
  }

  const processImage = async (imageFile: File) => {
    setIsProcessing(true)
    setExtractedText('')
    setDetectedTitles([])
    setOcrResult(null)
    
    try {
      console.log('Starting image preprocessing (multiple rotations)...')
      const processedImages = await preprocessImage(imageFile)
      
      console.log('Starting Google Vision OCR processing on', processedImages.length, 'rotated images...')
      
      const visionResult = await runGoogleVisionOCR(processedImages)
      console.log('Google Vision completed:', visionResult.titles.length, 'titles in', visionResult.processingTime, 'ms')
      
      setOcrResult(visionResult)
      setExtractedText(visionResult.text)
      setDetectedTitles(visionResult.titles)
      onTitlesDetected(visionResult.titles)
      
    } catch (err) {
      console.error('OCR Error:', err)
      setError(err instanceof Error ? err.message : 'OCR processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetScanner = () => {
    setCapturedImage(null)
    setExtractedText('')
    setDetectedTitles([])
    setOcrResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Box>
      {/* Experimental Feature Notice */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          🧪 <strong>Experimental Feature:</strong> Bookshelf scanning uses AI to detect book titles from photos. 
          Results may vary depending on photo quality, lighting, and spine visibility. 
          For best results, take clear photos with good lighting and visible book spines.
        </Typography>
        <Typography variant="body2">
          📚 Take, or upload, a photo of your bookshelf to detect book titles. Photos should only include books on the same shelf, and try to limit the number of books in frame to 20 or so.
        </Typography>
      </Alert>

      {/* Photo Capture */}
      {!capturedImage && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            style={{ display: 'none' }}
            ref={fileInputRef}
            disabled={disabled || isProcessing}
          />
          <Button
            variant="contained"
            size="large"
            startIcon={<PhotoCamera />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
            sx={{ mb: 2 }}
          >
            Scan Bookshelf
          </Button>
        </Box>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <Paper sx={{ p: 2, mb: 3 }} ref={capturedImageRef}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              📸 Captured Image
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAlt />}
              onClick={resetScanner}
              disabled={isProcessing}
            >
              Take New Photo
            </Button>
          </Box>
          <img 
            src={capturedImage} 
            alt="Captured bookshelf" 
            style={{ 
              width: '100%', 
              maxHeight: '300px', 
              objectFit: 'contain',
              borderRadius: '8px'
            }} 
          />
        </Paper>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            🔍 Scanning for Book Titles...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Using Google Vision AI to detect book spines...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This might take 10-20 seconds depending on image size
          </Typography>
        </Paper>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>OCR Failed:</strong> {error}
          </Typography>
        </Alert>
      )}


    </Box>
  )
}