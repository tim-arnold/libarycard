import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'

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
    const { email, password, firstName, lastName } = await request.json()

    if (!email || !password || !firstName) {
      return NextResponse.json({ 
        error: 'Email, password, and first name are required' 
      }, { status: 400 })
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    // For development - simulate successful registration
    if (process.env.NODE_ENV === 'development') {
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json({ 
        message: 'Registration successful! Please check your email to verify your account.',
        userId: 'dev-user-' + Date.now()
      });
    }

    // Call the workers API to register user
    console.log('Calling Workers API at:', `${API_BASE}/api/auth/register`)
    
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        first_name: firstName, 
        last_name: lastName || '' 
      }),
    })

    console.log('Workers API response status:', response.status)

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json(result)
    } else {
      let errorMessage
      try {
        const error = await response.json()
        errorMessage = error.error || 'Unknown error from API'
        console.log('Workers API error:', error)
      } catch (e) {
        errorMessage = `API returned ${response.status}: ${response.statusText}`
        console.log('Failed to parse error response:', e)
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}