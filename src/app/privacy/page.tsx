'use client'

import { Container, Typography, Paper, Box, Link } from '@mui/material'
import { useRouter } from 'next/navigation'
import { ArrowBack } from '@mui/icons-material'
import { IconButton } from '@mui/material'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.back()} aria-label="Go back">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Privacy Policy
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Typography variant="body1" paragraph>
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Information Collection and Use
        </Typography>
        <Typography variant="body1" paragraph>
          LibraryCard is a personal library management application. We collect and store information 
          you provide to help you manage your book collection, including:
        </Typography>
        <ul>
          <li>Account information (name, email) for authentication</li>
          <li>Book data you add to your library (titles, authors, ISBNs)</li>
          <li>Location and shelf information you create</li>
          <li>Usage preferences and settings</li>
        </ul>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Cookies and Local Storage
        </Typography>
        <Typography variant="body1" paragraph>
          We use cookies and browser local storage to enhance your experience:
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Essential Cookies (Required)
        </Typography>
        <ul>
          <li><strong>Authentication cookies:</strong> Provided by NextAuth.js to maintain your login session</li>
          <li><strong>Security cookies:</strong> CSRF protection and callback URL management</li>
        </ul>
        <Typography variant="body1" paragraph>
          These cookies are essential for the application to function and cannot be disabled.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Functional Storage (Optional)
        </Typography>
        <ul>
          <li><strong>Theme preference:</strong> Remembers your dark/light mode setting</li>
          <li><strong>View preferences:</strong> Remembers your preferred book view (card/list)</li>
          <li><strong>Interface settings:</strong> Remembers your last selected shelf and active tabs</li>
          <li><strong>Offline fallback:</strong> Temporary book data storage when the server is unavailable</li>
        </ul>
        <Typography variant="body1" paragraph>
          You can disable functional storage through our cookie consent banner. The app will 
          continue to work, but won't remember your preferences between sessions.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Data Storage and Security
        </Typography>
        <Typography variant="body1" paragraph>
          Your library data is stored securely in our database. We use industry-standard 
          security practices including encrypted connections and secure authentication.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Third-Party Services
        </Typography>
        <Typography variant="body1" paragraph>
          We integrate with the following third-party services:
        </Typography>
        <ul>
          <li><strong>Google Books API:</strong> To fetch book information and cover images</li>
          <li><strong>Open Library:</strong> For additional book metadata and cover images</li>
          <li><strong>Google OAuth:</strong> For authentication (if you choose to sign in with Google)</li>
          <li><strong>Google Vision API:</strong> For OCR processing of bookshelf photos</li>
        </ul>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Your Rights
        </Typography>
        <Typography variant="body1" paragraph>
          You have the right to:
        </Typography>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and associated data</li>
          <li>Export your library data</li>
          <li>Control cookie and storage preferences</li>
        </ul>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Contact Information
        </Typography>
        <Typography variant="body1" paragraph>
          If you have questions about this privacy policy or your data, please contact us 
          through the app's contact form or at the email address provided in your account settings.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Changes to This Policy
        </Typography>
        <Typography variant="body1" paragraph>
          We may update this privacy policy from time to time. We will notify users of any 
          significant changes through the application or via email.
        </Typography>

        <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            This privacy policy is part of LibraryCard's commitment to transparency and user privacy.
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}