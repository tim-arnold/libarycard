'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Typography,
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Badge,
  Button,
} from '@mui/material'
import {
  Notifications,
  DeleteSweep,
  CheckCircle,
  Schedule,
  Refresh,
} from '@mui/icons-material'
import RemovalRequestManager from './RemovalRequestManager'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'

interface NotificationCounts {
  pendingRemovalRequests: number
  overdueCheckouts: number
  monthlyReminders: number
  pendingInvitations: number
}

export default function AdminNotificationCenter() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState(0)
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingRemovalRequests: 0,
    overdueCheckouts: 0,
    monthlyReminders: 0,
    pendingInvitations: 0
  })

  useEffect(() => {
    if (session?.user?.email) {
      loadNotificationCounts()
    }
  }, [session])

  const loadNotificationCounts = async () => {
    if (!session?.user?.email) return

    try {
      // Load analytics data to get pending requests count
      const analyticsResponse = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setCounts(prev => ({
          ...prev,
          pendingRemovalRequests: analyticsData.overview.pendingRequests || 0
        }))
      }

      // TODO: Implement other notification counts when features are added
      // - Overdue checkouts (books checked out > 30 days)
      // - Monthly reminders (books still checked out for monthly notification)
      // - Pending invitations across all locations

    } catch (error) {
      console.error('Error loading notification counts:', error)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          🔔 Notification Center
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadNotificationCounts}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {/* Notification Overview Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card sx={{ 
          border: counts.pendingRemovalRequests > 0 ? 2 : 1,
          borderColor: counts.pendingRemovalRequests > 0 ? 'warning.main' : 'divider'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <DeleteSweep 
              sx={{ 
                fontSize: 40, 
                color: counts.pendingRemovalRequests > 0 ? 'warning.main' : 'text.secondary',
                mb: 1 
              }} 
            />
            <Typography variant="h4" color={counts.pendingRemovalRequests > 0 ? 'warning.main' : 'text.secondary'}>
              {counts.pendingRemovalRequests}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Removal Requests
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ 
          border: counts.overdueCheckouts > 0 ? 2 : 1,
          borderColor: counts.overdueCheckouts > 0 ? 'error.main' : 'divider'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Schedule 
              sx={{ 
                fontSize: 40, 
                color: counts.overdueCheckouts > 0 ? 'error.main' : 'text.secondary',
                mb: 1 
              }} 
            />
            <Typography variant="h4" color={counts.overdueCheckouts > 0 ? 'error.main' : 'text.secondary'}>
              {counts.overdueCheckouts}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overdue Checkouts
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ 
          border: counts.monthlyReminders > 0 ? 2 : 1,
          borderColor: counts.monthlyReminders > 0 ? 'info.main' : 'divider'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Notifications 
              sx={{ 
                fontSize: 40, 
                color: counts.monthlyReminders > 0 ? 'info.main' : 'text.secondary',
                mb: 1 
              }} 
            />
            <Typography variant="h4" color={counts.monthlyReminders > 0 ? 'info.main' : 'text.secondary'}>
              {counts.monthlyReminders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monthly Reminders
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ 
          border: counts.pendingInvitations > 0 ? 2 : 1,
          borderColor: counts.pendingInvitations > 0 ? 'success.main' : 'divider'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle 
              sx={{ 
                fontSize: 40, 
                color: counts.pendingInvitations > 0 ? 'success.main' : 'text.secondary',
                mb: 1 
              }} 
            />
            <Typography variant="h4" color={counts.pendingInvitations > 0 ? 'success.main' : 'text.secondary'}>
              {counts.pendingInvitations}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending Invitations
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Notification Detail Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab 
              label={
                <Badge badgeContent={counts.pendingRemovalRequests} color="warning">
                  Removal Requests
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={counts.overdueCheckouts} color="error">
                  Overdue Checkouts
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={counts.monthlyReminders} color="info">
                  Monthly Reminders
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={counts.pendingInvitations} color="success">
                  Pending Invitations
                </Badge>
              }
            />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <RemovalRequestManager />
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Schedule sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Overdue Checkout Tracking
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                This feature will track books that have been checked out for extended periods and require follow-up.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📅 Coming soon: Automatic detection of books checked out for more than 30 days
              </Typography>
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Notifications sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Monthly Reminder System
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Automated monthly reminders for users who still have books checked out, without strict due dates.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📧 Coming soon: Gentle monthly email reminders for ongoing checkouts
              </Typography>
            </Box>
          )}

          {activeTab === 3 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Invitation Management
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Track and manage pending location invitations across the entire system.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📨 Coming soon: Centralized view of all pending invitations from all locations
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}