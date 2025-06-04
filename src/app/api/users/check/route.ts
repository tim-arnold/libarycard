import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${API_BASE}/api/users/check?email=${encodeURIComponent(email)}`)
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    } else {
      // If user doesn't exist, return exists: false
      return NextResponse.json({ exists: false })
    }
  } catch (error) {
    console.error('Failed to check user existence:', error)
    // Default to false if there's an error
    return NextResponse.json({ exists: false })
  }
}