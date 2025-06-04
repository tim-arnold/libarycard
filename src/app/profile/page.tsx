'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

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

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
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

  const leaveLocation = async (locationId: number, locationName: string) => {
    if (!confirm(`Are you sure you want to leave "${locationName}"? This will remove all your books from this location and cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/locations/${locationId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.user?.email}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setSuccess(`Successfully left "${locationName}"`)
        await fetchLocations() // Refresh locations list
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to leave "${locationName}"`)
      }
    } catch (err) {
      setError(`Failed to leave "${locationName}"`)
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
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            onClick={() => router.push('/')}
            className="btn btn-secondary"
            style={{ fontSize: '0.9em' }}
          >
            ← Back to App
          </button>
          <h1>👤 Edit Profile</h1>
        </div>
        <p style={{ color: '#666', fontSize: '0.9em' }}>
          Signed in with {profile.auth_provider === 'google' ? 'Google' : 'Email/Password'}
        </p>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '4px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#efe', 
            border: '1px solid #cfc', 
            borderRadius: '4px',
            color: '#060'
          }}>
            {success}
          </div>
        )}

        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={profile.auth_provider === 'google'}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              backgroundColor: profile.auth_provider === 'google' ? '#f5f5f5' : 'white'
            }}
          />
          {profile.auth_provider === 'google' && (
            <p style={{ fontSize: '0.8em', color: '#666', marginTop: '0.25rem' }}>
              Email cannot be changed for Google accounts
            </p>
          )}
        </div>

        <div>
          <label htmlFor="first_name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            First Name
          </label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>

        <div>
          <label htmlFor="last_name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Last Name
          </label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn"
          style={{
            padding: '1rem',
            fontSize: '1rem',
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Location Management Section */}
      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
        <h2 style={{ marginBottom: '1rem' }}>📍 Library Locations</h2>
        
        {locations.length === 0 ? (
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #e9ecef', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#666' }}>
              You don't have access to any library locations yet. Contact an administrator to get invited.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '1rem' }}>
              You have access to {locations.length} library location{locations.length > 1 ? 's' : ''}. 
              You can leave locations you no longer need access to.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {locations.map(location => (
                <div 
                  key={location.id}
                  style={{ 
                    padding: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0' }}>{location.name}</h4>
                    {location.description && (
                      <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                        {location.description}
                      </p>
                    )}
                  </div>
                  
                  {locations.length > 1 && (
                    <button
                      onClick={() => leaveLocation(location.id, location.name)}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        cursor: 'pointer'
                      }}
                    >
                      Leave Location
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {locations.length === 1 && (
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '4px',
                marginTop: '1rem'
              }}>
                <p style={{ margin: 0, fontSize: '0.85em', color: '#856404' }}>
                  ℹ️ You can't leave your last location. You need access to at least one library.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}