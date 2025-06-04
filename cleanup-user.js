// Cleanup script for tim@fiercefamly.com user
const API_BASE = 'https://libarycard-api.tim-arnold.workers.dev'

const headers = {
  'Authorization': 'Bearer tim.arnold@gmail.com',
  'Content-Type': 'application/json'
}

async function cleanupUser(email) {
  console.log(`Starting cleanup for user: ${email}`)
  
  try {
    // First check if user exists by trying to clean up
    console.log('Calling cleanup endpoint...')
    const cleanupResponse = await fetch(`${API_BASE}/api/admin/cleanup-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email_to_delete: email
      })
    })
    
    const result = await cleanupResponse.json()
    
    if (cleanupResponse.ok) {
      console.log('✅ Cleanup successful:', result)
    } else {
      if (result.error === 'User not found') {
        console.log('✅ User does not exist - cleanup not needed')
        
        // Check for any remaining invitations for this email
        console.log('Checking for any invitations to this email...')
        const locations = await fetch(`${API_BASE}/api/locations`, { headers })
        if (locations.ok) {
          const locationList = await locations.json()
          console.log(`Found ${locationList.length} locations to check`)
          
          for (const location of locationList) {
            const invitationsResponse = await fetch(`${API_BASE}/api/locations/${location.id}/invitations`, { headers })
            if (invitationsResponse.ok) {
              const invitations = await invitationsResponse.json()
              const matchingInvitations = invitations.filter(inv => inv.invited_email === email)
              if (matchingInvitations.length > 0) {
                console.log(`Found ${matchingInvitations.length} invitations for ${email} in location ${location.name}`)
              }
            }
          }
        }
      } else {
        console.error('❌ Cleanup failed:', result)
      }
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

// First let's test with a simpler query to see all users
async function listAllUsers() {
  try {
    // We need to add a debug endpoint to list all users
    const response = await fetch(`${API_BASE}/api/admin/debug-users`, {
      method: 'GET',
      headers
    })
    
    if (response.ok) {
      const users = await response.json()
      console.log('All users in database:', users)
      
      // Look for the target user
      const targetUser = users.find(u => u.email === 'tim@fiercefamly.com')
      if (targetUser) {
        console.log('Found target user:', targetUser)
      } else {
        console.log('Target user not found in user list')
      }
    } else {
      console.log('Debug endpoint not available, trying direct cleanup...')
      await cleanupUser('tim@fiercefamly.com')
    }
  } catch (error) {
    console.error('Error:', error)
    console.log('Falling back to cleanup attempt...')
    await cleanupUser('tim@fiercefamly.com')
  }
}

// Check if this is being run directly
if (typeof window === 'undefined') {
  cleanupUser('tim@fiercefamily.com')
}