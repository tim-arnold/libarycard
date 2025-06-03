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
        loadShelves(newLocation.id)
      } else {
        setError('Failed to create location')
      }
    } catch (error) {
      console.error('Failed to create location:', error)
      setError('Failed to create location')
    }
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
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {locations.map(location => (
                <div 
                  key={location.id}
                  onClick={() => setSelectedLocation(location)}
                  style={{
                    padding: '1rem',
                    border: selectedLocation?.id === location.id ? '2px solid #0070f3' : '1px solid #e0e0e0',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{location.name}</h4>
                  {location.description && (
                    <p style={{ fontSize: '0.9em', color: '#666', margin: 0 }}>{location.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedLocation && (
            <div>
              <h3>Shelves in {selectedLocation.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {shelves.map(shelf => (
                  <div key={shelf.id} style={{ 
                    padding: '0.75rem', 
                    background: '#f5f5f5', 
                    borderRadius: '0.25rem',
                    textAlign: 'center'
                  }}>
                    <strong>{shelf.name}</strong>
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
            <h3 style={{ marginBottom: '1rem' }}>Create New Location</h3>
            <form onSubmit={createLocation}>
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
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}