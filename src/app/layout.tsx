import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import CookieNotice from '@/components/CookieNotice'

export const metadata: Metadata = {
  title: 'LibraryCard - Personal Book Collection',
  description: 'Scan and manage your personal book library',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <CookieNotice />
        </Providers>
      </body>
    </html>
  )
}