import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

// Temporarily force direct Workers domain to resolve 404 issues
const API_BASE = 'https://libarycard-api.tim-arnold.workers.dev'

export async function GET(request: NextRequest) {
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