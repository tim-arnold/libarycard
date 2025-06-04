import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

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
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // For development - simulate user verification
    if (process.env.NODE_ENV === 'development') {
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For demo purposes, accept any valid email format with a strong password
      // (In real implementation, this would check against stored hashed passwords)
      const passwordValidation = validatePasswordStrength(password);
      if (email.includes('@') && passwordValidation.isValid) {
        return NextResponse.json({
          id: 'dev-user-123',
          email: email,
          first_name: 'Test',
          last_name: 'User',
          auth_provider: 'email'
        });
      } else {
        if (!passwordValidation.isValid) {
          return NextResponse.json({ error: 'Please verify your email first or check your password strength' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
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