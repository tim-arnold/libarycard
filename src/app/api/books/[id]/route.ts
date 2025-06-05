import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.libarycard.tim52.io'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const response = await fetch(`${API_BASE}/api/books/${params.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.user.email}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Worker responded with ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update book:', error)
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    
    let endpoint = ''
    if (action === 'checkout') {
      endpoint = `${API_BASE}/api/books/${params.id}/checkout`
    } else if (action === 'checkin') {
      endpoint = `${API_BASE}/api/books/${params.id}/checkin`
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be checkout or checkin' }, { status: 400 })
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.user.email}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Worker API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        endpoint,
        action
      })
      throw new Error(`Worker responded with ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to perform checkout/checkin:', error)
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await fetch(`${API_BASE}/api/books/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.user.email}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Worker responded with ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to delete book:', error)
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 })
  }
}