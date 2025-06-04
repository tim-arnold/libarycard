'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ProfileData {
  id: string
  email: string
  first_name: string
  last_name: string
  auth_provider: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
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
    </div>
  )
}