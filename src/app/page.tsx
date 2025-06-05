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
} from '@mui/icons-material'
import ISBNScanner from '@/components/ISBNScanner'
import BookLibrary from '@/components/BookLibrary'
import LocationManager from '@/components/LocationManager'
import RemovalRequestManager from '@/components/RemovalRequestManager'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'scan' | 'library' | 'locations' | 'requests'>('library')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userFirstName, setUserFirstName] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    if (session) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          if (data.user_role) {
            setUserRole(data.user_role)
            // Set default tab based on user role
            if (data.user_role === 'admin') {
              setActiveTab('locations')
            } else {
              setActiveTab('library')
            }
          }
          // Store the user's first name from profile data
          if (data.first_name) {
            setUserFirstName(data.first_name)
          }
        })
        .catch(err => console.error('Failed to fetch user role:', err))
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
        <Paper sx={{ mb: 2, p: 2, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Scan and manage your personal book collection
          </Typography>
        </Paper>

        <Paper sx={{ mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            centered
          >
            {userRole === 'admin' && (
              <Tab 
                value="locations" 
                label="Manage Locations" 
                icon={<LocationOn />}
                iconPosition="start"
              />
            )}
            {userRole === 'admin' && (
              <Tab 
                value="requests" 
                label="Removal Requests" 
                icon={<Assignment />}
                iconPosition="start"
              />
            )}
            <Tab 
              value="scan" 
              label="Scan Books" 
              icon={<QrCodeScanner />}
              iconPosition="start"
            />
            <Tab 
              value="library" 
              label="My Library" 
              icon={<LibraryBooks />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {activeTab === 'locations' && <LocationManager />}
        {activeTab === 'requests' && <RemovalRequestManager />}
        {activeTab === 'scan' && <ISBNScanner />}
        {activeTab === 'library' && <BookLibrary />}
      </Container>
    </Box>
  )
}