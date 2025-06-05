'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeContextProvider } from '@/lib/ThemeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeContextProvider>
        {children}
      </ThemeContextProvider>
    </SessionProvider>
  )
}