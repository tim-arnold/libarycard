'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material'
import { Send, Close } from '@mui/icons-material'
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile'

interface ContactModalProps {
  open: boolean
  onClose: () => void
}

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>()

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setSubmitStatus('error')
      setErrorMessage('Please fill in all fields')
      return
    }

    if (!formData.email.includes('@')) {
      setSubmitStatus('error')
      setErrorMessage('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    if (!turnstileToken) {
      setSubmitStatus('error')
      setErrorMessage('Please complete the security check')
      return
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, turnstileToken }),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', message: '' })
        setTurnstileToken(null)
        turnstileRef.current?.reset()
        setTimeout(() => {
          onClose()
          setSubmitStatus(null)
        }, 2000)
      } else {
        const errorData = await response.json()
        setSubmitStatus('error')
        setErrorMessage(errorData.error || 'Failed to send message')
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setSubmitStatus(null)
      setErrorMessage('')
      setTurnstileToken(null)
      turnstileRef.current?.reset()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Contact the Libarian
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {submitStatus === 'success' && (
            <Alert severity="success">
              Message sent successfully! The Libarian will get back to you soon.
            </Alert>
          )}
          
          {submitStatus === 'error' && (
            <Alert severity="error">
              {errorMessage}
            </Alert>
          )}

          <TextField
            label="Your Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            fullWidth
            required
            disabled={isSubmitting}
          />

          <TextField
            label="Your Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            fullWidth
            required
            disabled={isSubmitting}
          />

          <TextField
            label="Message"
            value={formData.message}
            onChange={handleInputChange('message')}
            fullWidth
            multiline
            rows={4}
            required
            disabled={isSubmitting}
            placeholder="Tell the Librarian about your question, feedback, or how LibraryCard is working for you..."
          />

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{
                theme: 'light',
                size: 'normal'
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={isSubmitting}
          startIcon={<Close />}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={isSubmitting || submitStatus === 'success'}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <Send />}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}