'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import {
  MoreVert,
  Edit,
  Delete,
  Security,
  Person,
  PersonAdd,
  Email,
  CheckCircle,
  Cancel,
  Refresh,
} from '@mui/icons-material'
import ConfirmationModal from './ConfirmationModal'
import AlertModal from './AlertModal'
import { useModal } from '@/hooks/useModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  auth_provider: string
  email_verified: boolean
  user_role: 'admin' | 'user'
  created_at: string
  books_added: number
  locations_joined: number
  last_book_added: string | null
}

interface LocationInvitation {
  id: number
  location_id: number
  location_name?: string
  invited_email: string
  invitation_token: string
  invited_by: string
  invited_by_name?: string
  expires_at: string
  used_at?: string
  created_at: string
}

interface Location {
  id: number
  name: string
  description?: string
}

export default function AdminUserManager() {
  const { data: session } = useSession()
  const { modalState, confirmAsync, alert, closeModal } = useModal()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
  const [cleanupEmail, setCleanupEmail] = useState('')
  const [ownershipTransferDialogOpen, setOwnershipTransferDialogOpen] = useState(false)
  const [ownedLocations, setOwnedLocations] = useState<any[]>([])
  const [selectedOwners, setSelectedOwners] = useState<Record<string, string>>({})
  const [availableAdmins, setAvailableAdmins] = useState<any[]>([])
  const [userToDelete, setUserToDelete] = useState('')
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailRecipient, setEmailRecipient] = useState<AdminUser | null>(null)
  
  // Invitation management state
  const [showInvitations, setShowInvitations] = useState(false)
  const [invitations, setInvitations] = useState<LocationInvitation[]>([])
  const [invitationSearchTerm, setInvitationSearchTerm] = useState('')
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [availableLocations, setAvailableLocations] = useState<Location[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  
  // Bulk invitation state
  const [bulkInviteMode, setBulkInviteMode] = useState(false)
  const [bulkEmails, setBulkEmails] = useState('')
  const [bulkInviteResults, setBulkInviteResults] = useState<{email: string, success: boolean, error?: string}[]>([])
  const [bulkInviteLoading, setBulkInviteLoading] = useState(false)

  useEffect(() => {
    if (session?.user?.email) {
      loadUsers()
    }
  }, [session])

  const loadUsers = async () => {
    if (!session?.user?.email) return

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load users')
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: AdminUser) => {
    setAnchorEl(event.currentTarget)
    setSelectedUser(user)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedUser(null)
  }

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user', userName: string) => {
    const confirmed = await confirmAsync(
      {
        title: `Change User Role`,
        message: `Are you sure you want to change ${userName}'s role to ${newRole}? ${
          newRole === 'admin' 
            ? 'This will give them full administrative privileges.' 
            : 'This will remove their administrative privileges.'
        }`,
        confirmText: `Change to ${newRole}`,
        variant: newRole === 'admin' ? 'warning' : 'primary'
      },
      async () => {
        const response = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: newRole })
        })

        if (response.ok) {
          await loadUsers() // Refresh the list
          await alert({
            title: 'Role Updated',
            message: `${userName}'s role has been successfully changed to ${newRole}.`,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update user role')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Update Failed',
        message: 'Failed to update user role. Please try again.',
        variant: 'error'
      })
    }
  }

  const cleanupUser = async () => {
    if (!cleanupEmail.trim()) {
      await alert({
        title: 'Email Required',
        message: 'Please enter the email address of the user to clean up.',
        variant: 'warning'
      })
      return
    }

    try {
      // First check if location ownership transfer is needed
      const response = await fetch(`${API_BASE}/api/admin/cleanup-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.user?.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_to_delete: cleanupEmail.trim() })
      })

      if (response.ok) {
        // User cleanup succeeded
        const result = await response.json()
        setCleanupDialogOpen(false)
        setCleanupEmail('')
        await loadUsers()
        await alert({
          title: 'User Cleaned Up',
          message: result.message,
          variant: 'success'
        })
      } else {
        const errorData = await response.json()
        
        if (errorData.requires_ownership_transfer) {
          // User owns locations - need to transfer ownership
          setOwnedLocations(errorData.owned_locations)
          setUserToDelete(cleanupEmail.trim())
          setSelectedOwners({})
          
          // Load available admins
          const adminsResponse = await fetch(`${API_BASE}/api/admin/available-admins`, {
            headers: {
              'Authorization': `Bearer ${session?.user?.email}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (adminsResponse.ok) {
            const admins = await adminsResponse.json()
            setAvailableAdmins(admins)
            setCleanupDialogOpen(false)
            setOwnershipTransferDialogOpen(true)
          } else {
            throw new Error('Failed to load available admins')
          }
        } else {
          throw new Error(errorData.error || 'Failed to cleanup user')
        }
      }
    } catch (error) {
      console.error('Error cleaning up user:', error)
      await alert({
        title: 'Cleanup Failed',
        message: error instanceof Error ? error.message : 'Failed to cleanup user. Please try again.',
        variant: 'error'
      })
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email

    const confirmed = await confirmAsync(
      {
        title: 'Delete User Account',
        message: `Are you sure you want to permanently delete ${userName} (${user.email})?\n\nThis will:\n• Delete the user account\n• Preserve all books they added (but remove author reference)\n• Remove them from all locations\n\nThis action cannot be undone!`,
        confirmText: 'Delete User',
        variant: 'danger'
      },
      async () => {
        // The actual deletion logic moved to here
      }
    )

    if (!confirmed) {
      return
    }

    try {
      // First check if location ownership transfer is needed
      const response = await fetch(`${API_BASE}/api/admin/cleanup-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.user?.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_to_delete: user.email })
      })

      if (response.ok) {
        // User deletion succeeded
        const result = await response.json()
        await loadUsers()
        await alert({
          title: 'User Deleted',
          message: result.message,
          variant: 'success'
        })
      } else {
        const errorData = await response.json()
        
        if (errorData.requires_ownership_transfer) {
          // User owns locations - need to transfer ownership
          setOwnedLocations(errorData.owned_locations)
          setUserToDelete(user.email)
          setSelectedOwners({})
          
          // Load available admins
          const adminsResponse = await fetch(`${API_BASE}/api/admin/available-admins`, {
            headers: {
              'Authorization': `Bearer ${session?.user?.email}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (adminsResponse.ok) {
            const admins = await adminsResponse.json()
            setAvailableAdmins(admins)
            setOwnershipTransferDialogOpen(true)
          } else {
            throw new Error('Failed to load available admins')
          }
        } else {
          throw new Error(errorData.error || 'Failed to delete user')
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      await alert({
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete user. Please try again.',
        variant: 'error'
      })
    }
  }

  const sendEmail = async () => {
    if (!emailRecipient || !emailSubject.trim() || !emailMessage.trim()) {
      await alert({
        title: 'Missing Information',
        message: 'Please fill in both subject and message fields.',
        variant: 'warning'
      })
      return
    }

    try {
      // For now, we'll simulate sending an email by showing the composed message
      // In the future, this could integrate with a real email service
      await alert({
        title: 'Email Composed',
        message: `Email would be sent to: ${emailRecipient.email}\nSubject: ${emailSubject}\n\nMessage: ${emailMessage}`,
        variant: 'info'
      })
      
      setEmailDialogOpen(false)
      setEmailSubject('')
      setEmailMessage('')
      setEmailRecipient(null)
    } catch (error) {
      console.error('Error sending email:', error)
      await alert({
        title: 'Email Failed',
        message: 'Failed to send email. Please try again.',
        variant: 'error'
      })
    }
  }

  const completeOwnershipTransfer = async () => {
    // Validate all locations have new owners assigned
    const unassignedLocations = ownedLocations.filter(loc => !selectedOwners[loc.id])
    if (unassignedLocations.length > 0) {
      await alert({
        title: 'Missing Assignments',
        message: `Please assign new owners for all locations: ${unassignedLocations.map(loc => loc.name).join(', ')}`,
        variant: 'warning'
      })
      return
    }

    const confirmed = await confirmAsync(
      {
        title: 'Transfer Ownership & Delete User',
        message: `This will:\n\n• Transfer ownership of ${ownedLocations.length} location(s) to selected admins\n• Preserve all books and shelves\n• Delete the user "${userToDelete}"\n\nBooks added by this user will remain but no longer show the original author. This action cannot be undone!`,
        confirmText: 'Transfer & Delete User',
        variant: 'danger'
      },
      async () => {
        const response = await fetch(`${API_BASE}/api/admin/cleanup-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.user?.email}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email_to_delete: userToDelete,
            new_location_owners: selectedOwners
          })
        })

        if (response.ok) {
          const result = await response.json()
          setOwnershipTransferDialogOpen(false)
          setCleanupEmail('')
          setUserToDelete('')
          setOwnedLocations([])
          setSelectedOwners({})
          await loadUsers()
          await alert({
            title: 'User Cleaned Up',
            message: result.message,
            variant: 'success'
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to complete ownership transfer')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Transfer Failed',
        message: 'Ownership transfer was cancelled.',
        variant: 'error'
      })
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getRoleChip = (role: string, verified: boolean) => {
    if (role === 'admin') {
      return <Chip icon={<Security />} label="Admin" color="primary" size="small" />
    }
    return (
      <Chip 
        icon={verified ? <CheckCircle /> : <Cancel />} 
        label={verified ? "User" : "Unverified"} 
        color={verified ? "success" : "warning"} 
        size="small" 
      />
    )
  }

  const getProviderChip = (provider: string) => {
    const color = provider === 'google' ? 'info' : 'default'
    return <Chip label={provider} color={color} size="small" variant="outlined" />
  }

  // Invitation Management Functions
  const loadInvitations = async () => {
    if (!session?.user?.email) return
    
    try {
      setInvitationsLoading(true)
      
      // First, get all locations the user has access to
      const locationsResponse = await fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      })
      
      if (!locationsResponse.ok) {
        throw new Error('Failed to load locations')
      }
      
      const locations = await locationsResponse.json()
      
      // Then fetch invitations for each location
      const allInvitations: LocationInvitation[] = []
      
      for (const location of locations) {
        try {
          const invitationsResponse = await fetch(`${API_BASE}/api/locations/${location.id}/invitations`, {
            headers: {
              'Authorization': `Bearer ${session.user.email}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-cache'
          })
          
          if (invitationsResponse.ok) {
            const locationInvitations = await invitationsResponse.json()
            // Add location name to each invitation
            const enrichedInvitations = locationInvitations.map((inv: any) => ({
              ...inv,
              location_name: location.name
            }))
            allInvitations.push(...enrichedInvitations)
          }
        } catch (error) {
          console.error(`Error loading invitations for location ${location.name}:`, error)
          // Continue with other locations even if one fails
        }
      }
      
      setInvitations(allInvitations)
      setError('')
    } catch (error) {
      console.error('Error loading invitations:', error)
      setError('Failed to load invitations')
    } finally {
      setInvitationsLoading(false)
    }
  }

  const loadAvailableLocations = async () => {
    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations`, {
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAvailableLocations(data)
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bulkInviteMode) {
      await sendBulkInvitations()
    } else {
      await sendSingleInvitation()
    }
  }

  const sendSingleInvitation = async () => {
    if (!inviteEmail.trim() || !selectedLocationId) return
    if (!session?.user?.email) return
    
    try {
      const response = await fetch(`${API_BASE}/api/locations/${selectedLocationId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.email}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invited_email: inviteEmail.trim(),
        }),
      })

      if (response.ok) {
        setInviteEmail('')
        setSelectedLocationId(null)
        setInvitationDialogOpen(false)
        await alert({
          title: 'Invitation Sent',
          message: `Invitation successfully sent to ${inviteEmail}`,
          variant: 'success'
        })
        // Force refresh invitations list
        setInvitations([]) // Clear first to force re-render
        await loadInvitations()
      } else {
        const errorData = await response.json()
        await alert({
          title: 'Invitation Failed',
          message: errorData.error || 'Failed to send invitation',
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      await alert({
        title: 'Invitation Failed',
        message: 'Failed to send invitation. Please try again.',
        variant: 'error'
      })
    }
  }

  const sendBulkInvitations = async () => {
    if (!bulkEmails.trim() || !selectedLocationId) return
    if (!session?.user?.email) return

    setBulkInviteLoading(true)
    setBulkInviteResults([])

    // Parse emails - support comma, semicolon, and newline separation
    const emailList = bulkEmails
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (emailList.length === 0) {
      setBulkInviteLoading(false)
      await alert({
        title: 'No Emails',
        message: 'Please enter at least one email address.',
        variant: 'warning'
      })
      return
    }

    const results: {email: string, success: boolean, error?: string}[] = []

    // Send invitations one by one to get individual results
    for (const email of emailList) {
      try {
        const response = await fetch(`${API_BASE}/api/locations/${selectedLocationId}/invite`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.user.email}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invited_email: email,
          }),
        })

        if (response.ok) {
          results.push({ email, success: true })
        } else {
          const errorData = await response.json()
          results.push({ email, success: false, error: errorData.error || 'Failed to send' })
        }
      } catch (error) {
        results.push({ email, success: false, error: 'Network error' })
      }
    }

    setBulkInviteResults(results)
    setBulkInviteLoading(false)

    const successCount = results.filter(r => r.success).length
    const failCount = results.length - successCount

    if (failCount === 0) {
      setBulkEmails('')
      setSelectedLocationId(null)
      setInvitationDialogOpen(false)
      await alert({
        title: 'All Invitations Sent',
        message: `Successfully sent ${successCount} invitation(s)!`,
        variant: 'success'
      })
      setInvitations([]) // Clear first to force re-render
      await loadInvitations()
    } else {
      await alert({
        title: 'Bulk Invitation Results',
        message: `${successCount} succeeded, ${failCount} failed. See details below.`,
        variant: successCount > 0 ? 'warning' : 'error'
      })
      // Don't close dialog so user can see results and retry failed ones
      if (successCount > 0) {
        setInvitations([]) // Clear first to force re-render
        await loadInvitations()
      }
    }
  }

  const revokeInvitation = async (invitationId: number, invitedEmail: string) => {
    const confirmed = await confirmAsync(
      {
        title: 'Revoke Invitation',
        message: `Are you sure you want to revoke the invitation for ${invitedEmail}? This action cannot be undone.`,
        confirmText: 'Revoke Invitation',
        variant: 'warning'
      },
      async () => {
        if (!session?.user?.email) throw new Error('Not authenticated')
        
        const response = await fetch(`${API_BASE}/api/invitations/${invitationId}/revoke`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.user.email}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          await alert({
            title: 'Invitation Revoked',
            message: `Invitation for ${invitedEmail} has been successfully revoked.`,
            variant: 'success'
          })
          // Force refresh invitations list
          setInvitations([]) // Clear first to force re-render
          await loadInvitations()
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to revoke invitation')
        }
      }
    )

    if (!confirmed) {
      await alert({
        title: 'Revoke Failed',
        message: 'Failed to revoke the invitation. Please try again.',
        variant: 'error'
      })
    }
  }

  const formatInvitationDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getInvitationStatus = (invitation: LocationInvitation) => {
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (invitation.used_at) {
      return { status: 'accepted', color: 'success' as const, label: 'Accepted' }
    } else if (expiresAt < now) {
      return { status: 'expired', color: 'error' as const, label: 'Expired' }
    } else {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft <= 1) {
        return { status: 'expiring', color: 'warning' as const, label: 'Expires Soon' }
      }
      return { status: 'pending', color: 'info' as const, label: 'Pending' }
    }
  }

  const getInvitationAnalytics = () => {
    const total = invitations.length
    const accepted = invitations.filter(inv => inv.used_at).length
    const pending = invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) > new Date()).length
    const expired = invitations.filter(inv => !inv.used_at && new Date(inv.expires_at) <= new Date()).length
    
    return { total, accepted, pending, expired }
  }

  const filteredInvitations = invitations.filter(invitation => {
    if (!invitationSearchTerm) return true
    const searchLower = invitationSearchTerm.toLowerCase()
    return (
      invitation.invited_email.toLowerCase().includes(searchLower) ||
      invitation.location_name?.toLowerCase().includes(searchLower) ||
      invitation.invited_by_name?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography color="text.secondary">
          Loading users...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          👥 User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={showInvitations ? "contained" : "outlined"}
            startIcon={<Email />}
            onClick={async () => {
              setShowInvitations(!showInvitations)
              if (!showInvitations) {
                await loadInvitations()
                await loadAvailableLocations()
              }
            }}
            size="small"
          >
            Invitations
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadUsers}
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role & Status</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">Activity</TableCell>
                  <TableCell align="right">Joined</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name'
                  const isCurrentUser = user.email === session?.user?.email
                  
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {displayName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {getRoleChip(user.user_role, user.email_verified)}
                          {isCurrentUser && (
                            <Chip label="You" color="secondary" size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        {getProviderChip(user.auth_provider)}
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2">
                            📚 {user.books_added} books
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            📍 {user.locations_joined} locations
                          </Typography>
                          {user.last_book_added && (
                            <Typography variant="caption" color="text.secondary">
                              Last: {formatDate(user.last_book_added)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatDate(user.created_at)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleMenuClick(e, user)}
                          size="small"
                          disabled={isCurrentUser && user.user_role === 'admin'} // Prevent admin from changing their own role
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Invitations Section */}
      {showInvitations && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                📧 Invitation Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => setInvitationDialogOpen(true)}
                size="small"
              >
                Send Invitation
              </Button>
            </Box>

            {invitations.length > 0 && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  {(() => {
                    const analytics = getInvitationAnalytics()
                    return (
                      <>
                        <Chip label={`Total: ${analytics.total}`} variant="outlined" />
                        <Chip label={`Accepted: ${analytics.accepted}`} color="success" variant="outlined" />
                        <Chip label={`Pending: ${analytics.pending}`} color="info" variant="outlined" />
                        {analytics.expired > 0 && (
                          <Chip label={`Expired: ${analytics.expired}`} color="error" variant="outlined" />
                        )}
                      </>
                    )
                  })()}
                </Box>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Search invitations by email, location, or sender..."
                    value={invitationSearchTerm}
                    onChange={(e) => setInvitationSearchTerm(e.target.value)}
                    fullWidth
                    sx={{ maxWidth: 400 }}
                  />
                </Box>
              </>
            )}

            {invitationsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
                <Typography sx={{ ml: 2 }} color="text.secondary">
                  Loading invitations...
                </Typography>
              </Box>
            ) : invitations.length === 0 ? (
              <Alert severity="info">
                No pending invitations found. Send invitations to add new users to locations.
              </Alert>
            ) : filteredInvitations.length === 0 ? (
              <Alert severity="info">
                No invitations match your search criteria. Try a different search term.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Invited By</TableCell>
                      <TableCell>Sent</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredInvitations.map((invitation) => (
                      <TableRow key={invitation.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {invitation.invited_email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {invitation.location_name || `Location ${invitation.location_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {invitation.invited_by_name || 'Admin'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatInvitationDate(invitation.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatInvitationDate(invitation.expires_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const statusInfo = getInvitationStatus(invitation)
                            return (
                              <Chip
                                label={statusInfo.label}
                                color={statusInfo.color}
                                size="small"
                              />
                            )
                          })()}
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            const statusInfo = getInvitationStatus(invitation)
                            const canRevoke = statusInfo.status === 'pending' || statusInfo.status === 'expiring'
                            
                            return canRevoke ? (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => revokeInvitation(invitation.id, invitation.invited_email)}
                                title="Revoke invitation"
                              >
                                <Cancel />
                              </IconButton>
                            ) : null
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedUser && selectedUser.user_role === 'user' && (
          <MenuItem 
            onClick={() => {
              handleMenuClose()
              updateUserRole(selectedUser.id, 'admin', `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email)
            }}
          >
            <Security sx={{ mr: 1 }} />
            Promote to Admin
          </MenuItem>
        )}
        
        {selectedUser && selectedUser.user_role === 'admin' && selectedUser.email !== session?.user?.email && (
          <MenuItem 
            onClick={() => {
              handleMenuClose()
              updateUserRole(selectedUser.id, 'user', `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email)
            }}
          >
            <Person sx={{ mr: 1 }} />
            Demote to User
          </MenuItem>
        )}
        
        {selectedUser && (
          <MenuItem 
            onClick={() => {
              handleMenuClose()
              setEmailRecipient(selectedUser)
              setEmailSubject('')
              setEmailMessage('')
              setEmailDialogOpen(true)
            }}
          >
            <Email sx={{ mr: 1 }} />
            Email
          </MenuItem>
        )}
        
        {selectedUser && selectedUser.email !== session?.user?.email && (
          <MenuItem 
            onClick={() => {
              handleMenuClose()
              handleDeleteUser(selectedUser)
            }}
            sx={{ color: 'error.main' }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete User
          </MenuItem>
        )}
      </Menu>

      {/* User Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>⚠️ Cleanup User Account</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            This action will permanently delete a user and ALL their associated data. Use with extreme caution.
          </Typography>
          <TextField
            autoFocus
            label="User Email to Delete"
            type="email"
            fullWidth
            value={cleanupEmail}
            onChange={(e) => setCleanupEmail(e.target.value)}
            placeholder="user@example.com"
            sx={{ mt: 2 }}
            helperText="Type the exact email address of the user you want to delete"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={cleanupUser} 
            color="error" 
            variant="contained"
            disabled={!cleanupEmail.trim()}
          >
            Delete User & All Data
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ownership Transfer Dialog */}
      <Dialog 
        open={ownershipTransferDialogOpen} 
        onClose={() => setOwnershipTransferDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>🏢 Transfer Location Ownership</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            The user "{userToDelete}" owns {ownedLocations.length} location(s). Before deleting the user, you must assign new admin owners for each location.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Books and shelves will be preserved. Books added by this user will remain but no longer show the original author.
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Location Ownership Assignments:
          </Typography>
          
          <List>
            {ownedLocations.map((location) => (
              <ListItem key={location.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ListItemText 
                  primary={location.name}
                  secondary={`Location ID: ${location.id}`}
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>New Owner</InputLabel>
                  <Select
                    value={selectedOwners[location.id] || ''}
                    onChange={(e) => setSelectedOwners(prev => ({
                      ...prev,
                      [location.id]: e.target.value
                    }))}
                    label="New Owner"
                  >
                    {availableAdmins.map((admin) => (
                      <MenuItem key={admin.id} value={admin.id}>
                        {admin.first_name && admin.last_name 
                          ? `${admin.first_name} ${admin.last_name} (${admin.email})`
                          : admin.email
                        }
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOwnershipTransferDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={completeOwnershipTransfer}
            color="error" 
            variant="contained"
            disabled={ownedLocations.some(loc => !selectedOwners[loc.id])}
          >
            Transfer Ownership & Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📧 Send Email</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sending email to: <strong>{emailRecipient?.email}</strong>
          </Typography>
          
          <TextField
            autoFocus
            label="Subject"
            fullWidth
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Enter email subject"
            sx={{ mb: 2 }}
          />
          
          <TextField
            label="Message"
            fullWidth
            multiline
            rows={6}
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            placeholder="Enter your message"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={sendEmail} 
            color="primary" 
            variant="contained"
            disabled={!emailSubject.trim() || !emailMessage.trim()}
            startIcon={<Email />}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invitation Dialog */}
      <Dialog 
        open={invitationDialogOpen} 
        onClose={() => {
          setInvitationDialogOpen(false)
          setInviteEmail('')
          setBulkEmails('')
          setSelectedLocationId(null)
          setBulkInviteMode(false)
          setBulkInviteResults([])
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          📧 Send Location Invitation{bulkInviteMode ? 's (Bulk Mode)' : ''}
        </DialogTitle>
        <form onSubmit={sendInvitation}>
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {bulkInviteMode 
                  ? 'Send invitations to multiple users at once.'
                  : 'Send an invitation to add a new user to a specific location.'
                }
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setBulkInviteMode(!bulkInviteMode)
                  setInviteEmail('')
                  setBulkEmails('')
                  setBulkInviteResults([])
                }}
              >
                {bulkInviteMode ? 'Single Mode' : 'Bulk Mode'}
              </Button>
            </Box>
            
            {bulkInviteMode ? (
              <TextField
                label="Email Addresses"
                multiline
                rows={6}
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                fullWidth
                required
                sx={{ mb: 3 }}
                placeholder="user1@example.com, user2@example.com&#10;user3@example.com&#10;user4@example.com"
                helperText="Separate multiple emails with commas, semicolons, or new lines"
              />
            ) : (
              <TextField
                label="Email Address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                fullWidth
                required
                sx={{ mb: 3 }}
                placeholder="user@example.com"
              />
            )}

            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>Select Location</InputLabel>
              <Select
                value={selectedLocationId || ''}
                onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                label="Select Location"
              >
                {availableLocations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {location.name}
                      </Typography>
                      {location.description && (
                        <Typography variant="body2" color="text.secondary">
                          {location.description}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Bulk invitation results */}
            {bulkInviteResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Results:
                </Typography>
                <List dense>
                  {bulkInviteResults.map((result, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={result.email}
                        secondary={result.success ? '✅ Sent successfully' : `❌ ${result.error}`}
                        secondaryTypographyProps={{
                          color: result.success ? 'success.main' : 'error.main'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setInvitationDialogOpen(false)
                setInviteEmail('')
                setBulkEmails('')
                setSelectedLocationId(null)
                setBulkInviteMode(false)
                setBulkInviteResults([])
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={
                bulkInviteLoading ||
                !selectedLocationId ||
                (bulkInviteMode ? !bulkEmails.trim() : !inviteEmail.trim())
              }
              startIcon={bulkInviteLoading ? <CircularProgress size={16} /> : undefined}
            >
              {bulkInviteLoading 
                ? 'Sending...' 
                : bulkInviteMode 
                  ? 'Send Bulk Invitations' 
                  : 'Send Invitation'
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal Components */}
      {modalState.type === 'confirm' && (
        <ConfirmationModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onConfirm={modalState.onConfirm!}
          title={modalState.options.title}
          message={modalState.options.message}
          confirmText={modalState.options.confirmText}
          cancelText={modalState.options.cancelText}
          variant={modalState.options.variant}
          loading={modalState.loading}
        />
      )}
      
      {modalState.type === 'alert' && (
        <AlertModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.options.title}
          message={modalState.options.message}
          variant={modalState.options.variant}
          buttonText={modalState.options.buttonText}
        />
      )}
    </Box>
  )
}