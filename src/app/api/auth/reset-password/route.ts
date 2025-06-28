import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8787'

function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters long` };
  }
  if (!hasUpperCase) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumbers) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, error: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)' };
  }
  return { isValid: true };
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    // Validate required fields
    if (!token?.trim()) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      )
    }

    if (!password?.trim()) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    // Forward to Workers API
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: token.trim(), password }),
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.error || 'Failed to reset password' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Reset password route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}