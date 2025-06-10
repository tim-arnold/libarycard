'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
} from '@mui/material'
import {
  Dashboard,
  Analytics,
  People,
  Notifications,
  LocationOn,
  Refresh,
  PersonAdd,
} from '@mui/icons-material'
import AdminAnalytics from './AdminAnalytics'
import AdminUserManager from './AdminUserManager'
import AdminNotificationCenter from './AdminNotificationCenter'
import AdminSignupManager from './AdminSignupManager'
import LocationManager from './LocationManager'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

interface AdminOverview {
  totalBooks: number
  totalUsers: number
  totalLocations: number
  pendingRequests: number
  unorganizedBooks: number
  recentBooks: number
  recentCheckouts: number
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (session?.user?.email) {
      loadOverview()
    }
  }, [session])

  const loadOverview = async () => {
    if (!session?.user?.email) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOverview(data.overview)
        setError('')
      } else if (response.status === 403) {
        setError('Admin privileges required to access this dashboard')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load admin dashboard')
      }
    } catch (error) {
      console.error('Error loading admin overview:', error)
      setError('Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            🔧 Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography color="text.secondary">
              Loading admin dashboard...
            </Typography>
          </Box>
        </Paper>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            🔧 Admin Dashboard
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            🔧 Admin Dashboard
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadOverview}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {/* Overview Cards */}
        {overview && (
          <Box sx={{ mb: 4 }}>
            {/* First Row - Main Metrics */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary" gutterBottom>
                    {overview.totalBooks}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Total Books
                  </Typography>
                  {overview.recentBooks > 0 && (
                    <Typography variant="body2" color="success.main">
                      +{overview.recentBooks} this month
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="secondary" gutterBottom>
                    {overview.totalUsers}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Total Users
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="info.main" gutterBottom>
                    {overview.totalLocations}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Locations
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="h3" 
                    color={overview.pendingRequests > 0 ? "warning.main" : "success.main"} 
                    gutterBottom
                  >
                    {overview.pendingRequests}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Pending Requests
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Second Row - Additional Metrics */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="h4" 
                    color={overview.unorganizedBooks > 0 ? "warning.main" : "success.main"} 
                    gutterBottom
                  >
                    {overview.unorganizedBooks}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Unorganized Books
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Books without shelves
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" gutterBottom>
                    {overview.recentCheckouts}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Recent Checkouts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 30 days
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {Math.round((overview.totalBooks - overview.unorganizedBooks) / overview.totalBooks * 100) || 0}%
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Organization Rate
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Books properly shelved
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab 
              icon={<Dashboard />} 
              label="Overview" 
              iconPosition="start"
            />
            <Tab 
              icon={<Analytics />} 
              label="Analytics" 
              iconPosition="start"
            />
            <Tab 
              icon={<People />} 
              label="Users" 
              iconPosition="start"
            />
            <Tab 
              icon={<LocationOn />} 
              label="Locations" 
              iconPosition="start"
            />
            <Tab 
              icon={<PersonAdd />} 
              label="Signup Requests" 
              iconPosition="start"
            />
            <Tab 
              icon={<Notifications />} 
              label={`Notifications ${overview?.pendingRequests ? `(${overview.pendingRequests})` : ''}`}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ mt: 3 }}>
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                📊 Dashboard Overview
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Welcome to the LibaryCard admin dashboard. Use the tabs above to navigate between different administrative functions:
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" paragraph>
                  <strong>Analytics:</strong> Detailed insights into library usage, popular genres, and user activity
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  <strong>Users:</strong> Manage user accounts, roles, and permissions
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  <strong>Locations:</strong> Manage physical locations, shelves, and invitations
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  <strong>Signup Requests:</strong> Review and approve or deny new user signup requests
                </Typography>
                <Typography component="li" variant="body2" paragraph>
                  <strong>Notifications:</strong> Review pending book removal requests and system notifications
                </Typography>
              </Box>
            </Box>
          )}

          {activeTab === 1 && <AdminAnalytics />}
          {activeTab === 2 && <AdminUserManager />}
          {activeTab === 3 && <LocationManager />}
          {activeTab === 4 && <AdminSignupManager />}
          {activeTab === 5 && <AdminNotificationCenter />}
        </Box>
      </Paper>
    </Container>
  )
}