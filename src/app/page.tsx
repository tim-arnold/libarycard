'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ISBNScanner from '@/components/ISBNScanner'
import BookLibrary from '@/components/BookLibrary'
import LocationManager from '@/components/LocationManager'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'scan' | 'library' | 'locations'>('locations')

  if (status === 'loading') {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className="container">
      <header style={{ padding: '2rem 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1>📚 LibaryCard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9em', color: '#666' }}>
              Hello, {session.user?.name?.split(' ')[0]}!
            </span>
            <button onClick={handleSignOut} className="btn btn-secondary" style={{ fontSize: '0.8em', padding: '0.5rem 1rem' }}>
              Sign Out
            </button>
          </div>
        </div>
        <p>Scan and manage your personal book collection</p>
      </header>

      <nav style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <button
          className={`btn ${activeTab === 'locations' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('locations')}
          style={{ marginRight: '1rem' }}
        >
          🏠 Locations
        </button>
        <button
          className={`btn ${activeTab === 'scan' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('scan')}
          style={{ marginRight: '1rem' }}
        >
          📱 Scan Books
        </button>
        <button
          className={`btn ${activeTab === 'library' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('library')}
        >
          📖 My Libary
        </button>
      </nav>

      {activeTab === 'locations' && <LocationManager />}
      {activeTab === 'scan' && <ISBNScanner />}
      {activeTab === 'library' && <BookLibrary />}
    </div>
  )
}