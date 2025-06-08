'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  LocationOn,
  Assignment,
  AccountCircle,
  ExitToApp,
  Build,
  DarkMode,
  LightMode,
} from '@mui/icons-material'
import AddBooks from '@/components/AddBooks'
import BookLibrary from '@/components/BookLibrary'
import LocationManager from '@/components/LocationManager'
import RemovalRequestManager from '@/components/RemovalRequestManager'
import Footer from '@/components/Footer'
import { useTheme } from '@/lib/ThemeContext'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { isDarkMode, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'scan' | 'library' | 'locations' | 'requests'>(() => {
    // Try to restore the tab from current session
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('activeMainTab') as 'scan' | 'library' | 'locations' | 'requests'
      return savedTab || 'library'
    }
    return 'library'
  })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userFirstName, setUserFirstName] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    if (session) {
      // Fetch user profile data
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data.user_role) {
            setUserRole(data.user_role)
            // Only set default tab if no tab is saved in session (first login)
            if (typeof window !== 'undefined' && !sessionStorage.getItem('activeMainTab')) {
              setActiveTab('library')
              sessionStorage.setItem('activeMainTab', 'library')
            }
          }
          // Store the user's first name from profile data
          if (data.first_name) {
            setUserFirstName(data.first_name)
          }
        })
        .catch(err => console.error('Failed to fetch user role:', err))

      // Fetch user's locations to get the location name for regular users
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'
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
  }, [session])

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

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            📚 LibaryCard
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
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('activeMainTab', newValue)
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              value="library" 
              label={userRole === 'admin' ? "Libaries" : (userLocation ? `${userLocation} Libary` : "My Libary")}
              icon={<LibraryBooks />}
              iconPosition="start"
            />
            <Tab 
              value="scan" 
              label="Books"
              icon={<QrCodeScanner />}
              iconPosition="start"
            />
            {userRole === 'admin' && (
              <Tab 
                value="locations" 
                label="Locations"
                icon={<LocationOn />}
                iconPosition="start"
              />
            )}
            {userRole === 'admin' && (
              <Tab 
                value="requests" 
                label="Requests"
                icon={<Assignment />}
                iconPosition="start"
              />
            )}
          </Tabs>
        </Paper>

        {activeTab === 'locations' && <LocationManager />}
        {activeTab === 'requests' && <RemovalRequestManager />}
        {activeTab === 'scan' && <AddBooks />}
        {activeTab === 'library' && <BookLibrary />}
      </Container>
      
      <Footer />
    </Box>
  )
}