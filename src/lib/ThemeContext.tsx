'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createAppTheme } from './theme'
import { getStorageItem, setStorageItem } from './storage'

interface ThemeContextType {
  isDarkMode: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeContextProvider')
  }
  return context
}

interface ThemeContextProviderProps {
  children: React.ReactNode
}

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = getStorageItem('libarycard-theme', 'functional')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
    }
    setIsLoaded(true)
  }, [])

  // Save theme preference to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      setStorageItem('libarycard-theme', isDarkMode ? 'dark' : 'light', 'functional')
    }
  }, [isDarkMode, isLoaded])

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  // Don't render until we've loaded the preference to prevent flash
  if (!isLoaded) {
    return null
  }

  const theme = createAppTheme(isDarkMode)

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}