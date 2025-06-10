import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      authProvider?: string
    }
    accessToken?: string
  }
  
  interface User {
    id: string
    email: string
    name?: string
    authProvider?: string
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Call our API to verify credentials
          const baseUrl = process.env.NEXTAUTH_URL || 'https://libarycard.tim52.io'
          const response = await fetch(`${baseUrl}/api/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (response.ok) {
            const user = await response.json()
            return {
              id: user.id,
              email: user.email,
              name: `${user.first_name} ${user.last_name}`.trim(),
              authProvider: 'email'
            }
          }
        } catch (error) {
          console.error('Auth error:', error)
        }
        
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.userId = user.id
        token.authProvider = (user as any).authProvider || 'google'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        // Store user in database on first login (Google OAuth only)
        if (token.authProvider === 'google') {
          await storeUserIfNotExists(session.user, token.userId as string)
        }
        
        session.user.id = token.userId as string
        session.user.authProvider = token.authProvider as string
        session.accessToken = token.accessToken as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})

async function storeUserIfNotExists(user: any, userId: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'
    
    // First check if user exists
    const checkResponse = await fetch(`${apiUrl}/api/users/check?email=${encodeURIComponent(user.email)}`)
    if (checkResponse.ok) {
      const checkData = await checkResponse.json()
      if (checkData.exists) {
        // User already exists, don't overwrite
        return
      }
    }
    
    // User doesn't exist, create them
    const response = await fetch(`${apiUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        email: user.email,
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        auth_provider: 'google',
        email_verified: true, // Google accounts are pre-verified
      }),
    })
    
    if (!response.ok) {
      console.error('Failed to store user:', await response.text())
    }
  } catch (error) {
    console.error('Error storing user:', error)
  }
}

export { handler as GET, handler as POST }