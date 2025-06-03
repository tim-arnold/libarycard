'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

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

const DEFAULT_SHELVES = [
  'basement',
  "julie's room",
  "tim's room",
  'bench',
  "julie's office",
  'little library'
]

export default function LocationManager() {
  const { data: session } = useSession()
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

  useEffect(() => {
    if (session?.user) {
      loadLocations()
    }
  }, [session])

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
        if (data.length === 0) {
          setShowCreateForm(true)
        } else {
          setSelectedLocation(data[0])
        }
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
      setError('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const loadShelves = async (locationId: number) => {
    try {
      const response = await fetch(`/api/locations/${locationId}/shelves`)
      if (response.ok) {
        const data = await response.json()
        setShelves(data)
      }
    } catch (error) {
      console.error('Failed to load shelves:', error)
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

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
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
        setError('Failed to create location')
      }
    } catch (error) {
      console.error('Failed to create location:', error)
      setError('Failed to create location')
    }
  }

  const updateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLocation || !newLocationName.trim()) return

    try {
      const response = await fetch(`/api/locations?id=${editingLocation.id}`, {
        method: 'PUT',
        headers: {
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
        setError('Failed to update location')
      }
    } catch (error) {
      console.error('Failed to update location:', error)
      setError('Failed to update location')
    }
  }

  const deleteLocation = async (locationId: number) => {
    if (!confirm('Are you sure you want to delete this location? This will also delete all its shelves.')) {
      return
    }

    try {
      const response = await fetch(`/api/locations?id=${locationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const updatedLocations = locations.filter(loc => loc.id !== locationId)
        setLocations(updatedLocations)
        if (selectedLocation?.id === locationId) {
          setSelectedLocation(updatedLocations[0] || null)
          setShelves([])
        }
      } else {
        setError('Failed to delete location')
      }
    } catch (error) {
      console.error('Failed to delete location:', error)
      setError('Failed to delete location')
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

    try {
      const response = await fetch(`/api/locations/${selectedLocation.id}/shelves`, {
        method: 'POST',
        headers: {
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
        setError('Failed to create shelf')
      }
    } catch (error) {
      console.error('Failed to create shelf:', error)
      setError('Failed to create shelf')
    }
  }

  const updateShelf = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation || !editingShelf || !newShelfName.trim()) return

    try {
      const response = await fetch(`/api/locations/${selectedLocation.id}/shelves?shelfId=${editingShelf.id}`, {
        method: 'PUT',
        headers: {
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
        setError('Failed to update shelf')
      }
    } catch (error) {
      console.error('Failed to update shelf:', error)
      setError('Failed to update shelf')
    }
  }

  const deleteShelf = async (shelfId: number) => {
    if (!selectedLocation || !confirm('Are you sure you want to delete this shelf?')) {
      return
    }

    try {
      const response = await fetch(`/api/locations/${selectedLocation.id}/shelves?shelfId=${shelfId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShelves(shelves.filter(shelf => shelf.id !== shelfId))
      } else {
        setError('Failed to delete shelf')
      }
    } catch (error) {
      console.error('Failed to delete shelf:', error)
      setError('Failed to delete shelf')
    }
  }

  const startEditShelf = (shelf: Shelf) => {
    setEditingShelf(shelf)
    setNewShelfName(shelf.name)
    setShowShelfForm(true)
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
            You don't have any locations yet. Create your first location to start organizing your books!
          </p>
          <button 
            onClick={() => setShowCreateForm(true)} 
            className="btn"
          >
            Create Your First Location
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Your Locations</h3>
              <button 
                onClick={() => setShowCreateForm(true)} 
                className="btn"
                style={{ fontSize: '0.9em', padding: '0.5rem 1rem' }}
              >
                + Add Location
              </button>
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
                        deleteLocation(location.id)
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
                </div>
              ))}
            </div>
          </div>

          {selectedLocation && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Shelves in {selectedLocation.name}</h3>
                <button 
                  onClick={() => setShowShelfForm(true)} 
                  className="btn"
                  style={{ fontSize: '0.9em', padding: '0.5rem 1rem' }}
                >
                  + Add Shelf
                </button>
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
                        onClick={() => deleteShelf(shelf.id)}
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
                  </div>
                ))}
              </div>
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
    </div>
  )
}