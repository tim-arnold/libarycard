import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8787'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate required fields
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Forward to Workers API
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim() }),
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.error || 'Failed to send reset email' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Forgot password route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}