import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.librarycard.tim52.io'

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

async function verifyTurnstile(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY || '',
        response: token,
      }),
    })

    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, invitationToken, turnstileToken } = await request.json()

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

    // Verify Turnstile token
    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Security verification required' },
        { status: 400 }
      )
    }

    const isValidTurnstile = await verifyTurnstile(turnstileToken)
    if (!isValidTurnstile) {
      return NextResponse.json(
        { error: 'Security verification failed' },
        { status: 400 }
      )
    }
    // For development - use production flow to test full verification process
    // if (process.env.NODE_ENV === 'development') {
    //   // Simulate some processing time
    //   await new Promise(resolve => setTimeout(resolve, 1000));
    //   
    //   return NextResponse.json({ 
    //     message: 'Registration successful! Please check your email to verify your account before signing in.',
    //     userId: 'dev-user-' + Date.now(),
    //     requires_verification: true
    //   });
    // }

    // Call the workers API to register user
    const apiUrl = `${API_BASE}/api/auth/register`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        first_name: firstName, 
        last_name: lastName || '',
        invitation_token: invitationToken
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json(result)
    } else {
      let errorMessage
      let responseText
      try {
        responseText = await response.text()
        
        // Try to parse as JSON first
        try {
          const error = JSON.parse(responseText)
          errorMessage = error.error || 'Unknown error from API'
        } catch {
          // If not JSON, use the raw text
          errorMessage = `API error: ${responseText}`
        }
      } catch {
        errorMessage = `API returned ${response.status}: ${response.statusText}`
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}