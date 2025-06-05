'use client'

import { ReactNode } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material'
import { Close } from '@mui/icons-material'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeMap = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
    xl: 'lg'
  } as const

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={sizeMap[size]}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
          }
        }
      }}
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
        {children}
      </DialogContent>
    </Dialog>
  )
}