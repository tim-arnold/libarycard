'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { EnhancedBook } from '@/lib/types'
import { getStorageItem, setStorageItem } from '@/lib/storage'

// Types for selection system
export interface SelectedBook {
  key: string                    // Unique identifier (ISBN or title)
  book: EnhancedBook            // Full book data
  source: 'search' | 'isbn'     // Source of selection
  timestamp: number             // Selection timestamp
  tempId?: string              // Temporary ID for books without ISBN
}

export interface SelectionState {
  selectedBooks: Map<string, SelectedBook>  // Selected books by key
  isSelectionMode: boolean                  // Bulk selection mode active
  bulkShelfId: number | null               // Shared shelf for bulk add
  bulkTags: string                         // Shared tags for bulk add
  maxSelections: number                    // Limit (default 50)
}

export interface BulkAddResult {
  success: boolean
  results: Array<{
    tempId?: string
    bookId?: number
    isbn?: string
    title: string
    status: 'success' | 'error' | 'duplicate'
    message?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
    duplicates: number
  }
}

export interface SelectionActions {
  toggleSelectionMode(): void
  addToSelection(book: EnhancedBook, source: 'search' | 'isbn'): void
  removeFromSelection(key: string): void
  clearSelections(): void
  setBulkShelf(shelfId: number | null): void
  setBulkTags(tags: string): void
  isBookSelected(book: EnhancedBook): boolean
  getSelectionCount(): number
  getSelectedBooks(): SelectedBook[]
}

export interface BookSelectionContextType {
  state: SelectionState
  actions: SelectionActions
}

// Create context
const BookSelectionContext = createContext<BookSelectionContextType | undefined>(undefined)

// Initial state
const initialState: SelectionState = {
  selectedBooks: new Map(),
  isSelectionMode: false,
  bulkShelfId: null,
  bulkTags: '',
  maxSelections: 50
}

// Helper function to generate book key
const generateBookKey = (book: EnhancedBook): string => {
  return book.isbn || book.title || book.id
}

// Provider component
export const BookSelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SelectionState>(initialState)

  // Load saved state on mount
  useEffect(() => {
    const savedState = getStorageItem('bookSelections', 'functional')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        // Convert plain object back to Map
        const selectedBooks = new Map()
        if (parsed.selectedBooks && Array.isArray(parsed.selectedBooks)) {
          parsed.selectedBooks.forEach(([key, value]: [string, SelectedBook]) => {
            selectedBooks.set(key, value)
          })
        }
        
        setState(prevState => ({
          ...prevState,
          ...parsed,
          selectedBooks,
          // Reset selection mode on page load (Scenario C behavior)
          isSelectionMode: false
        }))
      } catch (error) {
        console.warn('Failed to parse saved book selections:', error)
      }
    }
  }, [])

  // Save state changes
  useEffect(() => {
    // Convert Map to array for JSON serialization
    const stateToSave = {
      ...state,
      selectedBooks: Array.from(state.selectedBooks.entries())
    }
    setStorageItem('bookSelections', JSON.stringify(stateToSave), 'functional')
  }, [state])

  // Actions implementation
  const actions: SelectionActions = {
    toggleSelectionMode: () => {
      setState(prev => ({
        ...prev,
        isSelectionMode: !prev.isSelectionMode
      }))
    },

    addToSelection: (book: EnhancedBook, source: 'search' | 'isbn') => {
      const key = generateBookKey(book)
      
      setState(prev => {
        // Check if we're at max selections
        if (prev.selectedBooks.size >= prev.maxSelections) {
          return prev // Don't add, silently fail (UI should handle this)
        }

        const newSelectedBooks = new Map(prev.selectedBooks)
        
        // Add or update selection
        newSelectedBooks.set(key, {
          key,
          book,
          source,
          timestamp: Date.now(),
          tempId: book.isbn ? undefined : `temp_${Date.now()}`
        })

        return {
          ...prev,
          selectedBooks: newSelectedBooks
        }
      })
    },

    removeFromSelection: (key: string) => {
      setState(prev => {
        const newSelectedBooks = new Map(prev.selectedBooks)
        newSelectedBooks.delete(key)
        
        return {
          ...prev,
          selectedBooks: newSelectedBooks
        }
      })
    },

    clearSelections: () => {
      setState(prev => ({
        ...prev,
        selectedBooks: new Map(),
        bulkShelfId: null,
        bulkTags: ''
      }))
    },

    setBulkShelf: (shelfId: number | null) => {
      setState(prev => ({
        ...prev,
        bulkShelfId: shelfId
      }))
    },

    setBulkTags: (tags: string) => {
      setState(prev => ({
        ...prev,
        bulkTags: tags
      }))
    },

    isBookSelected: (book: EnhancedBook): boolean => {
      const key = generateBookKey(book)
      return state.selectedBooks.has(key)
    },

    getSelectionCount: (): number => {
      return state.selectedBooks.size
    },

    getSelectedBooks: (): SelectedBook[] => {
      return Array.from(state.selectedBooks.values())
    }
  }

  const value: BookSelectionContextType = {
    state,
    actions
  }

  return (
    <BookSelectionContext.Provider value={value}>
      {children}
    </BookSelectionContext.Provider>
  )
}

// Hook to use the context
export const useBookSelection = (): BookSelectionContextType => {
  const context = useContext(BookSelectionContext)
  if (context === undefined) {
    throw new Error('useBookSelection must be used within a BookSelectionProvider')
  }
  return context
}

// Export the context for advanced usage
export { BookSelectionContext }