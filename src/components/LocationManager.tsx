'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Email,
  Shelves,
  PersonAdd,
  Cancel,
  Save,
} from '@mui/icons-material'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

interface Location {
  id: number
  name: string
  description?: string
  owner_id: string
  created_at: string
}

interface Shelf {
  id: number
  name: string
  location_id: number
  created_at: string
}

interface LocationInvitation {
  id: number
  location_id: number
  invited_email: string
  invitation_token: string
  invited_by: string
  expires_at: string
  used_at?: string
  created_at: string
  invited_by_name?: string
}


export default function LocationManager() {
  const { data: session } = useSession()
  const { modalState, confirmAsync, alert, closeModal } = useModal()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationDescription, setNewLocationDescription] = useState('')
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null)
  const [showShelfForm, setShowShelfForm] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<LocationInvitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInvitations, setShowInvitations] = useState(false)

  useEffect(() => {
    if (session?.user) {
      loadLocations()
      loadUserRole()
    }
  }, [session])

  const loadUserRole = async () => {
    if (!session?.user?.email) return
    
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
  }

  const loadLocations = async () => {
    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
        if (data.length === 0 && userRole === 'admin') {
          setShowCreateForm(true)
        } else {
          setSelectedLocation(data[0])
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load locations')
      }
    } catch (error) {
      setError('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const loadShelves = async (locationId: number) => {
    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations/${locationId}/shelves`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setShelves(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load shelves')
      }
    } catch (error) {
      setError('Failed to load shelves')
    }
  }

  useEffect(() => {
    if (selectedLocation) {
      loadShelves(selectedLocation.id)
    }
  }, [selectedLocation])

  const createLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLocationName.trim()) return

    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLocationName.trim(),
          description: newLocationDescription.trim() || null,
        }),
      })

      if (response.ok) {
        const newLocation = await response.json()
        setLocations([...locations, newLocation])
        setSelectedLocation(newLocation)
        setNewLocationName('')
        setNewLocationDescription('')
        setShowCreateForm(false)
        // The API will create default shelves, so reload them
        await loadShelves(newLocation.id)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create location')
      }
    } catch (error) {
      setError('Failed to create location')
    }
  }

  const updateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLocation || !newLocationName.trim()) return

    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLocationName.trim(),
          description: newLocationDescription.trim() || null,
        }),
      })

      if (response.ok) {
        const updatedLocation = await response.json()
        setLocations(locations.map(loc => 
          loc.id === editingLocation.id ? updatedLocation : loc
        ))
        if (selectedLocation?.id === editingLocation.id) {
          setSelectedLocation(updatedLocation)
        }
        setEditingLocation(null)
        setNewLocationName('')
        setNewLocationDescription('')
        setShowCreateForm(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update location')
      }
    } catch (error) {
      setError('Failed to update location')
    }
  }

  const deleteLocation = async (locationId: number, locationName: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Delete Location',
        message: `Are you sure you want to delete "${locationName}"? This will permanently delete all shelves and books in this location. This action cannot be undone.`,
        confirmText: 'Delete Location',
        variant: 'danger'
      },
      async () => {
        if (!session?.user?.email) throw new Error('Not authenticated')
        
        const response = await fetch(`${API_BASE}/api/locations/${locationId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.user.email}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const updatedLocations = locations.filter(loc => loc.id !== locationId)
          setLocations(updatedLocations)
          if (selectedLocation?.id === locationId) {
            setSelectedLocation(updatedLocations[0] || null)
            setShelves([])
          }
          await alert({
            title: 'Location Deleted',
            message: `"${locationName}" and all its contents have been successfully deleted.`,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete location')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Delete Failed',
        message: 'Failed to delete the location. Please try again.',
        variant: 'error'
      })
    }
  }

  const startEditLocation = (location: Location) => {
    setEditingLocation(location)
    setNewLocationName(location.name)
    setNewLocationDescription(location.description || '')
    setShowCreateForm(true)
  }

  // Shelf management functions
  const createShelf = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation || !newShelfName.trim()) return

    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations/${selectedLocation.id}/shelves`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newShelfName.trim(),
        }),
      })

      if (response.ok) {
        const newShelf = await response.json()
        setShelves([...shelves, newShelf])
        setNewShelfName('')
        setShowShelfForm(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create shelf')
      }
    } catch (error) {
      setError('Failed to create shelf')
    }
  }

  const updateShelf = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation || !editingShelf || !newShelfName.trim()) return

    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/shelves/${editingShelf.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newShelfName.trim(),
        }),
      })

      if (response.ok) {
        const updatedShelf = await response.json()
        setShelves(shelves.map(shelf => 
          shelf.id === editingShelf.id ? updatedShelf : shelf
        ))
        setEditingShelf(null)
        setNewShelfName('')
        setShowShelfForm(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update shelf')
      }
    } catch (error) {
      setError('Failed to update shelf')
    }
  }

  const deleteShelf = async (shelfId: number, shelfName: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Delete Shelf',
        message: `Are you sure you want to delete "${shelfName}"? If this shelf contains books, you'll need to move them first or choose to delete them as well.`,
        confirmText: 'Delete Shelf',
        variant: 'danger'
      },
      async () => {
        if (!selectedLocation || !session?.user?.email) throw new Error('Invalid state')
        
        const response = await fetch(`${API_BASE}/api/shelves/${shelfId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.user.email}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

        if (response.ok) {
          setShelves(shelves.filter(shelf => shelf.id !== shelfId))
          await alert({
            title: 'Shelf Deleted',
            message: `"${shelfName}" has been successfully deleted.`,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          
          // Handle special case where shelf contains books
          if (errorData.error && (errorData.error.includes('contains books') || errorData.bookCount > 0)) {
            await alert({
              title: 'Cannot Delete Shelf',
              message: errorData.warningMessage || errorData.error,
              variant: 'warning'
            })
            return
          }
          
          throw new Error(errorData.error || 'Failed to delete shelf')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Delete Failed',
        message: 'Failed to delete the shelf. Please try again.',
        variant: 'error'
      })
    }
  }

  const startEditShelf = (shelf: Shelf) => {
    setEditingShelf(shelf)
    setNewShelfName(shelf.name)
    setShowShelfForm(true)
  }

  // Invitation management functions
  const loadLocationInvitations = async (locationId: number) => {
    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations/${locationId}/invitations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load invitations')
      }
    } catch (error) {
      setError('Failed to load invitations')
    }
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation || !inviteEmail.trim()) return

    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations/${selectedLocation.id}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invited_email: inviteEmail.trim(),
        }),
      })

      if (response.ok) {
        const newInvitation = await response.json()
        setInvitations([...invitations, newInvitation])
        setInviteEmail('')
        setShowInviteForm(false)
        setError('')
        // Show success message temporarily
        setError('✅ Invitation sent successfully!')
        setTimeout(() => setError(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send invitation')
      }
    } catch (error) {
      setError('Failed to send invitation')
    }
  }

  const revokeInvitation = async (invitationId: number, invitedEmail: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Revoke Invitation',
        message: `Are you sure you want to revoke the invitation for ${invitedEmail}? This action cannot be undone and they will no longer be able to use their invitation link.`,
        confirmText: 'Revoke Invitation',
        variant: 'warning'
      },
      async () => {
        if (!session?.user?.email) throw new Error('Not authenticated')
        
        const response = await fetch(`${API_BASE}/api/invitations/${invitationId}/revoke`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.user.email}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          // Remove the revoked invitation from the list
          setInvitations(invitations.filter(inv => inv.id !== invitationId))
          setError('')
          await alert({
            title: 'Invitation Revoked',
            message: `Invitation for ${invitedEmail} has been successfully revoked.`,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to revoke invitation')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Revoke Failed',
        message: 'Failed to revoke the invitation. Please try again.',
        variant: 'error'
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            🏠 Locations
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography color="text.secondary">
              Loading locations...
            </Typography>
          </Box>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          🏠 Locations
        </Typography>
        
        {error && (
          <Alert 
            severity={error.startsWith('✅') ? 'success' : 'error'} 
            sx={{ mb: 2 }}
            onClose={() => setError('')}
          >
            {error.replace('✅ ', '')}
          </Alert>
        )}

      {locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            {userRole === 'admin' 
              ? "You don't have any locations yet. Create your first location to start organizing your books!"
              : "No locations are available. Contact an administrator to create locations."
            }
          </p>
          {userRole === 'admin' && (
            <Button 
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowCreateForm(true)}
            >
              Create Your First Location
            </Button>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Your Locations</h3>
              {userRole === 'admin' && (
                <Button 
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowCreateForm(true)}
                  size="small"
                >
                  Add Location
                </Button>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {locations.map(location => (
                <div 
                  key={location.id}
                  style={{
                    padding: '1rem',
                    border: selectedLocation?.id === location.id ? '2px solid #0070f3' : '1px solid #e0e0e0',
                    borderRadius: '0.5rem',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <div onClick={() => setSelectedLocation(location)} style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{location.name}</h4>
                    {location.description && (
                      <p style={{ fontSize: '0.9em', color: '#666', margin: 0 }}>{location.description}</p>
                    )}
                  </div>
                  {userRole === 'admin' && (
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditLocation(location)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<Delete />}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteLocation(location.id, location.name)
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedLocation && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Shelves in {selectedLocation.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {userRole === 'admin' && (
                    <>
                      <Button 
                        variant="contained"
                        color="success"
                        startIcon={<Email />}
                        onClick={() => {
                          setShowInvitations(!showInvitations)
                          if (!showInvitations) {
                            loadLocationInvitations(selectedLocation.id)
                          }
                        }}
                        size="small"
                      >
                        Invitations
                      </Button>
                      <Button 
                        variant="contained"
                        startIcon={<Shelves />}
                        onClick={() => setShowShelfForm(true)}
                        size="small"
                      >
                        Add Shelf
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                {shelves.map(shelf => (
                  <Paper key={shelf.id} sx={{ 
                    p: 1.5,
                    borderRadius: 1,
                    position: 'relative',
                    backgroundColor: '#2e2e2e' // Same as book cards for consistency
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                      <strong>{shelf.name}</strong>
                    </div>
                    {userRole === 'admin' && (
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => startEditShelf(shelf)}
                          sx={{ 
                            p: 0.5,
                            backgroundColor: 'action.hover',
                            '&:hover': { backgroundColor: 'action.selected' }
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => deleteShelf(shelf.id, shelf.name)}
                          sx={{ 
                            p: 0.5,
                            backgroundColor: 'error.main',
                            color: 'white',
                            '&:hover': { backgroundColor: 'error.dark' }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Paper>
                ))}
              </div>

              {/* Invitations Section */}
              {showInvitations && userRole === 'admin' && (
                <div style={{ marginTop: '2rem', border: '1px solid #e0e0e0', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>📧 Location Invitations</h4>
                    <Button 
                      variant="contained"
                      startIcon={<PersonAdd />}
                      onClick={() => setShowInviteForm(true)}
                      size="small"
                    >
                      Send Invitation
                    </Button>
                  </div>
                  
                  {invitations.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', margin: '1rem 0' }}>
                      No invitations sent yet. Click "Send Invitation" to invite users to this location.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {invitations.map(invitation => (
                        <Paper key={invitation.id} sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 1,
                          borderLeft: `4px solid ${invitation.used_at ? '#28a745' : '#ffc107'}`
                        }}>
                          <div>
                            <strong>{invitation.invited_email}</strong>
                            <div style={{ fontSize: '0.8em', color: '#666' }}>
                              Sent: {formatDate(invitation.created_at)} | 
                              Expires: {formatDate(invitation.expires_at)}
                              {invitation.used_at && (
                                <span style={{ color: '#28a745' }}> | ✅ Accepted</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              fontSize: '0.8em', 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '0.25rem',
                              background: invitation.used_at ? '#d4edda' : '#fff3cd',
                              color: invitation.used_at ? '#155724' : '#856404'
                            }}>
                              {invitation.used_at ? 'Accepted' : 'Pending'}
                            </div>
                            {!invitation.used_at && (
                              <Button
                                variant="contained"
                                color="error"
                                size="small"
                                startIcon={<Cancel />}
                                onClick={() => revokeInvitation(invitation.id, invitation.invited_email)}
                                title="Revoke this invitation"
                                sx={{ fontSize: '0.7em' }}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </Paper>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog 
        open={showCreateForm} 
        onClose={() => {
          setShowCreateForm(false)
          setEditingLocation(null)
          setNewLocationName('')
          setNewLocationDescription('')
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingLocation ? 'Edit Location' : 'Create New Location'}
        </DialogTitle>
        <form onSubmit={editingLocation ? updateLocation : createLocation}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                autoFocus
                label="Location Name"
                type="text"
                fullWidth
                required
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g., Finsbury Road, Main Office"
              />
              
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={newLocationDescription}
                onChange={(e) => setNewLocationDescription(e.target.value)}
                placeholder="Brief description of this location"
                helperText="Optional"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setShowCreateForm(false)
                setEditingLocation(null)
                setNewLocationName('')
                setNewLocationDescription('')
              }}
              startIcon={<Cancel />}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              startIcon={<Save />}
            >
              {editingLocation ? 'Update Location' : 'Create Location'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={showShelfForm} 
        onClose={() => {
          setShowShelfForm(false)
          setEditingShelf(null)
          setNewShelfName('')
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingShelf ? 'Edit Shelf' : 'Add New Shelf'}
        </DialogTitle>
        <form onSubmit={editingShelf ? updateShelf : createShelf}>
          <DialogContent>
            <TextField
              autoFocus
              label="Shelf Name"
              type="text"
              fullWidth
              required
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="e.g., Fiction, Cookbooks, Reference"
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setShowShelfForm(false)
                setEditingShelf(null)
                setNewShelfName('')
              }}
              startIcon={<Cancel />}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              startIcon={<Save />}
            >
              {editingShelf ? 'Update Shelf' : 'Add Shelf'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog 
        open={showInviteForm} 
        onClose={() => {
          setShowInviteForm(false)
          setInviteEmail('')
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Location Invitation</DialogTitle>
        <form onSubmit={sendInvitation}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Invite a user to join the <strong>{selectedLocation?.name}</strong> location. 
              They'll receive an email with an invitation link.
            </Typography>
            
            <TextField
              autoFocus
              label="Email Address"
              type="email"
              fullWidth
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              helperText="If the user doesn't have a LibaryCard account, they can create one when accepting the invitation."
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setShowInviteForm(false)
                setInviteEmail('')
              }}
              startIcon={<Cancel />}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              startIcon={<Email />}
            >
              Send Invitation
            </Button>
          </DialogActions>
        </form>
      </Dialog>
        
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