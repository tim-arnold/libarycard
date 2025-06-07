import { ImageAnnotatorClient } from '@google-cloud/vision';
import path from 'path';

// Lazy client initialization to ensure environment variables are loaded
let client: ImageAnnotatorClient | null = null;

function getClient(): ImageAnnotatorClient {
  if (!client) {
    console.log('Initializing Google Vision client...');
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    
    let clientConfig: any = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    };
    
    // Production: use JSON credentials from environment variable
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.log('Using JSON credentials from environment variable');
      console.log('JSON length:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length);
      try {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        
        // Fix private key formatting - ensure proper newlines
        if (credentials.private_key) {
          let privateKey = credentials.private_key;
          
          // Handle different escape patterns that can occur in environment variables
          if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
          }
          if (privateKey.includes('\\\\n')) {
            privateKey = privateKey.replace(/\\\\n/g, '\n');
          }
          
          // Ensure clean formatting
          privateKey = privateKey.replace(/\n\n+/g, '\n');
          
          credentials.private_key = privateKey;
          console.log('Private key processed, starts with:', privateKey.substring(0, 30));
          console.log('Private key length:', privateKey.length);
          console.log('Has BEGIN marker:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
          console.log('Has END marker:', privateKey.includes('-----END PRIVATE KEY-----'));
        }
        
        console.log('Credentials parsed successfully, client_email:', credentials.client_email);
        clientConfig.credentials = credentials;
      } catch (error) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        throw new Error('Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON');
      }
    } 
    // Development: use file path
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Using credentials file path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      const credentialsPath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
      clientConfig.keyFilename = credentialsPath;
    } else {
      throw new Error('No Google Cloud credentials found. Set either GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS');
    }
    
    client = new ImageAnnotatorClient(clientConfig);
    console.log('Google Vision client initialized');
  }
  return client;
}

export interface GoogleVisionResult {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function extractTextFromImage(imageBase64: string): Promise<GoogleVisionResult[]> {
  try {
    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Get the client instance
    const visionClient = getClient();

    // Perform text detection
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations || [];
    
    if (detections.length === 0) {
      return [];
    }

    // Skip the first annotation (full text) and process individual words/phrases
    const wordAnnotations = detections.slice(1);
    
    return wordAnnotations.map(annotation => {
      const vertices = annotation.boundingPoly?.vertices || [];
      let boundingBox;
      
      if (vertices.length >= 2) {
        const xs = vertices.map(v => v.x || 0);
        const ys = vertices.map(v => v.y || 0);
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
  } catch (error) {
    console.error('Google Vision API error:', error);
    throw new Error(`Google Vision API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function isConfigured(): Promise<boolean> {
  try {
    // Check environment variables - either JSON credentials or file path required
    const hasJsonCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const hasFileCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!hasProjectId || (!hasJsonCredentials && !hasFileCredentials)) {
      console.log('Missing required environment variables');
      return false;
    }
    
    // Try to create a client using the same logic as getClient()
    try {
      getClient();
      console.log('Google Vision client configuration verified');
      return true;
    } catch (clientError) {
      console.error('Failed to create Google Vision client:', clientError);
      return false;
    }
  } catch (error) {
    console.error('Error checking Google Vision configuration:', error);
    return false;
  }
}