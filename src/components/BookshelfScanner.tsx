'use client'

import { useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
} from '@mui/material'
import {
  PhotoCamera,
  RestartAlt,
  Speed,
  Psychology,
  CompareArrows,
} from '@mui/icons-material'
import { createWorker } from 'tesseract.js'

interface BookshelfScannerProps {
  onTitlesDetected: (titles: string[]) => void
  disabled?: boolean
}

type OCREngine = 'tesseract' | 'google-vision' | 'both'

interface OCRResult {
  engine: string
  text: string
  titles: string[]
  confidence?: number
  processingTime: number
}

export default function BookshelfScanner({
  onTitlesDetected,
  disabled = false,
}: BookshelfScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>('')
  const [detectedTitles, setDetectedTitles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ocrEngine, setOcrEngine] = useState<OCREngine>('tesseract')
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Create preview URL
    const imageUrl = URL.createObjectURL(file)
    setCapturedImage(imageUrl)
    setError(null)
    
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

  const cleanTitles = (rawText: string, ocrEngine: string = 'tesseract'): string[] => {
    const lines = rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    const candidateTitles: string[] = []
    
    for (const line of lines) {
      // Skip obvious garbage
      if (line.length < 3 || line.length > 60) continue
      if (/^[\d\s\-_=|\\\/\[\]{}()]+$/.test(line)) continue // Just symbols/numbers
      if (line.includes('ISBN') || line.includes('isbn')) continue
      if (/^\$\d+/.test(line)) continue // Prices
      
      // More aggressive word extraction - look for meaningful words even if mixed with garbage
      const words = line.split(/\s+/).map(word => {
        // Clean each word of common OCR artifacts
        return word
          .replace(/[|\\\/\[\]{}()_=\-.,:;!?]+/g, '') // Remove artifacts
          .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '') // Trim non-letters from word ends
          .trim()
      }).filter(word => 
        word.length >= 3 && // At least 3 characters
        /^[a-zA-Z]+$/.test(word) && // Only letters
        !/^[A-Z]{1,2}$/.test(word) // Skip single/double letter artifacts
      )
      
      // If we found good words, try to reconstruct meaningful phrases
      if (words.length >= 1) {
        // Single strong words (potential author names, distinctive titles)
        for (const word of words) {
          if (word.length >= 5) { // Strong single words like "STERLING", "WIZARD"
            candidateTitles.push(word)
          }
        }
        
        // Multi-word combinations
        if (words.length >= 2) {
          const phrase = words.join(' ')
          if (phrase.length <= 50) {
            candidateTitles.push(phrase)
          }
        }
      }
    }
    
    // Remove duplicates and sort by length (longer titles often more accurate)
    const uniqueTitles = Array.from(new Set(candidateTitles))
    
    // Separate single words and phrases for better sorting
    const singleWords = uniqueTitles.filter(title => !title.includes(' '))
    const phrases = uniqueTitles.filter(title => title.includes(' '))
    
    // Prioritize phrases over single words, then by length
    return [...phrases.sort((a, b) => b.length - a.length), ...singleWords.sort((a, b) => b.length - a.length)]
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const runTesseractOCR = async (processedImages: File[]): Promise<OCRResult> => {
    const startTime = Date.now()
    
    // Create Tesseract worker with better settings
    const worker = await createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?\'"-:&',
    })
    
    let allExtractedText = ''
    let allTitles: string[] = []
    
    // Process each rotated image
    for (let i = 0; i < processedImages.length; i++) {
      const rotatedImage = processedImages[i]
      console.log(`Tesseract: Processing rotation ${i + 1}/${processedImages.length}...`)
      
      const { data: { text } } = await worker.recognize(rotatedImage)
      console.log(`Tesseract rotation ${i + 1} OCR text:`, text.substring(0, 200) + '...')
      
      allExtractedText += `\n--- TESSERACT ROTATION ${i + 1} ---\n${text}\n`
      
      // Extract titles from this rotation
      const rotationTitles = cleanTitles(text)
      allTitles.push(...rotationTitles)
    }
    
    // Clean up worker
    await worker.terminate()
    
    // Combine and deduplicate all titles
    const finalTitles = Array.from(new Set(allTitles))
      .sort((a, b) => b.length - a.length) // Longer titles first
      .slice(0, 20) // Limit to top 20 candidates
    
    return {
      engine: 'Tesseract.js',
      text: allExtractedText,
      titles: finalTitles,
      processingTime: Date.now() - startTime
    }
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
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      const { text, confidence } = result.data
      console.log(`Google Vision rotation ${i + 1} OCR text:`, text.substring(0, 200) + '...')
      
      allExtractedText += `\n--- GOOGLE VISION ROTATION ${i + 1} ---\n${text}\n`
      
      if (confidence !== undefined) {
        totalConfidence += confidence
        confidenceCount++
      }
      
      // Extract titles from this rotation
      const rotationTitles = cleanTitles(text)
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
    setOcrResults([])
    
    try {
      console.log('Starting image preprocessing (multiple rotations)...')
      const processedImages = await preprocessImage(imageFile)
      
      console.log('Starting OCR processing on', processedImages.length, 'rotated images with engine:', ocrEngine)
      
      const results: OCRResult[] = []
      
      if (ocrEngine === 'tesseract' || ocrEngine === 'both') {
        console.log('Running Tesseract OCR...')
        const tesseractResult = await runTesseractOCR(processedImages)
        results.push(tesseractResult)
        console.log('Tesseract completed:', tesseractResult.titles.length, 'titles in', tesseractResult.processingTime, 'ms')
      }
      
      if (ocrEngine === 'google-vision' || ocrEngine === 'both') {
        console.log('Running Google Vision OCR...')
        try {
          const visionResult = await runGoogleVisionOCR(processedImages)
          results.push(visionResult)
          console.log('Google Vision completed:', visionResult.titles.length, 'titles in', visionResult.processingTime, 'ms')
        } catch (visionError) {
          console.warn('Google Vision failed:', visionError)
          if (ocrEngine === 'google-vision') {
            throw visionError // If only using Google Vision, throw the error
          }
          // If using both engines, continue with Tesseract results
        }
      }
      
      setOcrResults(results)
      
      // For the main display, use the best result or combine results
      let displayText = ''
      let displayTitles: string[] = []
      
      if (results.length === 1) {
        // Single engine result
        displayText = results[0].text
        displayTitles = results[0].titles
      } else if (results.length === 2) {
        // Both engines - combine results
        displayText = results.map(r => `=== ${r.engine.toUpperCase()} RESULTS ===\n${r.text}`).join('\n\n')
        
        // Combine titles and deduplicate
        const allTitles = results.flatMap(r => r.titles)
        displayTitles = Array.from(new Set(allTitles))
          .sort((a, b) => b.length - a.length)
          .slice(0, 25) // Show more when combining
      }
      
      console.log('Final combined titles:', displayTitles)
      setExtractedText(displayText)
      setDetectedTitles(displayTitles)
      onTitlesDetected(displayTitles)
      
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
    setOcrResults([])
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Box>
      {/* OCR Engine Selection */}
      {!capturedImage && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrows />
            OCR Engine Comparison Test
          </Typography>
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Choose OCR Engine</FormLabel>
            <RadioGroup
              value={ocrEngine}
              onChange={(e) => setOcrEngine(e.target.value as OCREngine)}
              row
            >
              <FormControlLabel 
                value="tesseract" 
                control={<Radio />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Speed fontSize="small" />
                  Tesseract.js (Current)
                </Box>} 
              />
              <FormControlLabel 
                value="google-vision" 
                control={<Radio />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Psychology fontSize="small" />
                  Google Vision (New)
                </Box>} 
              />
              <FormControlLabel 
                value="both" 
                control={<Radio />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CompareArrows fontSize="small" />
                  Both (Compare)
                </Box>} 
              />
            </RadioGroup>
          </FormControl>
          
          <Typography variant="body2" color="text.secondary">
            📊 Test different OCR engines to compare book spine detection accuracy
          </Typography>
        </Paper>
      )}
      
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
            Take Bookshelf Photo
          </Button>
          <Typography variant="body2" color="text.secondary">
            📚 Point your camera at a bookshelf and we'll try to detect book titles!
          </Typography>
        </Box>
      )}

      {/* Captured Image Preview */}
      {capturedImage && (
        <Paper sx={{ p: 2, mb: 3 }}>
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
            {ocrEngine === 'both' ? 'Running both OCR engines for comparison...' : `Using ${ocrEngine === 'tesseract' ? 'Tesseract.js' : 'Google Vision'} engine...`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This might take {ocrEngine === 'both' ? '20-60' : '10-30'} seconds depending on image size
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

      {/* OCR Results Comparison */}
      {ocrResults.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrows />
            OCR Engine Results Comparison
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            {ocrResults.map((result, index) => (
              <Box key={index} sx={{ flex: ocrResults.length > 1 ? 1 : 'none', width: ocrResults.length === 1 ? '100%' : 'auto' }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {result.engine}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        size="small" 
                        label={`${result.titles.length} titles`}
                        color={result.titles.length > 0 ? 'success' : 'default'}
                      />
                      <Chip 
                        size="small" 
                        label={`${(result.processingTime / 1000).toFixed(1)}s`}
                        variant="outlined"
                      />
                      {result.confidence !== undefined && (
                        <Chip 
                          size="small" 
                          label={`${(result.confidence * 100).toFixed(0)}% conf`}
                          color={result.confidence > 0.8 ? 'success' : result.confidence > 0.5 ? 'warning' : 'error'}
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Detected Titles ({result.titles.length}):
                  </Typography>
                  
                  {result.titles.length > 0 ? (
                    <List dense>
                      {result.titles.slice(0, 10).map((title, titleIndex) => (
                        <ListItem key={titleIndex} sx={{ py: 0.5 }}>
                          <ListItemText 
                            primary={title}
                            slotProps={{
                              primary: { variant: 'body2', fontSize: '0.9rem' }
                            }}
                          />
                        </ListItem>
                      ))}
                      {result.titles.length > 10 && (
                        <ListItem>
                          <ListItemText 
                            primary={`... and ${result.titles.length - 10} more`}
                            slotProps={{
                              primary: { variant: 'body2', fontStyle: 'italic', color: 'text.secondary' }
                            }}
                          />
                        </ListItem>
                      )}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No titles detected by this engine
                    </Typography>
                  )}
                </Paper>
              </Box>
            ))}
          </Box>
          
          {ocrResults.length > 1 && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                📊 Comparison Summary:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">
                    <strong>Detection Rate:</strong><br/>
                    {ocrResults.map(r => `${r.engine}: ${r.titles.length} titles`).join(' vs ')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">
                    <strong>Speed:</strong><br/>
                    {ocrResults.map(r => `${r.engine}: ${(r.processingTime / 1000).toFixed(1)}s`).join(' vs ')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">
                    <strong>Winner:</strong><br/>
                    {ocrResults.reduce((best, current) => 
                      current.titles.length > best.titles.length ? current : best
                    ).engine} (more titles)
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Raw Text Output (for debugging) */}
      {extractedText && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔤 Raw OCR Text (Debug)
          </Typography>
          <Typography 
            variant="body2" 
            component="pre"
            sx={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              maxHeight: '200px',
              overflow: 'auto',
              backgroundColor: 'grey.50',
              p: 1,
              borderRadius: 1
            }}
          >
            {extractedText}
          </Typography>
        </Paper>
      )}

      {/* Detected Titles */}
      {detectedTitles.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            📚 Detected Book Titles ({detectedTitles.length})
          </Typography>
          <List dense>
            {detectedTitles.map((title, index) => (
              <ListItem key={index} divider>
                <ListItemText 
                  primary={title}
                  slotProps={{
                    primary: { variant: 'body2' }
                  }}
                />
              </ListItem>
            ))}
          </List>
          {detectedTitles.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No book titles detected. Try a clearer photo with better lighting.
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  )
}