import { ImageAnnotatorClient } from '@google-cloud/vision';
import path from 'path';

// Lazy client initialization to ensure environment variables are loaded
let client: ImageAnnotatorClient | null = null;

function getClient(): ImageAnnotatorClient {
  if (!client) {
    console.log('Initializing Google Vision client...');
    console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : undefined;
      
    console.log('Resolved credentials path:', credentialsPath);
    
    client = new ImageAnnotatorClient({
      keyFilename: credentialsPath,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    
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
    // Check environment variables
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !process.env.GOOGLE_CLOUD_PROJECT_ID) {
      console.log('Missing environment variables');
      return false;
    }
    
    // Try to create a simple client to verify credentials work
    try {
      const testClient = new ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS 
          ? path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
          : undefined,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
      
      // This doesn't make an API call, just verifies the client can be created
      console.log('Google Vision client created successfully');
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