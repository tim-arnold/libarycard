import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'

// Temporary in-memory storage for testing
let mockLocations: any[] = []

export async function GET() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    const userLocations = mockLocations.filter(loc => loc.owner_id === session.user.email)
    return NextResponse.json(userLocations)
  }

  try {
    const response = await fetch(`${API_BASE}/api/locations`, {
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
    console.error('Failed to fetch locations:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    try {
      const body = await request.json()
      
      const newLocation = {
        id: Date.now(),
        name: body.name,
        description: body.description || null,
        owner_id: session.user.email,
        created_at: new Date().toISOString()
      }
      
      mockLocations.push(newLocation)
      return NextResponse.json(newLocation)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
  }

  try {
    const body = await request.json()
    
    const response = await fetch(`${API_BASE}/api/locations`, {
      method: 'POST',
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
    console.error('Failed to create location:', error)
    console.error('API_BASE:', API_BASE)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ 
      error: 'Failed to create location', 
      details: error instanceof Error ? error.message : String(error),
      apiBase: API_BASE 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const locationId = url.searchParams.get('id')
  
  if (!locationId) {
    return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
  }

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    try {
      const body = await request.json()
      const locationIndex = mockLocations.findIndex(
        loc => loc.id === parseInt(locationId) && loc.owner_id === session.user.email
      )
      
      if (locationIndex === -1) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      
      mockLocations[locationIndex] = {
        ...mockLocations[locationIndex],
        name: body.name,
        description: body.description || null
      }
      
      return NextResponse.json(mockLocations[locationIndex])
    } catch (error) {
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
  }

  // Workers API call would go here
  return NextResponse.json({ error: 'Workers API not implemented yet' }, { status: 501 })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const locationId = url.searchParams.get('id')
  
  if (!locationId) {
    return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
  }

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    try {
      const locationIndex = mockLocations.findIndex(
        loc => loc.id === parseInt(locationId) && loc.owner_id === session.user.email
      )
      
      if (locationIndex === -1) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      
      mockLocations.splice(locationIndex, 1)
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
  }

  // Workers API call would go here
  return NextResponse.json({ error: 'Workers API not implemented yet' }, { status: 501 })
}