import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://libarycard-api.tim-arnold.workers.dev'

// Temporary in-memory storage for testing
let mockShelves: any[] = []

const DEFAULT_SHELVES = [
  'basement',
  "julie's room",
  "tim's room",
  'bench',
  "julie's office",
  'little library'
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    const locationId = parseInt(params.id)
    let locationShelves = mockShelves.filter(shelf => shelf.location_id === locationId)
    
    // If no shelves exist for this location, create default ones
    if (locationShelves.length === 0) {
      DEFAULT_SHELVES.forEach(shelfName => {
        const shelf = {
          id: Date.now() + Math.random(),
          name: shelfName,
          location_id: locationId,
          created_at: new Date().toISOString()
        }
        mockShelves.push(shelf)
        locationShelves.push(shelf)
      })
    }
    
    return NextResponse.json(locationShelves)
  }

  try {
    const response = await fetch(`${API_BASE}/api/locations/${params.id}/shelves`, {
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
    console.error('Failed to fetch shelves:', error)
    return NextResponse.json({ error: 'Failed to fetch shelves' }, { status: 500 })
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

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    try {
      const body = await request.json()
      const locationId = parseInt(params.id)
      
      const newShelf = {
        id: Date.now() + Math.random(),
        name: body.name,
        location_id: locationId,
        created_at: new Date().toISOString()
      }
      
      mockShelves.push(newShelf)
      return NextResponse.json(newShelf)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create shelf' }, { status: 500 })
    }
  }

  // Workers API call would go here
  return NextResponse.json({ error: 'Workers API not implemented yet' }, { status: 501 })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const shelfId = url.searchParams.get('shelfId')
  
  if (!shelfId) {
    return NextResponse.json({ error: 'Shelf ID required' }, { status: 400 })
  }

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    try {
      const body = await request.json()
      const shelfIndex = mockShelves.findIndex(shelf => shelf.id === parseFloat(shelfId))
      
      if (shelfIndex === -1) {
        return NextResponse.json({ error: 'Shelf not found' }, { status: 404 })
      }
      
      mockShelves[shelfIndex] = {
        ...mockShelves[shelfIndex],
        name: body.name
      }
      
      return NextResponse.json(mockShelves[shelfIndex])
    } catch (error) {
      return NextResponse.json({ error: 'Failed to update shelf' }, { status: 500 })
    }
  }

  // Workers API call would go here
  return NextResponse.json({ error: 'Workers API not implemented yet' }, { status: 501 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const shelfId = url.searchParams.get('shelfId')
  
  if (!shelfId) {
    return NextResponse.json({ error: 'Shelf ID required' }, { status: 400 })
  }

  // Use mock data if no workers server
  if (!process.env.NEXT_PUBLIC_API_URL) {
    try {
      const shelfIndex = mockShelves.findIndex(shelf => shelf.id === parseFloat(shelfId))
      
      if (shelfIndex === -1) {
        return NextResponse.json({ error: 'Shelf not found' }, { status: 404 })
      }
      
      mockShelves.splice(shelfIndex, 1)
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to delete shelf' }, { status: 500 })
    }
  }

  // Workers API call would go here
  return NextResponse.json({ error: 'Workers API not implemented yet' }, { status: 501 })
}