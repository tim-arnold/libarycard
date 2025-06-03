import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}