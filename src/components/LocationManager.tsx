'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
      <div className="card">
        <p>Loading locations...</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>🏠 Location Management</h2>
      
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#ffe6e6', border: '1px solid #ff9999', borderRadius: '0.25rem' }}>
          <p style={{ color: '#cc0000', margin: 0 }}>{error}</p>
        </div>
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
            <button 
              onClick={() => setShowCreateForm(true)} 
              className="btn"
            >
              Create Your First Location
            </button>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Your Locations</h3>
              {userRole === 'admin' && (
                <button 
                  onClick={() => setShowCreateForm(true)} 
                  className="btn"
                  style={{ fontSize: '0.9em', padding: '0.5rem 1rem' }}
                >
                  + Add Location
                </button>
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
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditLocation(location)
                        }}
                        style={{
                          fontSize: '0.8em',
                          padding: '0.25rem 0.5rem',
                          background: '#f0f0f0',
                          border: '1px solid #ccc',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteLocation(location.id, location.name)
                        }}
                        style={{
                          fontSize: '0.8em',
                          padding: '0.25rem 0.5rem',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
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
                      <button 
                        onClick={() => {
                          setShowInvitations(!showInvitations)
                          if (!showInvitations) {
                            loadLocationInvitations(selectedLocation.id)
                          }
                        }} 
                        className="btn"
                        style={{ 
                          fontSize: '0.9em', 
                          padding: '0.5rem 1rem',
                          background: '#28a745',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        📧 Invitations
                      </button>
                      <button 
                        onClick={() => setShowShelfForm(true)} 
                        className="btn"
                        style={{ fontSize: '0.9em', padding: '0.5rem 1rem' }}
                      >
                        + Add Shelf
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                {shelves.map(shelf => (
                  <div key={shelf.id} style={{ 
                    padding: '0.75rem', 
                    background: '#f5f5f5', 
                    borderRadius: '0.25rem',
                    position: 'relative'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                      <strong>{shelf.name}</strong>
                    </div>
                    {userRole === 'admin' && (
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => startEditShelf(shelf)}
                          style={{
                            fontSize: '0.7em',
                            padding: '0.2rem 0.4rem',
                            background: '#e0e0e0',
                            border: '1px solid #ccc',
                            borderRadius: '0.2rem',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteShelf(shelf.id, shelf.name)}
                          style={{
                            fontSize: '0.7em',
                            padding: '0.2rem 0.4rem',
                            background: '#ff6666',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.2rem',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Invitations Section */}
              {showInvitations && userRole === 'admin' && (
                <div style={{ marginTop: '2rem', border: '1px solid #e0e0e0', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>📧 Location Invitations</h4>
                    <button 
                      onClick={() => setShowInviteForm(true)} 
                      className="btn"
                      style={{ fontSize: '0.9em', padding: '0.5rem 1rem' }}
                    >
                      + Send Invitation
                    </button>
                  </div>
                  
                  {invitations.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', margin: '1rem 0' }}>
                      No invitations sent yet. Click "Send Invitation" to invite users to this location.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {invitations.map(invitation => (
                        <div key={invitation.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '0.75rem', 
                          background: '#f8f9fa', 
                          borderRadius: '0.25rem',
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
                              <button
                                onClick={() => revokeInvitation(invitation.id, invitation.invited_email)}
                                style={{
                                  fontSize: '0.7em',
                                  padding: '0.25rem 0.5rem',
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                                title="Revoke this invitation"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '0.5rem', 
            maxWidth: '400px', 
            width: '90%' 
          }}>
            <h3 style={{ marginBottom: '1rem' }}>
              {editingLocation ? 'Edit Location' : 'Create New Location'}
            </h3>
            <form onSubmit={editingLocation ? updateLocation : createLocation}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Location Name *
                </label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g., Finsbury Road, Main Office"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    border: '1px solid #ccc', 
                    borderRadius: '0.25rem' 
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Description (optional)
                </label>
                <textarea
                  value={newLocationDescription}
                  onChange={(e) => setNewLocationDescription(e.target.value)}
                  placeholder="Brief description of this location"
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    border: '1px solid #ccc', 
                    borderRadius: '0.25rem',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingLocation(null)
                    setNewLocationName('')
                    setNewLocationDescription('')
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  {editingLocation ? 'Update Location' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShelfForm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '0.5rem', 
            maxWidth: '400px', 
            width: '90%' 
          }}>
            <h3 style={{ marginBottom: '1rem' }}>
              {editingShelf ? 'Edit Shelf' : 'Add New Shelf'}
            </h3>
            <form onSubmit={editingShelf ? updateShelf : createShelf}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Shelf Name *
                </label>
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="e.g., Fiction, Cookbooks, Reference"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    border: '1px solid #ccc', 
                    borderRadius: '0.25rem' 
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowShelfForm(false)
                    setEditingShelf(null)
                    setNewShelfName('')
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  {editingShelf ? 'Update Shelf' : 'Add Shelf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteForm && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '0.5rem', 
            maxWidth: '400px', 
            width: '90%' 
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Send Location Invitation</h3>
            <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1rem' }}>
              Invite a user to join the <strong>{selectedLocation?.name}</strong> location. 
              They'll receive an email with an invitation link.
            </p>
            <form onSubmit={sendInvitation}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    border: '1px solid #ccc', 
                    borderRadius: '0.25rem' 
                  }}
                />
                <div style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5rem' }}>
                  If the user doesn't have a LibaryCard account, they can create one when accepting the invitation.
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteEmail('')
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
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