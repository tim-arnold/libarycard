'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material'
import {
  Check,
  Close,
  Refresh,
  PersonAdd,
  Schedule,
  CheckCircle,
  Cancel,
} from '@mui/icons-material'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

interface SignupRequest {
  id: number
  email: string
  first_name: string
  last_name?: string
  status: 'pending' | 'approved' | 'denied'
  requested_at: string
  reviewed_by?: string
  reviewed_at?: string
  review_comment?: string
}

export default function AdminSignupManager() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<SignupRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<number | null>(null)
  
  // Review dialog state
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewRequest, setReviewRequest] = useState<SignupRequest | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny' | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    if (session?.user?.email) {
      loadRequests()
    }
  }, [session])

  const loadRequests = async () => {
    if (!session?.user?.email) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/signup-requests`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRequests(data)
        setError('')
      } else if (response.status === 403) {
        setError('Admin privileges required')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load signup requests')
      }
    } catch (error) {
      console.error('Error loading signup requests:', error)
      setError('Failed to load signup requests')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewRequest = (request: SignupRequest, action: 'approve' | 'deny') => {
    setReviewRequest(request)
    setReviewAction(action)
    setReviewComment('')
    setShowReviewDialog(true)
  }

  const submitReview = async () => {
    if (!reviewRequest || !reviewAction || !session?.user?.email) return

    try {
      setProcessingId(reviewRequest.id)
      const endpoint = reviewAction === 'approve' 
        ? `${API_BASE}/api/signup-requests/${reviewRequest.id}/approve`
        : `${API_BASE}/api/signup-requests/${reviewRequest.id}/deny`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: reviewComment.trim() || undefined
        })
      })

      if (response.ok) {
        await loadRequests() // Refresh the list
        setShowReviewDialog(false)
        setReviewRequest(null)
        setReviewAction(null)
        setReviewComment('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to ${reviewAction} signup request`)
      }
    } catch (error) {
      console.error(`Error ${reviewAction}ing signup request:`, error)
      setError(`Failed to ${reviewAction} signup request`)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'approved': return 'success'
      case 'denied': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Schedule />
      case 'approved': return <CheckCircle />
      case 'denied': return <Cancel />
      default: return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography color="text.secondary">
          Loading signup requests...
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          👤 Signup Request Management
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" gutterBottom>
              {pendingRequests.length}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Pending Requests
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" gutterBottom>
              {requests.filter(r => r.status === 'approved').length}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Approved
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="error.main" gutterBottom>
              {requests.filter(r => r.status === 'denied').length}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Denied
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd color="warning" />
            Pending Review ({pendingRequests.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Requested</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.first_name}{request.last_name ? ` ${request.last_name}` : ''}
                    </TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>{formatDate(request.requested_at)}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<Check />}
                          onClick={() => handleReviewRequest(request, 'approve')}
                          disabled={processingId === request.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<Close />}
                          onClick={() => handleReviewRequest(request, 'deny')}
                          disabled={processingId === request.id}
                        >
                          Deny
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* No Pending Requests */}
      {pendingRequests.length === 0 && (
        <Alert severity="info" sx={{ mb: 4 }}>
          No pending signup requests. All new signup requests will appear here for review.
        </Alert>
      )}

      {/* Processed Requests Section */}
      {processedRequests.length > 0 && (
        <Box>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            📋 Request History ({processedRequests.length})
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Reviewed</strong></TableCell>
                  <TableCell><strong>Comment</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {request.first_name}{request.last_name ? ` ${request.last_name}` : ''}
                    </TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>
                      <Chip
                        {...(getStatusIcon(request.status) && { icon: getStatusIcon(request.status)! })}
                        label={request.status}
                        color={getStatusColor(request.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {request.reviewed_at ? formatDate(request.reviewed_at) : '-'}
                    </TableCell>
                    <TableCell>
                      {request.review_comment || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onClose={() => setShowReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewAction === 'approve' ? '✅ Approve Signup Request' : '❌ Deny Signup Request'}
        </DialogTitle>
        <DialogContent>
          {reviewRequest && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Name:</strong> {reviewRequest.first_name}{reviewRequest.last_name ? ` ${reviewRequest.last_name}` : ''}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Email:</strong> {reviewRequest.email}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Requested:</strong> {formatDate(reviewRequest.requested_at)}
              </Typography>
            </Box>
          )}
          
          <TextField
            label={reviewAction === 'approve' ? 'Approval Message (Optional)' : 'Reason for Denial (Optional)'}
            multiline
            rows={3}
            fullWidth
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder={
              reviewAction === 'approve' 
                ? 'Welcome to LibaryCard! You can now start managing your book collection.'
                : 'Please provide a brief reason for denying this request...'
            }
            sx={{ mt: 2 }}
          />
          
          {reviewAction === 'approve' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              The user will receive an email with account creation confirmation and email verification instructions.
            </Alert>
          )}
          
          {reviewAction === 'deny' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              The user will receive an email notification that their signup request was denied.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReviewDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={submitReview}
            variant="contained"
            color={reviewAction === 'approve' ? 'success' : 'error'}
            disabled={processingId !== null}
            startIcon={processingId !== null ? <CircularProgress size={16} /> : (reviewAction === 'approve' ? <Check /> : <Close />)}
          >
            {processingId !== null ? 'Processing...' : (reviewAction === 'approve' ? 'Approve Request' : 'Deny Request')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}