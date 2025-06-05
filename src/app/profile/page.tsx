'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import {
  ArrowBack,
  Save,
  Person,
  LocationOn,
  ExitToApp,
  History,
  Book,
} from '@mui/icons-material'
import ConfirmationModal from '@/components/ConfirmationModal'
import AlertModal from '@/components/AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'

interface ProfileData {
  id: string
  email: string
  first_name: string
  last_name: string
  auth_provider: string
}

interface Location {
  id: number
  name: string
  description?: string
  owner_id: string
  created_at: string
}

interface CheckoutHistoryItem {
  id: number
  book_id: number
  user_id: string
  action: string // 'checkout' or 'return'
  action_date: string
  due_date: string | null
  notes: string | null
  created_at: string
  book_title: string
  book_authors: string[] // JSON parsed array
  book_isbn: string
  location_name: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { modalState, confirmAsync, alert, closeModal } = useModal()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [checkoutHistory, setCheckoutHistory] = useState<CheckoutHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchProfile()
      fetchLocations()
      fetchCheckoutHistory()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
        setFormData({
          email: profileData.email || '',
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || ''
        })
      } else {
        setError('Failed to load profile data')
      }
    } catch (err) {
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      if (!session?.user?.email) return
      
      const response = await fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const locationsData = await response.json()
        setLocations(locationsData)
      }
    } catch (err) {
      console.error('Failed to load locations:', err)
    }
  }

  const fetchCheckoutHistory = async () => {
    try {
      setHistoryLoading(true)
      if (!session?.user?.email) return
      
      const response = await fetch('/api/checkout-history', {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const historyData = await response.json()
        setCheckoutHistory(historyData)
      }
    } catch (err) {
      console.error('Failed to load checkout history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const leaveLocation = async (locationId: number, locationName: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Leave Location',
        message: `Are you sure you want to leave "${locationName}"? This will remove all your books from this location and cannot be undone.`,
        confirmText: 'Leave Location',
        variant: 'danger'
      },
      async () => {
        const response = await fetch(`${API_BASE}/api/locations/${locationId}/leave`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          await fetchLocations() // Refresh locations list
          await alert({
            title: 'Left Location',
            message: `Successfully left "${locationName}". Your books from this location have been removed.`,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to leave "${locationName}"`)
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Leave Failed',
        message: 'Failed to leave the location. Please try again.',
        variant: 'error'
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name
      }

      // Only include email for email/password users
      if (profile?.auth_provider === 'email') {
        updateData.email = formData.email
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        fetchProfile() // Refresh profile data
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button 
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => router.push('/')}
          >
            Back to App
          </Button>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person /> Edit Profile
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Signed in with {profile.auth_provider === 'google' ? 'Google' : 'Email/Password'}
          </Typography>
        </Alert>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <TextField
            fullWidth
            type="email"
            label="Email Address"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={profile.auth_provider === 'google'}
            required
            helperText={profile.auth_provider === 'google' ? 'Email cannot be changed for Google accounts' : ''}
            variant="outlined"
          />

          <TextField
            fullWidth
            type="text"
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            required
            variant="outlined"
          />

          <TextField
            fullWidth
            type="text"
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            variant="outlined"
          />

          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
            sx={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOn /> Library Locations
        </Typography>
        
        {locations.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
            <Typography color="text.secondary">
              You don't have access to any library locations yet. Contact an administrator to get invited.
            </Typography>
          </Paper>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You have access to {locations.length} library location{locations.length > 1 ? 's' : ''}. 
              You can leave locations you no longer need access to.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {locations.map(location => (
                <Card key={location.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" component="h4">
                          {location.name}
                        </Typography>
                        {location.description && (
                          <Typography variant="body2" color="text.secondary">
                            {location.description}
                          </Typography>
                        )}
                      </Box>
                      
                      {locations.length > 1 && (
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<ExitToApp />}
                          onClick={() => leaveLocation(location.id, location.name)}
                        >
                          Leave Location
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
            
            {locations.length === 1 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  You can't leave your last location. You need access to at least one library.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <History /> Checkout History
        </Typography>
        
        {historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, p: 3 }}>
            <CircularProgress size={20} />
            <Typography>Loading checkout history...</Typography>
          </Box>
        ) : checkoutHistory.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
            <Typography color="text.secondary">
              No checkout history yet. Check out a book to see your reading activity here.
            </Typography>
          </Paper>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your recent book checkout and return activity ({checkoutHistory.length} record{checkoutHistory.length > 1 ? 's' : ''}).
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {checkoutHistory.slice(0, 10).map(item => (
                <Card key={item.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Book fontSize="small" />
                          {item.book_title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          by {Array.isArray(item.book_authors) ? item.book_authors.join(', ') : item.book_authors}
                        </Typography>
                        {item.notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                            {item.notes}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ textAlign: 'right', ml: 2 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: item.action === 'checkout' ? 'success.main' : 'info.main',
                            fontWeight: 500,
                            textTransform: 'capitalize'
                          }}
                        >
                          {item.action === 'checkout' ? 'Checked Out' : 'Returned'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.action_date).toLocaleDateString()}
                        </Typography>
                        {item.due_date && item.action === 'checkout' && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
            
            {checkoutHistory.length > 10 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Showing most recent 10 entries. You have {checkoutHistory.length - 10} more entries in your history.
                </Typography>
              </Alert>
            )}
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