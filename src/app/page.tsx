'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSessionItem, setSessionItem } from '@/lib/storage'
import {
  Container,
  Paper,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material'
import {
  QrCodeScanner,
  LibraryBooks,
  AccountCircle,
  ExitToApp,
  Build,
  DarkMode,
  LightMode,
  Help,
  Dashboard,
} from '@mui/icons-material'
import AddBooks from '@/components/AddBooks'
import BookLibrary from '@/components/BookLibrary'
import AdminDashboard from '@/components/AdminDashboard'
import Footer from '@/components/Footer'
import HelpModal from '@/components/HelpModal'
import { useTheme } from '@/lib/ThemeContext'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isDarkMode, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'scan' | 'library' | 'admin'>(() => {
    // Try to restore the tab from current session
    const savedTab = getSessionItem('activeMainTab') as string
    // Handle legacy tabs that no longer exist for admins (locations, requests)
    if (savedTab === 'locations' || savedTab === 'requests') {
      return 'admin'
    }
    // Return valid tab or default
    if (savedTab === 'scan' || savedTab === 'library' || savedTab === 'admin') {
      return savedTab
    }
    return 'library'
  })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userFirstName, setUserFirstName] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [helpModalOpen, setHelpModalOpen] = useState(false)

  useEffect(() => {
    if (session) {
      // Check for invitation token from Google OAuth redirect
      const invitationToken = searchParams.get('invitation')
      if (invitationToken) {
        handleInvitationAcceptance(invitationToken)
      }

      // Fetch user profile data
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data.user_role) {
            setUserRole(data.user_role)
            // Only set default tab if no tab is saved in session (first login)
            if (!getSessionItem('activeMainTab')) {
              setActiveTab('library')
              setSessionItem('activeMainTab', 'library')
            }
          }
          // Store the user's first name from profile data
          if (data.first_name) {
            setUserFirstName(data.first_name)
          }
        })
        .catch(err => console.error('Failed to fetch user role:', err))

      // Fetch user's locations to get the location name for regular users
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'
      fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user?.email}`,
          'Content-Type': 'application/json',
        },
      })
        .then(res => res.json())
        .then(locations => {
          // For regular users, they should only have one location
          if (locations && locations.length > 0) {
            setUserLocation(locations[0].name)
          }
        })
        .catch(err => console.error('Failed to fetch user locations:', err))
    }
  }, [session, searchParams])

  const handleInvitationAcceptance = async (token: string) => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'
    
    try {
      const response = await fetch(`${API_BASE}/api/invitations/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.user?.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation_token: token,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Clear the invitation token from URL
        const url = new URL(window.location.href)
        url.searchParams.delete('invitation')
        window.history.replaceState({}, '', url.toString())
        
        // Show success message or refresh location data
        console.log(`Successfully joined ${data.location_name}!`)
        
        // Refresh location data to show the new location
        const locationsResponse = await fetch(`${API_BASE}/api/locations`, {
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`,
            'Content-Type': 'application/json',
          },
        })
        const locations = await locationsResponse.json()
        if (locations && locations.length > 0) {
          setUserLocation(locations[0].name)
        }
      } else {
        console.error('Failed to accept invitation:', data.error)
      }
    } catch (error) {
      console.error('Invitation acceptance error:', error)
    }
  }

  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleProfileClick = () => {
    router.push('/profile')
    handleMenuClose()
  }

  const handleHelpClick = () => {
    setHelpModalOpen(true)
    handleMenuClose()
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            📚 LibraryCard
          </Typography>
          
          <Typography variant="body2" sx={{ mr: 2 }}>
            Hello, {userFirstName || session.user?.name?.split(' ')[0] || 'User'}!
            {userRole === 'admin' && <Build sx={{ ml: 0.5, fontSize: '1rem' }} />}
          </Typography>
          
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            size="small"
            sx={{ mr: 1 }}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
          
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            size="small"
          >
            <AccountCircle />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleProfileClick}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleHelpClick}>
              <Help sx={{ mr: 1 }} />
              Help
            </MenuItem>
            <MenuItem onClick={handleSignOut}>
              <ExitToApp sx={{ mr: 1 }} />
              Sign Out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ py: 2 }}>

        <Paper sx={{ mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => {
              setActiveTab(newValue)
              // Persist the tab selection in session storage
              setSessionItem('activeMainTab', newValue)
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              value="library" 
              label={userRole === 'admin' ? "Libraries" : (userLocation ? `${userLocation} Library` : "My Library")}
              icon={<LibraryBooks />}
              iconPosition="start"
            />
            <Tab 
              value="scan" 
              label="Add Books"
              icon={<QrCodeScanner />}
              iconPosition="start"
            />
            {userRole === 'admin' && (
              <Tab 
                value="admin" 
                label="Admin Dashboard"
                icon={<Dashboard />}
                iconPosition="start"
              />
            )}
          </Tabs>
        </Paper>

        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'scan' && <AddBooks />}
        {activeTab === 'library' && <BookLibrary />}
      </Container>
      
      <Footer />
      
      <HelpModal 
        open={helpModalOpen} 
        onClose={() => setHelpModalOpen(false)} 
      />
    </Box>
  )
}