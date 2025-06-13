'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Link,
  Slide,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'

interface ConsentSettings {
  essential: boolean
  functional: boolean
}

export default function CookieNotice() {
  const [showNotice, setShowNotice] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consentSettings, setConsentSettings] = useState<ConsentSettings>({
    essential: true, // Always true, cannot be disabled
    functional: true,
  })

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent')
    if (!consent) {
      setShowNotice(true)
    }
  }, [])

  const handleAcceptAll = () => {
    const fullConsent = {
      essential: true,
      functional: true,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem('cookieConsent', JSON.stringify(fullConsent))
    setShowNotice(false)
  }

  const handleSavePreferences = () => {
    const consent = {
      ...consentSettings,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem('cookieConsent', JSON.stringify(consent))
    setShowNotice(false)
  }

  const handleDeclineAll = () => {
    const minimalConsent = {
      essential: true,
      functional: false,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem('cookieConsent', JSON.stringify(minimalConsent))
    setShowNotice(false)
  }

  if (!showNotice) return null

  return (
    <Slide direction="up" in={showNotice} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          p: 2,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 3,
            backgroundColor: 'background.paper',
            borderRadius: '12px 12px 0 0',
            maxWidth: '100%',
            mx: 'auto',
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              We value your privacy
            </Typography>
            
            {!showDetails ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  We use cookies and local storage to enhance your browsing experience, 
                  remember your preferences, and provide personalized content. 
                  Essential cookies are required for authentication and core functionality.{' '}
                  <Link
                    href="/privacy"
                    color="primary"
                    sx={{ textDecoration: 'underline' }}
                  >
                    Learn more
                  </Link>
                </Typography>
                
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    gap: 1,
                  }}
                >
                  <Button
                    variant="text"
                    onClick={() => setShowDetails(true)}
                    sx={{ minWidth: 120 }}
                  >
                    Customize
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="outlined"
                    onClick={handleDeclineAll}
                    sx={{ minWidth: 120 }}
                  >
                    Decline Optional
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleAcceptAll}
                    sx={{ minWidth: 120 }}
                  >
                    Accept All
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose which cookies and local storage you're comfortable with:
                </Typography>
                
                <Accordion disableGutters elevation={0} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        Essential (Required)
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={true}
                            disabled={true}
                          />
                        }
                        label=""
                        sx={{ mr: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      Required for authentication, security, and core app functionality. 
                      These cannot be disabled as they're necessary for the app to work.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Accordion disableGutters elevation={0} sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        Functional (Optional)
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={consentSettings.functional}
                            onChange={(e) => setConsentSettings({
                              ...consentSettings,
                              functional: e.target.checked
                            })}
                          />
                        }
                        label=""
                        sx={{ mr: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      Remember your preferences like theme (dark/light mode), view settings, 
                      last selected shelf, and other personalization options. Disabling these 
                      means the app won't remember your preferences between sessions.
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1,
                    mt: 2,
                  }}
                >
                  <Button
                    variant="text"
                    onClick={() => setShowDetails(false)}
                    sx={{ minWidth: 120 }}
                  >
                    Back
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="contained"
                    onClick={handleSavePreferences}
                    sx={{ minWidth: 120 }}
                  >
                    Save Preferences
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Slide>
  )
}