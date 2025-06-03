import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'

export async function GET() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${session.user.email}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const profile = await response.json()
      return NextResponse.json(profile)
    } else {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const response = await fetch(`${API_BASE}/api/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.user.email}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json(result)
    } else {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}