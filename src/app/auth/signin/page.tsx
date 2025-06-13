'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Link,
} from '@mui/material'
import {
  Google,
  Email,
  PersonAdd,
  Login,
} from '@mui/icons-material'
import Footer from '@/components/Footer'

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
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'
    
    try {
      const response = await fetch(`${API_BASE}/api/invitations/details?token=${token}`)
      const data = await response.json()
      
      if (response.ok) {
        setInvitationDetails(data)
        setEmail(data.invited_email)
        
        // Show invitation message but keep all sign-in options available
        setMessage(`You have been invited to join "${data.location_name}"! Sign in with Google or create an account to accept the invitation.`)
      } else {
        setError('Invalid or expired invitation link')
      }
    } catch (error) {
      console.error('Failed to fetch invitation details:', error)
      setError('Failed to load invitation details')
    }
  }

  const handleInvitationAcceptance = async (token: string) => {
    setError('')
    
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'
    
    try {
      const session = await getSession()
      if (!session?.user?.email) {
        setError('Please sign in first to accept the invitation')
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
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      // Include invitation token in callback URL if present
      const callbackUrl = invitationToken ? `/?invitation=${invitationToken}` : '/'
      await signIn('google', { callbackUrl })
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
        // Check if admin approval is required
        if (data.requires_approval) {
          // Admin approval required - show appropriate message
          setMessage('Your signup request has been submitted for admin approval. You will receive an email notification once your request is reviewed. Thank you for your interest in LibaryCard!')
          setShowRegisterForm(false)
          setShowEmailForm(false)
          // Clear form
          setEmail('')
          setPassword('')
          setFirstName('')
          setLastName('')
        } else if (data.requires_verification) {
          // Email verification required - show appropriate message
          if (invitationToken) {
            setMessage('Account created successfully! Please check your email and click the verification link before you can sign in and accept the invitation.')
          } else {
            setMessage('Registration successful! Please check your email to verify your account before signing in.')
          }
          setShowRegisterForm(false)
          setShowEmailForm(false)
          // Clear form
          setEmail('')
          setPassword('')
          setFirstName('')
          setLastName('')
        } else {
          // Email verification not required (should not happen in production)
          if (invitationToken) {
            try {
              // Automatically sign in the newly registered user
              const signInResult = await signIn('credentials', {
                email,
                password,
                redirect: false,
              })

              if (signInResult?.ok) {
                // Accept the invitation after successful sign-in
                await handleInvitationAcceptance(invitationToken)
              } else {
                // Show sign-in form with helpful message
                setMessage('Account created successfully! Please use your new password to sign in and accept the invitation.')
                setShowRegisterForm(false)
                setShowEmailForm(true)
                // Keep email filled, clear only password for security
                setPassword('')
                setFirstName('')
                setLastName('')
              }
            } catch (error) {
              console.error('Auto sign-in error:', error)
              setError('Registration successful, but automatic sign-in failed. Please sign in manually to accept the invitation.')
            }
          } else {
            // Normal registration flow without invitation
            setMessage('Registration successful! You can now sign in.')
            setShowRegisterForm(false)
            setShowEmailForm(true)
            // Keep email filled, clear only password for security
            setPassword('')
            setFirstName('')
            setLastName('')
          }
        }
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
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          📚 LibaryCard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to start managing your book collection
        </Typography>

        {process.env.NODE_ENV === 'development' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Development Mode:</strong> Email verification is simulated. 
              After creating an account, you can sign in immediately with your credentials.
            </Typography>
          </Alert>
        )}

        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {message}
            </Typography>
            {process.env.NODE_ENV === 'development' && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Development Mode:</strong> No email was actually sent. 
                You can now sign in with your email and the strong password you just created!
              </Typography>
            )}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        )}

        {!showEmailForm && !showRegisterForm && !message.includes('verification') && (
          <Box sx={{ width: '100%' }}>
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="contained"
              fullWidth
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Google />}
              sx={{ 
                py: 1.5,
                mb: 2,
                backgroundColor: '#4285F4',
                '&:hover': {
                  backgroundColor: '#357ae8'
                }
              }}
            >
              {loading ? 'Signing in...' : (invitationToken ? 'Continue with Google and Accept Invitation' : 'Continue with Google')}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">or</Typography>
            </Divider>

            <Button
              onClick={() => {
                if (invitationToken && invitationDetails) {
                  // For invited users, go directly to registration
                  setShowRegisterForm(true)
                } else {
                  // For existing users, show email signin
                  setShowEmailForm(true)
                }
              }}
              variant="outlined"
              fullWidth
              startIcon={<Email />}
              sx={{ py: 1.5, mb: 2 }}
            >
              {invitationToken && invitationDetails ? 'Create Account with Email' : 'Sign in with Email'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              {invitationToken && invitationDetails ? (
                <>
                  Already have an account?{' '}
                  <Link
                    component="button"
                    onClick={() => setShowEmailForm(true)}
                    sx={{ cursor: 'pointer' }}
                  >
                    Sign in here
                  </Link>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <Link
                    component="button"
                    onClick={() => setShowRegisterForm(true)}
                    sx={{ cursor: 'pointer' }}
                  >
                    Create one here
                  </Link>
                </>
              )}
            </Typography>
          </Box>
        )}

        {showEmailForm && !showRegisterForm && (
          <Box>
            <Box component="form" onSubmit={handleEmailSignIn} sx={{ textAlign: 'left', mb: 2 }}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!invitationDetails}
                sx={{ mb: 2 }}
                variant="outlined"
              />
              
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
                variant="outlined"
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={emailLoading}
                startIcon={emailLoading ? <CircularProgress size={16} color="inherit" /> : <Login />}
                sx={{ py: 1.5, mb: 2 }}
              >
                {emailLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>

            <Link
              component="button"
              onClick={() => {
                setShowEmailForm(false)
                setError('')
                setEmail('')
                setPassword('')
              }}
              variant="body2"
              color="text.secondary"
              sx={{ cursor: 'pointer' }}
            >
              Back to sign in options
            </Link>
          </Box>
        )}

        {showRegisterForm && (
          <Box>
            <Box component="form" onSubmit={handleRegister} sx={{ textAlign: 'left', mb: 2 }}>
              <TextField
                fullWidth
                type="text"
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                sx={{ mb: 2 }}
                variant="outlined"
              />

              <TextField
                fullWidth
                type="text"
                label="Last Name (Optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                sx={{ mb: 2 }}
                variant="outlined"
              />
              
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!invitationDetails}
                sx={{ mb: 2 }}
                variant="outlined"
              />
              
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                slotProps={{ htmlInput: { minLength: 8 } }}
                helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                sx={{ mb: 3 }}
                variant="outlined"
              />
              
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={emailLoading}
                startIcon={emailLoading ? <CircularProgress size={16} color="inherit" /> : <PersonAdd />}
                sx={{ py: 1.5, mb: 2 }}
              >
                {emailLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Box>

            <Link
              component="button"
              onClick={() => {
                setShowRegisterForm(false)
                setError('')
                setEmail('')
                setPassword('')
                setFirstName('')
                setLastName('')
              }}
              variant="body2"
              color="text.secondary"
              sx={{ cursor: 'pointer' }}
            >
              Back to sign in options
            </Link>
          </Box>
        )}
      </Paper>
      
      <Footer />
    </Container>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}