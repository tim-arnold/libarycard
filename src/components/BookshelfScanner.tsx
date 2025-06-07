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

  const extractHighConfidenceTerms = (rawText: string): string[] => {
    console.log('Extracting high-confidence terms from:', rawText.substring(0, 200) + '...')
    
    // Focus on extracting clean, searchable terms that we're confident about
    const allText = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
    const candidateTerms: string[] = []
    
    // Extract individual meaningful words that are likely book-related
    const words = allText.split(/\s+/).filter(word => {
      const cleanWord = word.replace(/[^\w]/g, '')
      return cleanWord.length >= 4 && // At least 4 characters
             cleanWord.length <= 15 && // Not too long
             /^[A-Za-z]/.test(cleanWord) && // Starts with letter
             !/^\d+$/.test(cleanWord) && // Not just numbers
             !cleanWord.includes('$') && // No prices
             !/^(FIC|Dell|Can|USD|CAD)$/i.test(cleanWord) // Skip common non-book words
    })
    
    // Add clean individual words
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '')
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

  const cleanTitles = (rawText: string, ocrEngine: string = 'tesseract'): string[] => {
    if (ocrEngine.toLowerCase().includes('google') || ocrEngine.toLowerCase().includes('vision')) {
      return cleanTitlesForGoogleVision(rawText)
    } else {
      return cleanTitlesForTesseract(rawText)
    }
  }

  const extractTitlesFromSpatialData = (spatialData: any[]): string[] => {
    console.log('Processing spatial data:', spatialData.length, 'detections')
    
    // Group words by their vertical position (same "line" of text)
    const groupedByLine: { [key: number]: any[] } = {}
    
    spatialData.forEach(detection => {
      if (!detection.boundingBox) return
      
      const centerY = detection.boundingBox.y + (detection.boundingBox.height / 2)
      const lineKey = Math.round(centerY / 20) * 20 // Group by 20px vertical bands
      
      if (!groupedByLine[lineKey]) {
        groupedByLine[lineKey] = []
      }
      groupedByLine[lineKey].push(detection)
    })
    
    console.log('Grouped into', Object.keys(groupedByLine).length, 'horizontal lines')
    
    const candidateTitles: string[] = []
    
    // Process each line
    Object.values(groupedByLine).forEach(lineWords => {
      // Sort words in the line by horizontal position (left to right)
      lineWords.sort((a, b) => (a.boundingBox?.x || 0) - (b.boundingBox?.x || 0))
      
      // Combine words that are close together horizontally
      const phrases: string[] = []
      let currentPhrase = ''
      let lastX = -1000
      
      lineWords.forEach(word => {
        const wordX = word.boundingBox?.x || 0
        const wordText = word.text?.trim() || ''
        
        // If words are close together (within 50px), they're likely part of the same title
        if (wordX - lastX < 50 && currentPhrase.length > 0) {
          currentPhrase += ' ' + wordText
        } else {
          // Start a new phrase
          if (currentPhrase.length > 0) {
            phrases.push(currentPhrase)
          }
          currentPhrase = wordText
        }
        
        lastX = wordX + (word.boundingBox?.width || 0)
      })
      
      // Don't forget the last phrase
      if (currentPhrase.length > 0) {
        phrases.push(currentPhrase)
      }
      
      // Filter and add phrases that look like book titles
      phrases.forEach(phrase => {
        const cleanPhrase = phrase.trim()
        
        // Skip if too short or too long
        if (cleanPhrase.length < 3 || cleanPhrase.length > 50) return
        
        // Skip obvious non-book content
        if (/^\d+(\.\d+)?$/.test(cleanPhrase)) return // Just numbers
        if (cleanPhrase.includes('$') && cleanPhrase.length < 10) return // Prices
        if (/^[^\w\s]+$/.test(cleanPhrase)) return // Just symbols
        
        // Look for book-like patterns
        const words = cleanPhrase.split(/\s+/)
        const hasBookWords = words.some(word => 
          /^(THE|A|AN|AND|OF|IN|ON|AT|TO|FOR|WITH|BY)$/i.test(word) ||
          /^(BOOK|NOVEL|STORY|TALES|CHRONICLES|SERIES|VOLUME|PART)$/i.test(word)
        )
        const isAllCaps = cleanPhrase === cleanPhrase.toUpperCase() && cleanPhrase.length > 5
        const hasMixedCase = /[a-z].*[A-Z]|[A-Z].*[a-z]/.test(cleanPhrase)
        const isAuthorFormat = words.length === 2 && words.every(word => 
          word.length >= 3 && /^[A-Z][a-z]/.test(word)
        )
        
        // Add if it looks like a book title or author
        if (hasBookWords || isAllCaps || hasMixedCase || isAuthorFormat) {
          candidateTitles.push(cleanPhrase)
          console.log('Added spatial title:', cleanPhrase)
        }
      })
    })
    
    // Remove duplicates and sort by length
    const uniqueTitles = Array.from(new Set(candidateTitles))
      .sort((a, b) => b.length - a.length)
      .slice(0, 25) // Limit to top 25 candidates
    
    console.log('Final spatial titles:', uniqueTitles)
    return uniqueTitles
  }

  const cleanTitlesForGoogleVision = (rawText: string): string[] => {
    console.log('Google Vision raw text for filtering:', rawText.substring(0, 500) + '...')
    
    // Google Vision returns excellent OCR but as one giant concatenated line
    // Need to intelligently reconstruct meaningful book titles and author names
    const allText = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
    
    // Look for common book title patterns in the text
    const candidateTitles: string[] = []
    
    // Pattern 1: "THE [TITLE]" - very common book pattern
    const theMatches = allText.match(/\bTHE\s+[A-Z][A-Z\s]{2,25}(?=\s+[A-Z]{2,}|\s+\$|\s+FIC|\s*$)/gi)
    if (theMatches) {
      theMatches.forEach(match => {
        const cleanTitle = match.trim().replace(/\s+/g, ' ')
        if (cleanTitle.length >= 6 && cleanTitle.length <= 30) {
          candidateTitles.push(cleanTitle)
          console.log('Added "THE" title:', cleanTitle)
        }
      })
    }
    
    // Pattern 2: Author names (First Last format)
    const authorMatches = allText.match(/\b([A-Z][a-z]{2,12})\s+([A-Z][A-Z]{2,15})\b/g)
    if (authorMatches) {
      authorMatches.forEach(match => {
        const cleanAuthor = match.trim()
        if (cleanAuthor.length >= 6 && cleanAuthor.length <= 25) {
          candidateTitles.push(cleanAuthor)
          console.log('Added author name:', cleanAuthor)
        }
      })
    }
    
    // Pattern 3: Capitalized sequences that look like titles (2-4 words)
    const titleMatches = allText.match(/\b[A-Z][A-Z\s]{8,35}(?=\s+[A-Z][a-z]|\s+\$|\s+FIC|\s*$)/g)
    if (titleMatches) {
      titleMatches.forEach(match => {
        const cleanTitle = match.trim().replace(/\s+/g, ' ')
        const words = cleanTitle.split(' ')
        // Only keep if it looks like a reasonable title (2-4 words, not all single letters)
        if (words.length >= 2 && words.length <= 4 && 
            words.some(word => word.length >= 3) &&
            cleanTitle.length >= 8 && cleanTitle.length <= 40) {
          candidateTitles.push(cleanTitle)
          console.log('Added title sequence:', cleanTitle)
        }
      })
    }
    
    // Pattern 4: Single distinctive book words that are often titles
    const bookWords = allText.match(/\b(CHRONICLES|FOUNDATION|DUNE|HOBBIT|RINGS|GAME|THRONES|POTTER|COMPASS|SPYGLASS|KNIFE|WIZARD|MAGICIANS|SNOW|CRASH|NEUROMANCER|SANDMAN|WATCHMEN|PREACHER|FABLES|SAGA|OUTCAST|WALKING|DEAD|BATMAN|SUPERMAN|SPIDERMAN|WOLVERINE|AVENGERS)\b/gi)
    if (bookWords) {
      bookWords.forEach(word => {
        candidateTitles.push(word)
        console.log('Added book word:', word)
      })
    }
    
    // Pattern 5: Look for complete book title phrases by finding title-like patterns
    // This catches patterns like "GOLDEN COMPASS", "AMBER SPYGLASS", etc.
    const phraseMatches = allText.match(/\b([A-Z]{3,15})\s+([A-Z]{3,15})(?:\s+([A-Z]{3,15}))?\b/g)
    if (phraseMatches) {
      phraseMatches.forEach(match => {
        const cleanPhrase = match.trim()
        const words = cleanPhrase.split(' ')
        // Filter for likely book titles (avoid things like "FICTION SECTION" or "BOOK STORE")
        if (words.length >= 2 && words.length <= 3 &&
            !cleanPhrase.includes('FICTION') && !cleanPhrase.includes('SECTION') &&
            !cleanPhrase.includes('STORE') && !cleanPhrase.includes('BOOK') &&
            cleanPhrase.length >= 8 && cleanPhrase.length <= 25) {
          candidateTitles.push(cleanPhrase)
          console.log('Added phrase:', cleanPhrase)
        }
      })
    }
    
    // Remove duplicates and sort by relevance (prioritize longer, more complete titles)
    const uniqueTitles = Array.from(new Set(candidateTitles))
      .filter(title => {
        // Final filtering - remove obvious non-titles
        if (title.includes('USD') || title.includes('CAD') || title.includes('$')) return false
        if (/^\d+/.test(title)) return false
        if (title.length < 4) return false
        return true
      })
      .sort((a, b) => {
        // Prioritize longer titles and titles with "THE"
        const aScore = a.length + (a.startsWith('THE') ? 10 : 0)
        const bScore = b.length + (b.startsWith('THE') ? 10 : 0)
        return bScore - aScore
      })
      .slice(0, 20) // Limit to top 20 most likely titles
    
    console.log('Final Google Vision titles:', uniqueTitles)
    return uniqueTitles
  }

  const cleanTitlesForTesseract = (rawText: string): string[] => {
    // Keep the existing aggressive filtering for Tesseract's noisy output
    const lines = rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    const candidateTitles: string[] = []
    
    for (const line of lines) {
      // Skip obvious garbage (more aggressive for Tesseract)
      if (line.length < 3 || line.length > 60) continue
      if (/^[\d\s\-_=|\\\/\[\]{}()]+$/.test(line)) continue // Just symbols/numbers
      if (line.includes('ISBN') || line.includes('isbn')) continue
      if (/^\$\d+/.test(line)) continue // Prices
      
      // More aggressive word extraction for noisy Tesseract output
      const words = line.split(/\s+/).map(word => {
        return word
          .replace(/[|\\\/\[\]{}()_=\-.,:;!?]+/g, '') // Remove artifacts
          .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '') // Trim non-letters from word ends
          .trim()
      }).filter(word => 
        word.length >= 3 && // At least 3 characters for Tesseract
        /^[a-zA-Z]+$/.test(word) && // Only letters
        !/^[A-Z]{1,2}$/.test(word) // Skip single/double letter artifacts
      )
      
      if (words.length >= 1) {
        // Single strong words
        for (const word of words) {
          if (word.length >= 5) {
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
    
    // Remove duplicates and sort by length
    const uniqueTitles = Array.from(new Set(candidateTitles))
    const singleWords = uniqueTitles.filter(title => !title.includes(' '))
    const phrases = uniqueTitles.filter(title => title.includes(' '))
    
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
      
      // Extract titles from this rotation using Tesseract-specific filtering
      const rotationTitles = cleanTitles(text, 'tesseract')
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
      
      const { text, confidence, spatialData } = result.data
      console.log(`Google Vision rotation ${i + 1} OCR text:`, text.substring(0, 200) + '...')
      
      allExtractedText += `\n--- GOOGLE VISION ROTATION ${i + 1} ---\n${text}\n`
      
      if (confidence !== undefined) {
        totalConfidence += confidence
        confidenceCount++
      }
      
      // Use a simpler approach - extract high-confidence individual words and short phrases
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
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
              color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'grey.900',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              p: 2,
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