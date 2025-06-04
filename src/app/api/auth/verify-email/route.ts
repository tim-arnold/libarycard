import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Verification token required' }, { status: 400 })
  }

  try {
    // Call the workers API to verify email
    const response = await fetch(`${API_BASE}/api/auth/verify-email?token=${token}`, {
      method: 'GET',
    })

    if (response.ok) {
      const result = await response.json()
      // Redirect to sign-in page with success message
      return NextResponse.redirect(new URL('/auth/signin?verified=true', request.url))
    } else {
      const error = await response.json()
      return NextResponse.redirect(new URL(`/auth/signin?error=${encodeURIComponent(error.error)}`, request.url))
    }
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', request.url))
  }
}