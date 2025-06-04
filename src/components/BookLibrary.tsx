'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Book } from './ISBNScanner'
import { getBooks, updateBook, deleteBook as deleteBookAPI } from '@/lib/api'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

interface Shelf {
  id: number
  name: string
  location_id: number
  created_at: string
}

interface Location {
  id: number
  name: string
  description?: string
  owner_id: string
  created_at: string
}

export default function BookLibrary() {
  const { data: session } = useSession()
  const { modalState, confirmAsync, alert, closeModal } = useModal()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [shelfFilter, setShelfFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)

  useEffect(() => {
    if (session?.user) {
      loadUserData()
    }
  }, [session])

  const loadUserData = async () => {
    if (!session?.user?.email) return
    
    // Load user role
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.user_role || 'user')
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error)
      setUserRole('user')
    }

    // Load books
    const savedBooks = await getBooks()
    setBooks(savedBooks)
    setFilteredBooks(savedBooks)

    // Load shelves from user's location
    try {
      const response = await fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const locations = await response.json()
        if (locations.length > 0) {
          // Store the current location
          setCurrentLocation(locations[0])
          
          // Get shelves for the first location (user's assigned location)
          const shelvesResponse = await fetch(`${API_BASE}/api/locations/${locations[0].id}/shelves`, {
            headers: {
              'Authorization': `Bearer ${session.user.email}`,
              'Content-Type': 'application/json',
            },
          })
          if (shelvesResponse.ok) {
            const shelvesData = await shelvesResponse.json()
            setShelves(shelvesData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load shelves:', error)
    }
  }

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

    if (shelfFilter) {
      filtered = filtered.filter(book => book.shelf_name === shelfFilter)
    }

    if (categoryFilter) {
      filtered = filtered.filter(book =>
        book.categories?.some(category =>
          category.toLowerCase().includes(categoryFilter.toLowerCase())
        )
      )
    }

    setFilteredBooks(filtered)
  }, [books, searchTerm, shelfFilter, categoryFilter])

  const deleteBook = async (bookId: string, bookTitle: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Remove Book',
        message: `Are you sure you want to remove "${bookTitle}" from your library? This action cannot be undone.`,
        confirmText: 'Remove Book',
        variant: 'danger'
      },
      async () => {
        const success = await deleteBookAPI(bookId)
        if (success) {
          const updatedBooks = books.filter(book => book.id !== bookId)
          setBooks(updatedBooks)
          await alert({
            title: 'Book Removed',
            message: `"${bookTitle}" has been successfully removed from your library.`,
            variant: 'success'
          })
        } else {
          throw new Error('Failed to remove book')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Remove Failed',
        message: 'Failed to remove the book. Please try again.',
        variant: 'error'
      })
    }
  }

  const requestBookRemoval = async (bookId: string, bookTitle: string) => {
    if (!session?.user?.email) return

    // First, ask user to select a reason
    const reason = await selectRemovalReason()
    if (!reason) return // User cancelled reason selection

    const confirmed = await confirmAsync(
      {
        title: 'Request Book Removal',
        message: `Submit a request to remove "${bookTitle}" from the library?\n\nReason: ${reason.label}${reason.details ? `\nDetails: ${reason.details}` : ''}\n\nAn administrator will review your request.`,
        confirmText: 'Submit Request',
        variant: 'warning'
      },
      async () => {
        try {
          const response = await fetch(`${API_BASE}/api/book-removal-requests`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.user.email}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              book_id: parseInt(bookId),
              reason: reason.value,
              reason_details: reason.details || null
            })
          })

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch {
              // If JSON parsing fails, use the response text
              try {
                const errorText = await response.text()
                errorMessage = errorText || errorMessage
              } catch {
                // Fallback to status message
                errorMessage = `Request failed with status ${response.status}`
              }
            }
            throw new Error(errorMessage)
          }

          const result = await response.json()
          
          await alert({
            title: 'Removal Request Submitted',
            message: `Your request to remove "${bookTitle}" has been submitted to the administrator for review. Request ID: ${result.id}`,
            variant: 'success'
          })
        } catch (error) {
          console.error('Error submitting removal request:', error)
          await alert({
            title: 'Request Failed',
            message: error instanceof Error ? error.message : 'Failed to submit removal request. Please try again.',
            variant: 'error'
          })
        }
      }
    )

    if (!confirmed) {
      // User cancelled confirmation - no need to show additional alert
      return
    }
  }

  const selectRemovalReason = async (): Promise<{ value: string; label: string; details?: string } | null> => {
    return new Promise((resolve) => {
      const modal = document.createElement('div')
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `

      const modalContent = document.createElement('div')
      modalContent.style.cssText = `
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `

      modalContent.innerHTML = `
        <h3 style="margin: 0 0 1rem 0;">Select Removal Reason</h3>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem;">
            <input type="radio" name="reason" value="lost" style="margin-right: 0.5rem;">
            Book is lost
          </label>
          <label style="display: block; margin-bottom: 0.5rem;">
            <input type="radio" name="reason" value="damaged" style="margin-right: 0.5rem;">
            Book is damaged beyond repair
          </label>
          <label style="display: block; margin-bottom: 0.5rem;">
            <input type="radio" name="reason" value="missing" style="margin-right: 0.5rem;">
            Book is missing from its location
          </label>
          <label style="display: block; margin-bottom: 1rem;">
            <input type="radio" name="reason" value="other" style="margin-right: 0.5rem;">
            Other reason
          </label>
        </div>
        <div style="margin-bottom: 1rem;">
          <label for="details" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Additional Details (optional):
          </label>
          <textarea 
            id="details" 
            placeholder="Provide any additional information about the reason for removal..."
            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical; min-height: 60px;"
          ></textarea>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button id="cancel" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">
            Cancel
          </button>
          <button id="submit" style="padding: 0.5rem 1rem; border: none; background: #fd7e14; color: white; border-radius: 4px; cursor: pointer;">
            Continue
          </button>
        </div>
      `

      modal.appendChild(modalContent)
      document.body.appendChild(modal)

      const reasonLabels: Record<string, string> = {
        lost: 'Book is lost',
        damaged: 'Book is damaged beyond repair',
        missing: 'Book is missing from its location',
        other: 'Other reason'
      }

      const handleSubmit = () => {
        const selectedRadio = modalContent.querySelector('input[name="reason"]:checked') as HTMLInputElement
        const detailsTextarea = modalContent.querySelector('#details') as HTMLTextAreaElement
        
        if (!selectedRadio) {
          // Show inline validation message
          let errorMsg = modalContent.querySelector('.error-message') as HTMLDivElement
          if (!errorMsg) {
            errorMsg = document.createElement('div')
            errorMsg.className = 'error-message'
            errorMsg.style.cssText = 'color: #dc3545; font-size: 0.9em; margin-bottom: 1rem; text-align: center;'
            modalContent.insertBefore(errorMsg, modalContent.querySelector('div:last-child')!)
          }
          errorMsg.textContent = 'Please select a reason for removal.'
          return
        }

        const reason = selectedRadio.value
        const details = detailsTextarea.value.trim()

        document.body.removeChild(modal)
        resolve({
          value: reason,
          label: reasonLabels[reason],
          details: details || undefined
        })
      }

      const handleCancel = () => {
        document.body.removeChild(modal)
        resolve(null)
      }

      modalContent.querySelector('#submit')?.addEventListener('click', handleSubmit)
      modalContent.querySelector('#cancel')?.addEventListener('click', handleCancel)

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          handleCancel()
        }
      })
    })
  }

  const updateBookShelf = async (bookId: string, newShelfId: number) => {
    const success = await updateBook(bookId, { shelf_id: newShelfId })
    if (success) {
      const shelfName = shelves.find(s => s.id === newShelfId)?.name || ''
      const updatedBooks = books.map(book =>
        book.id === bookId ? { ...book, shelf_id: newShelfId, shelf_name: shelfName } : book
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

  const booksByShelf = shelves.reduce((acc: Record<string, number>, shelf) => {
    acc[shelf.name] = books.filter(book => book.shelf_name === shelf.name).length
    return acc
  }, {})

  const handleShelfTileClick = (shelfName: string) => {
    setShelfFilter(shelfFilter === shelfName ? '' : shelfName)
  }

  // Generate title based on user role and current shelf filter
  const getLibraryTitle = () => {
    if (userRole === 'admin') {
      return `📖 My Library (${books.length} books)`
    }
    
    if (!currentLocation) {
      return `📖 My Library (${books.length} books)`
    }
    
    if (shelves.length <= 1) {
      // Single shelf - show location and shelf name
      const shelfName = shelves[0]?.name || 'Main Library'
      return `📖 ${currentLocation.name}: ${shelfName} (${books.length} books)`
    }
    
    // Multiple shelves - show current filter or "All Shelves"
    if (shelfFilter) {
      return `📖 ${currentLocation.name}: ${shelfFilter} (${filteredBooks.length} books)`
    } else {
      return `📖 ${currentLocation.name}: All Shelves (${books.length} books)`
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{getLibraryTitle()}</h2>
        <button className="btn" onClick={exportLibrary}>
          Export Library
        </button>
      </div>

      {/* Shelf switcher for regular users with multiple shelves */}
      {userRole !== 'admin' && shelves.length > 1 && (
        <div style={{ marginBottom: '1rem' }}>
          <select
            value={shelfFilter}
            onChange={(e) => setShelfFilter(e.target.value)}
            style={{ 
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
              fontSize: '0.9rem'
            }}
          >
            <option value="">All Shelves</option>
            {shelves.map(shelf => (
              <option key={shelf.id} value={shelf.name}>{shelf.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Contextual help text based on user role and library state */}
      {books.length === 0 ? (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          background: '#e1f5fe', 
          border: '1px solid #b3e5fc', 
          borderRadius: '0.375rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0277bd' }}>Welcome to Your Library!</h3>
          <p style={{ margin: 0, color: '#0288d1' }}>
            Your library is empty. Head over to the <strong>ISBN Scanner</strong> to add your first book!
          </p>
        </div>
      ) : (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '0.75rem', 
          background: '#f8f9fa', 
          border: '1px solid #e9ecef', 
          borderRadius: '0.375rem',
          fontSize: '0.9em',
          color: '#495057'
        }}>
          {shelves.length <= 1 ? (
            <>
              📖 <strong>Your Library:</strong> Use search and category filters to find what you're looking for.{userRole !== 'admin' && ' Click "Request Removal" to submit requests to an administrator.'}
            </>
          ) : userRole === 'admin' ? (
            <>
              🔧 <strong>Admin View:</strong> You can see all {books.length} books across {shelves.length} shelves. Click shelf tiles or use filters to organize your view. You can permanently remove books from the library.
            </>
          ) : (
            <>
              📚 <strong>Your Collection:</strong> Browse your {books.length} books across {shelves.length} shelves. Click shelf tiles to filter, or use the search bar to find specific titles. Click "Request Removal" to submit requests to an administrator.
            </>
          )}
        </div>
      )}

      {shelves.length > 1 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>📚 My Shelves</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
            {shelves.map(shelf => (
              <div 
                key={shelf.id} 
                onClick={() => handleShelfTileClick(shelf.name)}
                style={{ 
                  padding: '0.5rem', 
                  background: shelfFilter === shelf.name ? '#007bff' : '#f5f5f5',
                  color: shelfFilter === shelf.name ? 'white' : 'black',
                  borderRadius: '0.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <strong>{booksByShelf[shelf.name] || 0}</strong><br />
                <small>{shelf.name}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: userRole === 'admin' ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
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
        
        {userRole === 'admin' && shelves.length > 1 && (
          <select
            value={shelfFilter}
            onChange={(e) => setShelfFilter(e.target.value)}
            style={{ 
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem'
            }}
          >
            <option value="">All shelves</option>
            {shelves.map(shelf => (
              <option key={shelf.id} value={shelf.name}>{shelf.name}</option>
            ))}
          </select>
        )}

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
                {/* Only show shelf info if multiple shelves available */}
                {shelves.length > 1 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Shelf:</strong>
                    <select
                      value={book.shelf_id || ''}
                      onChange={(e) => updateBookShelf(book.id, parseInt(e.target.value))}
                      style={{ 
                        marginLeft: '0.5rem',
                        padding: '0.25rem',
                        border: '1px solid #ccc',
                        borderRadius: '0.25rem'
                      }}
                    >
                      <option value="">Select shelf...</option>
                      {shelves.map(shelf => (
                        <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
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
                onClick={() => userRole === 'admin' ? deleteBook(book.id, book.title) : requestBookRemoval(book.id, book.title)}
                style={{
                  marginTop: '0.5rem',
                  background: userRole === 'admin' ? '#dc3545' : '#fd7e14',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.8em',
                  cursor: 'pointer'
                }}
              >
                {userRole === 'admin' ? 'Remove' : 'Request Removal'}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Bootstrap Modal Components */}
      {modalState.type === 'confirm' && (
        <ConfirmationModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onConfirm={modalState.onConfirm!}
          title={modalState.options.title}
          message={modalState.options.message}
          confirmText={modalState.options.confirmText}
          cancelText={modalState.options.cancelText}
          variant={modalState.options.variant}
          loading={modalState.loading}
        />
      )}
      
      {modalState.type === 'alert' && (
        <AlertModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.options.title}
          message={modalState.options.message}
          variant={modalState.options.variant}
          buttonText={modalState.options.buttonText}
        />
      )}
    </div>
  )
}