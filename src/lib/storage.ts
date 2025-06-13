interface ConsentSettings {
  essential: boolean
  functional: boolean
  timestamp: string
}

function getConsentSettings(): ConsentSettings | null {
  if (typeof window === 'undefined') return null
  
  try {
    const consent = localStorage.getItem('cookieConsent')
    return consent ? JSON.parse(consent) : null
  } catch {
    return null
  }
}

function hasConsentFor(category: 'essential' | 'functional'): boolean {
  const consent = getConsentSettings()
  
  // If no consent recorded yet, assume consent for backward compatibility
  if (!consent) return true
  
  return consent[category] || false
}

export function setStorageItem(key: string, value: string, category: 'essential' | 'functional' = 'functional'): boolean {
  if (typeof window === 'undefined') return false
  
  if (!hasConsentFor(category)) {
    return false
  }
  
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function getStorageItem(key: string, category: 'essential' | 'functional' = 'functional'): string | null {
  if (typeof window === 'undefined') return null
  
  if (!hasConsentFor(category)) {
    return null
  }
  
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function removeStorageItem(key: string, category: 'essential' | 'functional' = 'functional'): boolean {
  if (typeof window === 'undefined') return false
  
  if (!hasConsentFor(category)) {
    return false
  }
  
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function setSessionItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    sessionStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function getSessionItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}