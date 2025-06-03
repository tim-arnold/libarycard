import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Call the workers API to verify credentials
    const response = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) {
      const user = await response.json()
      return NextResponse.json(user)
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}