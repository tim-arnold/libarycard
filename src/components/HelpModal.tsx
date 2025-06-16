'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Alert,
  IconButton,
  CircularProgress,
} from '@mui/material'
import {
  ExpandMore,
  Close,
  QrCodeScanner,
  LibraryBooks,
  LocationOn,
  Search,
  AccountCircle,
  AdminPanelSettings,
} from '@mui/icons-material'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

export default function HelpModal({ open, onClose }: HelpModalProps) {
  const { data: session } = useSession()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session && open) {
      fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
          setUserRole(data.user_role || 'user')
          setLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch user role:', err)
          setUserRole('user')
          setLoading(false)
        })
    } else if (!open) {
      setLoading(true)
    }
  }, [session, open])

  if (!session) {
    return null
  }

  const isAdmin = userRole === 'admin'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          LibraryCard Help
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading...</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Welcome to LibraryCard!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your personal book library management system. This guide will help you make the most of all features available to you.
              </Typography>
              
              {isAdmin && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminPanelSettings />
                    <Typography>
                      You have administrator privileges and can access all features including location management.
                    </Typography>
                  </Box>
                </Alert>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AccountCircle />
                    <Typography variant="h6">Getting Started</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" gutterBottom>
                    LibraryCard has {isAdmin ? 'three' : 'two'} main sections accessible via the top navigation:
                  </Typography>
                  <List>
                    <ListItem>
                      <QrCodeScanner sx={{ mr: 2 }} />
                      <ListItemText
                        primary="📱 Scan Books"
                        secondary="Add new books to your library using camera or manual entry"
                      />
                    </ListItem>
                    <ListItem>
                      <LibraryBooks sx={{ mr: 2 }} />
                      <ListItemText
                        primary="📖 My Library"
                        secondary="Browse and manage your book collection"
                      />
                    </ListItem>
                    {isAdmin && (
                      <ListItem>
                        <LocationOn sx={{ mr: 2 }} />
                        <ListItemText
                          primary="🏠 Location Management"
                          secondary="Organize your physical locations and shelves (Admin only)"
                        />
                      </ListItem>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <QrCodeScanner />
                    <Typography variant="h6">Adding Books</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="h6" gutterBottom>
                    Method 1: Camera Scanning
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="1. Click '📱 Scan Books' tab" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="2. Click 'Start Camera Scanner' button" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="3. Allow camera permissions when prompted" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="4. Position your phone camera over the book's barcode" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="5. Hold steady until the ISBN is detected" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="6. Book details will automatically load" />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    Method 2: Manual Entry
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="1. In the Scan Books section" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="2. Use the 'Or enter ISBN manually' field" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="3. Type the 13-digit ISBN (numbers only)" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="4. Click 'Look Up Book'" />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    Completing the Book Entry
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="1. Verify Details: Check that title, author, and cover are correct" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="2. Select Shelf: Choose from the organized dropdown menu" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="3. Add Tags (optional): Enter comma-separated tags like 'fiction, mystery, favorite'" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="4. Click 'Save to Library'" />
                    </ListItem>
                  </List>

                  {!isAdmin && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      If you don't have any locations available, contact an administrator to set up locations and shelves.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>

              {isAdmin && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LocationOn />
                      <Typography variant="h6">Location Management (Admin Only)</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="h6" gutterBottom>
                      Creating Your First Location
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="1. Click '🏠 Location Management' tab" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="2. Click 'Create Your First Location' button" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3. Enter a Location Name (e.g., 'Home', 'Office', 'Apartment')" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="4. Add an optional Description" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="5. Click 'Create Location'" />
                      </ListItem>
                    </List>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                      Each new location automatically gets a starter shelf called "my first shelf" that you can rename or organize as needed.
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                      Managing Locations
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Adding More Locations
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="1. In Location Management, click '+ Add Location'" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="2. Enter location name and description" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3. Click 'Create Location'" />
                      </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Editing Locations
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="1. Find the location card" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="2. Click the 'Edit' button" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3. Update name or description" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="4. Click 'Update Location'" />
                      </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Deleting Locations
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="1. Find the location card" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="2. Click the 'Delete' button" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3. Confirm deletion (this will also delete all shelves in that location)" />
                      </ListItem>
                    </List>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                      Managing Shelves
                    </Typography>
                    <Typography variant="subtitle1" gutterBottom>
                      Adding Shelves
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="1. Select a location by clicking on its card" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="2. In the 'Shelves' section, click '+ Add Shelf'" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3. Enter shelf name (e.g., 'Fiction', 'Cookbooks', 'Reference')" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="4. Click 'Add Shelf'" />
                      </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Editing Shelves
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="1. Find the shelf you want to edit" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="2. Click the 'Edit' button on the shelf card" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3. Update the shelf name" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="4. Click 'Update Shelf'" />
                      </ListItem>
                    </List>

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Deleting Shelves
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText primary="1. Find the shelf you want to remove" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="2. Click the 'Delete' button on the shelf card" />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="3. Confirm deletion" />
                      </ListItem>
                    </List>

                    <Alert severity="info" sx={{ mt: 2 }}>
                      Note: Deleting a shelf won't delete the books - they'll become unassigned and you can move them to other shelves.
                    </Alert>
                  </AccordionDetails>
                </Accordion>
              )}

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LibraryBooks />
                    <Typography variant="h6">Managing Your Library</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="h6" gutterBottom>
                    Library Overview
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    The "📖 My Library" section shows:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Total number of books" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Books distributed by location (visual summary)" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Search and filter options" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Complete book collection" />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    Search and Filtering
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Search Box
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Search by book title" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Search by author name" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Search by ISBN" />
                    </ListItem>
                  </List>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Location Filter
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Filter to show books in specific locations" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Use 'All locations' to see everything" />
                    </ListItem>
                  </List>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Category Filter
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Filter by book genres/categories" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Categories are automatically detected from book data" />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    Updating Books
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Change Location
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="1. Find the book in your library" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="2. Use the location dropdown on the book card" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="3. Select new location" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="4. Changes save automatically" />
                    </ListItem>
                  </List>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Remove Books
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="1. Find the book you want to remove" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="2. Click the red 'Remove' button" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="3. Confirm deletion when prompted" />
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Search />
                    <Typography variant="h6">Tips for Effective Organization</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="h6" gutterBottom>
                    Tagging Best Practices
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    Use consistent tag formats. Common useful tags:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Genre" 
                        secondary="fiction, non-fiction, mystery, sci-fi" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Status" 
                        secondary="read, unread, favorite, loaned" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Topic" 
                        secondary="cooking, history, reference, textbook" 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Condition" 
                        secondary="new, used, rare" 
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    Search Tips
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Search is case-insensitive" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Partial matches work for titles and authors" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Use specific terms for better results" />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    Mobile Usage
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Camera Scanning
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Works best with phone cameras" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Ensure good lighting" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Hold phone steady" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Position barcode clearly in camera view" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Portrait orientation recommended" />
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6">Troubleshooting</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="h6" gutterBottom>
                    Common Issues
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Book Not Found
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Try manual ISBN entry" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Check if ISBN is correct (13 digits)" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Some very old books may not be in databases" />
                    </ListItem>
                  </List>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Camera Issues
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Ensure you're on HTTPS (required for camera access)" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Check browser permissions for camera" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Try refreshing the page" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Use manual entry as backup" />
                    </ListItem>
                  </List>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Location/Tag Updates Not Saving
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Check your internet connection" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Ensure you selected a valid location" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Try refreshing and updating again" />
                    </ListItem>
                  </List>

                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Slow Performance
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Large libraries (1000+ books) may load slowly" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Use filters to reduce displayed books" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Regular exports help with data management" />
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Export and Backup
              </Typography>
              <Typography variant="body1" gutterBottom>
                Keep your data safe by regularly exporting your library:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="1. Go to '📖 My Library'" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="2. Click 'Export Library' button (top right)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="3. Downloads a JSON file with all your book data" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="4. Use this for backup or data portability" />
                </ListItem>
              </List>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}