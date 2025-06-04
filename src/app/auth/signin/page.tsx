'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SignInForm() {
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [invitationToken, setInvitationToken] = useState<string | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [invitationDetails, setInvitationDetails] = useState<{invited_email: string, location_name: string} | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if already signed in
    getSession().then((session) => {
      if (session) {
        // If signed in and has invitation token, accept it
        const invitationParam = searchParams.get('invitation')
        if (invitationParam) {
          handleInvitationAcceptance(invitationParam)
        } else {
          router.push('/')
        }
      }
    })

    // Check for invitation token in URL
    const invitationParam = searchParams.get('invitation')
    if (invitationParam) {
      setInvitationToken(invitationParam)
      fetchInvitationDetails(invitationParam)
    }

    // Check for verification success
    if (searchParams.get('verified') === 'true') {
      setMessage('Email verified successfully! You can now sign in.')
    }

    // Check for verification errors
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [router, searchParams])

  const fetchInvitationDetails = async (token: string) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'
    
    try {
      const response = await fetch(`${API_BASE}/api/invitations/details?token=${token}`)
      const data = await response.json()
      
      if (response.ok) {
        setInvitationDetails(data)
        setEmail(data.invited_email)
        setMessage(`You have been invited to join "${data.location_name}"! Please sign in with your email (${data.invited_email}) to accept the invitation.`)
      } else {
        setError('Invalid or expired invitation link')
      }
    } catch (error) {
      console.error('Failed to fetch invitation details:', error)
      setError('Failed to load invitation details')
    }
  }

  const handleInvitationAcceptance = async (token: string) => {
    setInvitationLoading(true)
    setError('')
    
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'
    
    try {
      const session = await getSession()
      if (!session?.user?.email) {
        setError('Please sign in first to accept the invitation')
        setInvitationLoading(false)
        return
      }

      const response = await fetch(`${API_BASE}/api/invitations/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation_token: token,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Successfully joined ${data.location_name}! Redirecting...`)
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        if (data.error?.includes('email does not match')) {
          setError('This invitation was sent to a different email address. Please sign in with the correct account or contact the person who invited you.')
        } else {
          setError(data.error || 'Failed to accept invitation')
        }
      }
    } catch (error) {
      console.error('Invitation acceptance error:', error)
      setError('Failed to accept invitation. Please try again.')
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setError('')
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else if (result?.ok) {
        // Handle invitation acceptance after successful sign-in
        if (invitationToken) {
          await handleInvitationAcceptance(invitationToken)
        } else {
          router.push('/')
        }
      }
    } catch (error) {
      console.error('Email sign in error:', error)
      setError('Sign in failed. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  const validatePassword = (password: string) => {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (password.length < minLength) {
      return `Password must be at least ${minLength} characters long`
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number'
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)'
    }
    return null
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setError('')
    setMessage('')

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setEmailLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Registration successful! Please check your email to verify your account.')
        setShowRegisterForm(false)
        setShowEmailForm(false)
        // Clear form
        setEmail('')
        setPassword('')
        setFirstName('')
        setLastName('')
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Registration failed. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
      <div className="card">
        <h1 style={{ marginBottom: '2rem' }}>📚 LibaryCard</h1>
        <p style={{ marginBottom: '2rem', color: '#666' }}>
          Sign in to start managing your book collection
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: '#fff3cd', 
            color: '#856404', 
            borderRadius: '4px',
            border: '1px solid #ffeaa7',
            fontSize: '0.9rem'
          }}>
            <strong>Development Mode:</strong> Email verification is simulated. 
            After creating an account, you can sign in immediately with your credentials.
          </div>
        )}

        {message && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            borderRadius: '4px',
            border: '1px solid #c3e6cb'
          }}>
            {message}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                <strong>Development Mode:</strong> No email was actually sent. 
                You can now sign in with your email and the strong password you just created!
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {!showEmailForm && !showRegisterForm && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn"
              style={{ 
                width: '100%', 
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div style={{ margin: '1rem 0', color: '#666' }}>or</div>

            <button
              onClick={() => setShowEmailForm(true)}
              className="btn"
              style={{ 
                width: '100%', 
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: 'transparent',
                border: '2px solid #007bff',
                color: '#007bff'
              }}
            >
              Sign in with Email
            </button>

            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Don't have an account?{' '}
              <button
                onClick={() => setShowRegisterForm(true)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#007bff', 
                  textDecoration: 'underline', 
                  cursor: 'pointer' 
                }}
              >
                Create one here
              </button>
            </p>
          </>
        )}

        {showEmailForm && !showRegisterForm && (
          <>
            <form onSubmit={handleEmailSignIn} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={!!invitationDetails}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: invitationDetails ? '#f8f9fa' : 'white',
                    cursor: invitationDetails ? 'not-allowed' : 'text'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              
              <button
                type="submit"
                disabled={emailLoading}
                className="btn"
                style={{ 
                  width: '100%', 
                  padding: '1rem',
                  marginBottom: '1rem'
                }}
              >
                {emailLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <button
              onClick={() => {
                setShowEmailForm(false)
                setError('')
                setEmail('')
                setPassword('')
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#666', 
                textDecoration: 'underline', 
                cursor: 'pointer' 
              }}
            >
              Back to sign in options
            </button>
          </>
        )}

        {showRegisterForm && (
          <>
            <form onSubmit={handleRegister} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Last Name (Optional)
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={!!invitationDetails}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: invitationDetails ? '#f8f9fa' : 'white',
                    cursor: invitationDetails ? 'not-allowed' : 'text'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
                <small style={{ color: '#666', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </small>
              </div>
              
              <button
                type="submit"
                disabled={emailLoading}
                className="btn"
                style={{ 
                  width: '100%', 
                  padding: '1rem',
                  marginBottom: '1rem'
                }}
              >
                {emailLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <button
              onClick={() => {
                setShowRegisterForm(false)
                setError('')
                setEmail('')
                setPassword('')
                setFirstName('')
                setLastName('')
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#666', 
                textDecoration: 'underline', 
                cursor: 'pointer' 
              }}
            >
              Back to sign in options
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}