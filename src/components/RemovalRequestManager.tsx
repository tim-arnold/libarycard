'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

interface BookRemovalRequest {
  id: number
  book_id: number
  book_title: string
  book_authors: string[]
  book_isbn: string
  location_name: string
  requester_id: string
  requester_name: string
  requester_email: string
  reason: string
  reason_details?: string
  status: 'pending' | 'approved' | 'denied'
  reviewed_by?: string
  reviewer_name?: string
  review_comment?: string
  created_at: string
  reviewed_at?: string
}

export default function RemovalRequestManager() {
  const { data: session } = useSession()
  const { modalState, confirmAsync, alert, closeModal } = useModal()
  const [requests, setRequests] = useState<BookRemovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending')

  useEffect(() => {
    if (session?.user?.email) {
      loadRequests()
    }
  }, [session])

  const loadRequests = async () => {
    if (!session?.user?.email) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/book-removal-requests`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      } else {
        console.error('Failed to load removal requests')
      }
    } catch (error) {
      console.error('Error loading removal requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveRequest = async (requestId: number, bookTitle: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Approve Removal Request',
        message: `Are you sure you want to approve the removal of "${bookTitle}"? This will permanently delete the book from the library and cannot be undone.`,
        confirmText: 'Approve & Delete Book',
        variant: 'danger'
      },
      async () => {
        const response = await fetch(`${API_BASE}/api/book-removal-requests/${requestId}/approve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          await loadRequests() // Refresh the list
          await alert({
            title: 'Request Approved',
            message: `The removal request for "${bookTitle}" has been approved and the book has been deleted from the library.`,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to approve request')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Approval Failed',
        message: 'Failed to approve the removal request. Please try again.',
        variant: 'error'
      })
    }
  }

  const denyRequest = async (requestId: number, bookTitle: string) => {
    // First, ask for an optional comment
    const comment = await getDenialComment()
    if (comment === null) return // User cancelled

    const confirmed = await confirmAsync(
      {
        title: 'Deny Removal Request',
        message: `Deny the removal request for "${bookTitle}"? The book will remain in the library.${comment ? `\n\nComment: ${comment}` : ''}`,
        confirmText: 'Deny Request',
        variant: 'warning'
      },
      async () => {
        const response = await fetch(`${API_BASE}/api/book-removal-requests/${requestId}/deny`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            review_comment: comment || null
          })
        })

        if (response.ok) {
          await loadRequests() // Refresh the list
          await alert({
            title: 'Request Denied',
            message: `The removal request for "${bookTitle}" has been denied. The book remains in the library.`,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to deny request')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Denial Failed',
        message: 'Failed to deny the removal request. Please try again.',
        variant: 'error'
      })
    }
  }

  const getDenialComment = async (): Promise<string | null> => {
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
        max-width: 500px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `

      modalContent.innerHTML = `
        <h3 style="margin: 0 0 1rem 0;">Add Comment (Optional)</h3>
        <div style="margin-bottom: 1rem;">
          <label for="comment" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Reason for denial:
          </label>
          <textarea 
            id="comment" 
            placeholder="Explain why this request is being denied (optional)..."
            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical; min-height: 80px;"
          ></textarea>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button id="cancel" style="padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">
            Cancel
          </button>
          <button id="submit" style="padding: 0.5rem 1rem; border: none; background: #ffc107; color: #212529; border-radius: 4px; cursor: pointer;">
            Continue
          </button>
        </div>
      `

      modal.appendChild(modalContent)
      document.body.appendChild(modal)

      const handleSubmit = () => {
        const commentTextarea = modalContent.querySelector('#comment') as HTMLTextAreaElement
        const comment = commentTextarea.value.trim()

        document.body.removeChild(modal)
        resolve(comment || '')
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

      // Focus the textarea
      setTimeout(() => {
        const textarea = modalContent.querySelector('#comment') as HTMLTextAreaElement
        textarea?.focus()
      }, 100)
    })
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    return request.status === filter
  })

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' },
      approved: { background: '#d1edff', color: '#0c5460', border: '1px solid #b3e5fc' },
      denied: { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }
    }
    
    return (
      <span style={{
        ...styles[status as keyof typeof styles],
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.8em',
        fontWeight: 'bold',
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      lost: 'Book is lost',
      damaged: 'Book is damaged beyond repair',
      missing: 'Book is missing from its location',
      other: 'Other reason'
    }
    return labels[reason] || reason
  }

  if (loading) {
    return (
      <div className="card">
        <h2>📋 Book Removal Requests</h2>
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          Loading removal requests...
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>📋 Book Removal Requests ({filteredRequests.length})</h2>
        <button 
          onClick={loadRequests}
          className="btn"
          style={{ fontSize: '0.9em' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #ddd' }}>
          {[
            { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
            { key: 'all', label: 'All', count: requests.length },
            { key: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
            { key: 'denied', label: 'Denied', count: requests.filter(r => r.status === 'denied').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: filter === tab.key ? '#007bff' : 'transparent',
                color: filter === tab.key ? 'white' : '#007bff',
                borderBottom: filter === tab.key ? '2px solid #007bff' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.9em'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          color: '#666', 
          padding: '2rem',
          background: '#f8f9fa',
          borderRadius: '0.375rem',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>
            {filter === 'pending' ? 'No Pending Requests' : `No ${filter === 'all' ? '' : filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
          </h3>
          <p style={{ margin: 0 }}>
            {filter === 'pending' 
              ? 'All removal requests have been processed.'
              : filter === 'all'
              ? 'No removal requests have been submitted yet.'
              : `No ${filter} removal requests found.`
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRequests.map(request => (
            <div 
              key={request.id} 
              className="card" 
              style={{ 
                margin: 0,
                border: request.status === 'pending' ? '2px solid #ffc107' : '1px solid #ddd'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{request.book_title}</h4>
                    {getStatusBadge(request.status)}
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9em', color: '#666' }}>
                    by {request.book_authors.join(', ')} • ISBN: {request.book_isbn}
                  </p>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9em', color: '#666' }}>
                    📍 Location: {request.location_name}
                  </p>
                </div>
                
                {request.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => approveRequest(request.id, request.book_title)}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.85em',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => denyRequest(request.id, request.book_title)}
                      style={{
                        background: '#ffc107',
                        color: '#212529',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.85em',
                        cursor: 'pointer'
                      }}
                    >
                      ✗ Deny
                    </button>
                  </div>
                )}
              </div>

              <div style={{ 
                padding: '1rem', 
                background: '#f8f9fa', 
                borderRadius: '0.375rem',
                fontSize: '0.9em'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <strong>Requested by:</strong><br />
                    {request.requester_name} ({request.requester_email})
                  </div>
                  <div>
                    <strong>Reason:</strong><br />
                    {getReasonLabel(request.reason)}
                  </div>
                  <div>
                    <strong>Submitted:</strong><br />
                    {formatDate(request.created_at)}
                  </div>
                  {request.reviewed_at && (
                    <div>
                      <strong>Reviewed:</strong><br />
                      {formatDate(request.reviewed_at)} by {request.reviewer_name}
                    </div>
                  )}
                </div>
                
                {request.reason_details && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong>Details:</strong><br />
                    <em>"{request.reason_details}"</em>
                  </div>
                )}
                
                {request.review_comment && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong>Admin Comment:</strong><br />
                    <em>"{request.review_comment}"</em>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal Components */}
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