'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material'
import {
  Refresh,
  CheckCircle,
  Cancel,
  Schedule,
  Inbox,
} from '@mui/icons-material'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'

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

  const getStatusChip = (status: string) => {
    const statusConfig = {
      pending: { color: 'warning' as const, label: 'Pending' },
      approved: { color: 'success' as const, label: 'Approved' },
      denied: { color: 'error' as const, label: 'Denied' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default' as const, label: status }
    
    return (
      <Chip 
        label={config.label}
        color={config.color}
        size="small"
        variant="filled"
      />
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
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            📋 Requests
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography color="text.secondary">
              Loading removal requests...
            </Typography>
          </Box>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2">
            📋  Requests ({filteredRequests.length})
          </Typography>
          <Button 
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadRequests}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {/* Filter tabs */}
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={filter} 
            onChange={(_, value) => setFilter(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              value="pending" 
              label={`Pending (${requests.filter(r => r.status === 'pending').length})`}
              icon={<Schedule />}
              iconPosition="start"
            />
            <Tab 
              value="all" 
              label={`All (${requests.length})`}
              icon={<Inbox />}
              iconPosition="start"
            />
            <Tab 
              value="approved" 
              label={`Approved (${requests.filter(r => r.status === 'approved').length})`}
              icon={<CheckCircle />}
              iconPosition="start"
            />
            <Tab 
              value="denied" 
              label={`Denied (${requests.filter(r => r.status === 'denied').length})`}
              icon={<Cancel />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {filteredRequests.length === 0 ? (
          <Paper 
            variant="outlined" 
            sx={{ 
              textAlign: 'center', 
              py: 4
            }}
          >
            <Typography sx={{ fontSize: '2rem', mb: 1 }}>📭</Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {filter === 'pending' ? 'No Pending Requests' : `No ${filter === 'all' ? '' : filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
            </Typography>
            <Typography color="text.secondary">
              {filter === 'pending' 
                ? 'All removal requests have been processed.'
                : filter === 'all'
                ? 'No removal requests have been submitted yet.'
                : `No ${filter} removal requests found.`
              }
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredRequests.map(request => (
              <Card 
                key={request.id} 
                variant="outlined"
                sx={{ 
                  border: request.status === 'pending' ? '2px solid' : '1px solid',
                  borderColor: request.status === 'pending' ? 'warning.main' : 'divider'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" component="h3">
                          {request.book_title}
                        </Typography>
                        {getStatusChip(request.status)}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        by {request.book_authors.join(', ')} • ISBN: {request.book_isbn}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📍 Location: {request.location_name}
                      </Typography>
                    </Box>
                    
                    {request.status === 'pending' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => approveRequest(request.id, request.book_title)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() => denyRequest(request.id, request.book_title)}
                        >
                          Deny
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2
                    }}
                  >
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Requested by:</strong>
                        </Typography>
                        <Typography variant="body2">
                          {request.requester_name} ({request.requester_email})
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Reason:</strong>
                        </Typography>
                        <Typography variant="body2">
                          {getReasonLabel(request.reason)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Submitted:</strong>
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(request.created_at)}
                        </Typography>
                      </Box>
                      {request.reviewed_at && (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Reviewed:</strong>
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(request.reviewed_at)} by {request.reviewer_name}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {request.reason_details && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Details:</strong>
                        </Typography>
                        <Typography variant="body2" fontStyle="italic">
                          "{request.reason_details}"
                        </Typography>
                      </Box>
                    )}
                    
                    {request.review_comment && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Admin Comment:</strong>
                        </Typography>
                        <Typography variant="body2" fontStyle="italic">
                          "{request.review_comment}"
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </CardContent>
              </Card>
            ))}
          </Box>
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
      </Paper>
    </Container>
  )
}