'use client'

import { useState } from 'react'
import { Box, Typography, Link, Divider } from '@mui/material'
import { Email } from '@mui/icons-material'
import ContactModal from './ContactModal'

export default function Footer() {
  const [contactModalOpen, setContactModalOpen] = useState(false)

  return (
    <>
      <Box 
        component="footer" 
        sx={{ 
          mt: 4,
          py: 3,
          px: 2,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider'
        }}
      >
        <Divider sx={{ mb: 2 }} />
        
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Typography variant="body2" color="text.secondary">
            &copy; 2025{' '}
            <Link
              href="https://tim52.io"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              sx={{
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              tim52.io
            </Link>
          </Typography>
          
          <Link
            component="button"
            variant="body2"
            onClick={() => setContactModalOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            <Email fontSize="small" />
            Contact the Libarian
          </Link>
        </Box>
      </Box>

      <ContactModal 
        open={contactModalOpen} 
        onClose={() => setContactModalOpen(false)} 
      />
    </>
  )
}