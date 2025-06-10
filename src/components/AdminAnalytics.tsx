'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material'
import {
  MenuBook,
  Person,
  TrendingUp,
  Category,
} from '@mui/icons-material'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

interface AnalyticsData {
  overview: {
    totalBooks: number
    totalUsers: number
    totalLocations: number
    pendingRequests: number
    unorganizedBooks: number
    recentBooks: number
    recentCheckouts: number
  }
  booksPerLocation: Array<{
    name: string
    book_count: number
  }>
  activeUsers: Array<{
    first_name: string
    last_name: string
    email: string
    books_added: number
  }>
  topGenres: Array<{
    genre: string
    count: number
  }>
  generatedAt: string
}

export default function AdminAnalytics() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user?.email) {
      loadAnalytics()
    }
  }, [session])

  const loadAnalytics = async () => {
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
        setAnalytics(data)
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load analytics')
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography color="text.secondary">
          Loading analytics...
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

  if (!analytics) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No analytics data available
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          📊 Library Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generated: {formatDate(analytics.generatedAt)}
        </Typography>
      </Box>

      <Box>
        {/* Books per Location and Most Active Users Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3, mb: 3 }}>
          <Card>
            <CardHeader 
              title="📍 Books per Location"
              avatar={<MenuBook color="primary" />}
            />
            <CardContent>
              {analytics.booksPerLocation.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No locations with books found
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Location</TableCell>
                        <TableCell align="right">Books</TableCell>
                        <TableCell align="right">%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.booksPerLocation.map((location, index) => {
                        const percentage = Math.round((location.book_count / analytics.overview.totalBooks) * 100)
                        return (
                          <TableRow key={index}>
                            <TableCell>{location.name}</TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={location.book_count} 
                                size="small" 
                                color={location.book_count > 0 ? "primary" : "default"}
                              />
                            </TableCell>
                            <TableCell align="right">{percentage}%</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader 
              title="👥 Most Active Users"
              avatar={<Person color="secondary" />}
            />
            <CardContent>
              {analytics.activeUsers.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No active users found
                </Typography>
              ) : (
                <List dense>
                  {analytics.activeUsers.slice(0, 8).map((user, index) => (
                    <ListItem key={index} divider={index < Math.min(analytics.activeUsers.length, 8) - 1}>
                      <ListItemIcon>
                        <TrendingUp color={index < 3 ? "primary" : "action"} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                        secondary={user.email}
                      />
                      <Chip 
                        label={`${user.books_added} books`}
                        size="small"
                        color={user.books_added > 10 ? "primary" : user.books_added > 5 ? "secondary" : "default"}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Second Row: Genres and Quick Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
          <Card>
            <CardHeader 
              title="📚 Popular Genres"
              avatar={<Category color="info" />}
            />
            <CardContent>
              {analytics.topGenres.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No genre data available
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Genre</TableCell>
                        <TableCell align="right">Books</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                        <TableCell align="right">Visual</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.topGenres.map((genre, index) => {
                        const percentage = Math.round((genre.count / analytics.overview.totalBooks) * 100)
                        const barWidth = Math.max(percentage, 2) // Minimum 2% for visibility
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">#{index + 1}</Typography>
                                <Typography variant="body1">{genre.genre}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={genre.count} 
                                size="small" 
                                color="primary"
                              />
                            </TableCell>
                            <TableCell align="right">{percentage}%</TableCell>
                            <TableCell align="right" sx={{ width: 100 }}>
                              <Box sx={{ 
                                width: '100%', 
                                height: 8, 
                                backgroundColor: 'action.hover',
                                borderRadius: 1,
                                overflow: 'hidden'
                              }}>
                                <Box sx={{
                                  width: `${barWidth}%`,
                                  height: '100%',
                                  backgroundColor: index < 3 ? 'primary.main' : 'secondary.main',
                                  transition: 'width 0.3s ease'
                                }} />
                              </Box>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="📈 Quick Stats" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Avg books per user:
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {analytics.overview.totalUsers > 0 
                      ? Math.round(analytics.overview.totalBooks / analytics.overview.totalUsers) 
                      : 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Avg books per location:
                  </Typography>
                  <Typography variant="h6" color="secondary">
                    {analytics.overview.totalLocations > 0 
                      ? Math.round(analytics.overview.totalBooks / analytics.overview.totalLocations) 
                      : 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Organization rate:
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {analytics.overview.totalBooks > 0
                      ? Math.round(((analytics.overview.totalBooks - analytics.overview.unorganizedBooks) / analytics.overview.totalBooks) * 100)
                      : 0}%
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Monthly growth:
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    +{analytics.overview.recentBooks}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Recent activity:
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {analytics.overview.recentCheckouts} checkouts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}