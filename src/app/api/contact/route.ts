import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.libarycard.tim52.io'
  : 'http://localhost:8787'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
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
    const response = await fetch(`${API_BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, message }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Workers API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}