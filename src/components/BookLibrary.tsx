'use client'

import { useState, useEffect } from 'react'
import type { Book } from './ISBNScanner'
import { getBooks, updateBook, deleteBook as deleteBookAPI } from '@/lib/api'

const LOCATIONS = [
  'basement',
  "julie's room",
  "tim's room", 
  'bench',
  "julie's office",
  'little library'
]

export default function BookLibrary() {
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    const loadBooks = async () => {
      const savedBooks = await getBooks()
      setBooks(savedBooks)
      setFilteredBooks(savedBooks)
    }
    loadBooks()
  }, [])

  useEffect(() => {
    let filtered = books

    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.authors.some(author => 
          author.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        book.isbn.includes(searchTerm)
      )
    }

    if (locationFilter) {
      filtered = filtered.filter(book => book.location_name === locationFilter)
    }

    if (categoryFilter) {
      filtered = filtered.filter(book =>
        book.categories?.some(category =>
          category.toLowerCase().includes(categoryFilter.toLowerCase())
        )
      )
    }

    setFilteredBooks(filtered)
  }, [books, searchTerm, locationFilter, categoryFilter])

  const deleteBook = async (bookId: string) => {
    if (confirm('Are you sure you want to remove this book from your library?')) {
      const success = await deleteBookAPI(bookId)
      if (success) {
        const updatedBooks = books.filter(book => book.id !== bookId)
        setBooks(updatedBooks)
      }
    }
  }

  const updateBookLocation = async (bookId: string, newLocation: string) => {
    const success = await updateBook(bookId, { location_name: newLocation })
    if (success) {
      const updatedBooks = books.map(book =>
        book.id === bookId ? { ...book, location_name: newLocation } : book
      )
      setBooks(updatedBooks)
    }
  }

  const exportLibrary = () => {
    const dataStr = JSON.stringify(books, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'my-library.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const allCategories = Array.from(
    new Set(books.flatMap(book => book.categories || []))
  ).sort()

  const booksByLocation = LOCATIONS.reduce((acc, location) => {
    acc[location] = books.filter(book => book.location_name === location).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>📖 My Library ({books.length} books)</h2>
        <button className="btn" onClick={exportLibrary}>
          Export Library
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>📍 Books by Location</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
          {LOCATIONS.map(location => (
            <div key={location} style={{ 
              padding: '0.5rem', 
              background: '#f5f5f5', 
              borderRadius: '0.25rem',
              textAlign: 'center'
            }}>
              <strong>{booksByLocation[location]}</strong><br />
              <small>{location}</small>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '0.25rem'
          }}
        />
        
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ 
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '0.25rem'
          }}
        >
          <option value="">All locations</option>
          {LOCATIONS.map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ 
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '0.25rem'
          }}
        >
          <option value="">All categories</option>
          {allCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {filteredBooks.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          {books.length === 0 ? 'No books in your library yet. Start scanning!' : 'No books match your filters.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filteredBooks.map(book => (
            <div key={book.id} className="card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {book.thumbnail && (
                  <img 
                    src={book.thumbnail} 
                    alt={book.title}
                    style={{ width: '80px', height: 'auto', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>{book.title}</h4>
                  <p style={{ fontSize: '0.9em', color: '#666' }}>
                    {book.authors.join(', ')}
                  </p>
                  {book.publishedDate && (
                    <p style={{ fontSize: '0.8em', color: '#666' }}>
                      Published: {book.publishedDate}
                    </p>
                  )}
                  {book.categories && (
                    <p style={{ fontSize: '0.8em', color: '#666' }}>
                      {book.categories.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Location:</strong>
                  <select
                    value={book.location_name || ''}
                    onChange={(e) => updateBookLocation(book.id, e.target.value)}
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
                </div>
                
                {book.tags && book.tags.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Tags:</strong> {book.tags.join(', ')}
                  </div>
                )}
                
                <div style={{ fontSize: '0.8em', color: '#666' }}>
                  ISBN: {book.isbn}
                </div>
              </div>

              <button
                onClick={() => deleteBook(book.id)}
                style={{
                  marginTop: '0.5rem',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.8em',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}