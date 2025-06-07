import { Env } from '../types';

// OCR processing function using Google Vision API
export async function processOCR(request: Request, env: Env, corsHeaders: Record<string, string>) {
  try {
    // Check if Google Vision is configured
    if (!env.GOOGLE_CLOUD_PROJECT_ID || !env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      return new Response(JSON.stringify({ 
        error: 'Google Vision API not configured. Missing GOOGLE_CLOUD_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS_JSON environment variables.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData: { image?: string; rotation?: number } = await request.json();
    console.log('OCR request data keys:', Object.keys(requestData));
    console.log('OCR image type:', typeof requestData.image);
    console.log('OCR image length:', requestData.image?.length);
    
    const { image } = requestData;
    
    if (!image || typeof image !== 'string') {
      console.error('Invalid image data:', { image: typeof image, keys: Object.keys(requestData) });
      return new Response(JSON.stringify({ 
        error: 'No image provided or image is not a string',
        received_type: typeof image,
        received_keys: Object.keys(requestData)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Parse Google Cloud credentials
    let credentials: any;
    try {
      credentials = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid Google Cloud credentials JSON' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const visionRequest = {
      requests: [{
        image: {
          content: base64Data
        },
        features: [{
          type: 'TEXT_DETECTION',
          maxResults: 50
        }]
      }]
    };

    // Get access token for service account
    console.log('Getting Google access token...');
    const accessToken = await getGoogleAccessToken(credentials);
    console.log('Access token obtained, length:', accessToken.length);
    
    const visionResponse = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(visionRequest)
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Google Vision API error response:', visionResponse.status, errorText);
      console.error('Request headers:', JSON.stringify({
        'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
        'Content-Type': 'application/json',
      }));
      return new Response(JSON.stringify({ 
        error: `Google Vision API returned ${visionResponse.status}: ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const visionResult: any = await visionResponse.json();
    
    if (visionResult.responses?.[0]?.error) {
      console.error('Google Vision API error:', visionResult.responses[0].error);
      return new Response(JSON.stringify({ 
        error: `Google Vision API error: ${visionResult.responses[0].error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const annotations = visionResult.responses?.[0]?.textAnnotations || [];
    
    if (annotations.length === 0) {
      return new Response(JSON.stringify({ 
        detectedText: [],
        processedCount: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Skip the first annotation (full text) and process individual words/phrases
    const wordAnnotations = annotations.slice(1);
    
    const detectedText = wordAnnotations.map((annotation: any) => {
      const vertices = annotation.boundingPoly?.vertices || [];
      let boundingBox;
      
      if (vertices.length >= 2) {
        const xs = vertices.map((v: any) => v.x || 0);
        const ys = vertices.map((v: any) => v.y || 0);
        boundingBox = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
      }

      return {
        text: annotation.description || '',
        confidence: annotation.confidence || 0,
        boundingBox,
      };
    });

    return new Response(JSON.stringify({ 
      detectedText,
      processedCount: detectedText.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    return new Response(JSON.stringify({ 
      error: `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Helper function to get Google access token using service account credentials
export async function getGoogleAccessToken(credentials: any): Promise<string> {
  console.log('Credentials keys:', Object.keys(credentials));
  
  // Handle nested credentials structure (common with Google Cloud service accounts)
  const creds = credentials.web || credentials;
  console.log('Using credentials from:', credentials.web ? 'credentials.web' : 'credentials root');
  console.log('Nested credentials keys:', Object.keys(creds));
  console.log('Private key exists:', !!creds.private_key);
  console.log('Private key type:', typeof creds.private_key);
  console.log('Client email exists:', !!creds.client_email);
  
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 3600; // 1 hour
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: creds.private_key_id
  };
  
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiration,
    iat: now
  };
  
  // For Cloudflare Workers, we'll use a simpler approach with the Web Crypto API
  // This is a simplified JWT implementation - in production you might want to use a proper JWT library
  const jwtHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwtPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${jwtHeader}.${jwtPayload}`;
  
  // Import the private key
  if (!creds.private_key) {
    throw new Error('Private key missing from credentials');
  }
  
  const privateKeyPem = creds.private_key
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const privateKeyBuffer = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
  
  // Sign the data
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(data)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${data}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }
  
  const tokenData: any = await tokenResponse.json();
  return tokenData.access_token;
}