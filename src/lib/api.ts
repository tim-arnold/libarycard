import type { EnhancedBook } from '@/lib/types'

export async function saveBook(book: Omit<EnhancedBook, 'id'>): Promise<boolean> {
  try {
    const response = await fetch('/api/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(book),
    })
    
    return response.ok
  } catch (error) {
    console.error('Failed to save book:', error)
    
    // Fallback to localStorage
    const existingBooks = JSON.parse(localStorage.getItem('library') || '[]')
    const bookWithId = { ...book, id: `${book.isbn}-${Date.now()}` }
    const updatedBooks = [...existingBooks, bookWithId]
    localStorage.setItem('library', JSON.stringify(updatedBooks))
    return true
  }
}

export async function getBooks(): Promise<EnhancedBook[]> {
  try {
    const response = await fetch('/api/books')
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch books:', error)
  }
  
  // Fallback to localStorage
  return JSON.parse(localStorage.getItem('library') || '[]')
}

export async function updateBook(id: string | number, updates: Partial<EnhancedBook>): Promise<boolean> {
  try {
    const response = await fetch(`/api/books/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })
    return response.ok
  } catch (error) {
    console.error('Failed to update book:', error)
    
    // Fallback to localStorage
    const existingBooks = JSON.parse(localStorage.getItem('library') || '[]')
    const updatedBooks = existingBooks.map((book: EnhancedBook) =>
      book.id === id ? { ...book, ...updates } : book
    )
    localStorage.setItem('library', JSON.stringify(updatedBooks))
    return true
  }
}

export async function deleteBook(id: string | number): Promise<boolean> {
  try {
    const response = await fetch(`/api/books/${id}`, {
      method: 'DELETE',
    })
    return response.ok
  } catch (error) {
    console.error('Failed to delete book:', error)
    
    // Fallback to localStorage
    const existingBooks = JSON.parse(localStorage.getItem('library') || '[]')
    const updatedBooks = existingBooks.filter((book: EnhancedBook) => book.id !== id)
    localStorage.setItem('library', JSON.stringify(updatedBooks))
    return true
  }
}