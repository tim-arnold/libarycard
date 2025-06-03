'use client'

import { useState } from 'react'
import ISBNScanner from '@/components/ISBNScanner'
import BookLibrary from '@/components/BookLibrary'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'scan' | 'library'>('scan')

  return (
    <div className="container">
      <header style={{ padding: '2rem 0', textAlign: 'center' }}>
        <h1>📚 LibraryCard</h1>
        <p>Scan and manage your personal book collection</p>
      </header>

      <nav style={{ marginBottom: '2rem', textAlign: 'center' }}>
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
          📖 My Library
        </button>
      </nav>

      {activeTab === 'scan' && <ISBNScanner />}
      {activeTab === 'library' && <BookLibrary />}
    </div>
  )
}