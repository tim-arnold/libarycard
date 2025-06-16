import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'

export async function GET() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await fetch(`${API_BASE}/api/books/checkout-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.user.email}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Worker responded with ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch checkout history:', error)
    return NextResponse.json({ error: 'Failed to fetch checkout history' }, { status: 500 })
  }
}