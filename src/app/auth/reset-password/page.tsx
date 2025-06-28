'use client'

import { useState, useEffect, Suspense } from 'react'
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
} from '@mui/material'
import {
  LockReset,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material'
import Footer from '@/components/Footer'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
      setVerifying(false)
      return
    }

    // Verify the token when the page loads
    verifyToken()
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/auth/verify-reset-token?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        setTokenValid(true)
        setUserEmail(data.email)
      } else {
        setError(data.error || 'Invalid or expired reset token')
      }
    } catch (error) {
      console.error('Token verification error:', error)
      setError('Failed to verify reset token. Please try again.')
    } finally {
      setVerifying(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Redirect to sign-in after 3 seconds
        setTimeout(() => {
          router.push('/auth/signin?message=Password reset successful. You can now sign in with your new password.')
        }, 3000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Password reset error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography>Verifying reset link...</Typography>
        </Box>
      </Container>
    )
  }

  if (!tokenValid) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>
            Invalid Reset Link
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/auth/signin')}
            sx={{ mr: 2 }}
          >
            Back to Sign In
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/auth/signin')}
          >
            Request New Reset
          </Button>
        </Paper>
        <Footer />
      </Container>
    )
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2 }}>
            Password Reset Successful!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            Your password has been updated. You will be redirected to the sign-in page shortly.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/auth/signin')}
          >
            Sign In Now
          </Button>
        </Paper>
        <Footer />
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <LockReset sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            Reset Your Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new password for {userEmail}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{ mb: 2 }}
            variant="outlined"
            helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
          />
          
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            sx={{ mb: 3 }}
            variant="outlined"
            helperText="Re-enter your new password to confirm"
          />
          
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LockReset />}
            sx={{ py: 1.5, mb: 2 }}
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="text"
            onClick={() => router.push('/auth/signin')}
            color="secondary"
          >
            Back to Sign In
          </Button>
        </Box>
      </Paper>
      
      <Footer />
    </Container>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}