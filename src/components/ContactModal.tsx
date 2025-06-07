'use client'

import { useState } from 'react'
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

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', message: '' })
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
            placeholder="Tell the Libarian about your question, feedback, or how LibaryCard is working for you..."
          />
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