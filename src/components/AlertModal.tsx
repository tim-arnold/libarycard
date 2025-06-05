'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  IconButton,
  Alert,
} from '@mui/material'
import { 
  Close,
  CheckCircle,
  Error,
  Warning,
  Info,
} from '@mui/icons-material'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  buttonText?: string
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'OK'
}: AlertModalProps) {
  const getAlertSeverity = () => {
    switch (variant) {
      case 'success':
        return 'success'
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      default:
        return 'info'
    }
  }

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle />
      case 'error':
        return <Error />
      case 'warning':
        return <Warning />
      default:
        return <Info />
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Alert 
          severity={getAlertSeverity()}
          icon={getIcon()}
          sx={{ mb: 2 }}
        >
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {message}
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          autoFocus
          fullWidth
        >
          {buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}