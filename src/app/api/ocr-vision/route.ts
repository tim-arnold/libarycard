import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromImage, isConfigured } from '@/lib/googleVisionApi';

export async function POST(request: NextRequest) {
  console.log('OCR Vision API called');
  
  try {
    // Check if Google Vision is configured
    console.log('Checking Google Vision configuration...');
    console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    
    if (!(await isConfigured())) {
      console.log('Google Vision not configured');
      return NextResponse.json({
        success: false,
        error: 'Google Vision API is not configured. Please set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID environment variables.'
      }, { status: 500 });
    }

    console.log('Google Vision is configured, processing request...');
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      console.log('No image data provided');
      return NextResponse.json({
        success: false,
        error: 'No image data provided'
      }, { status: 400 });
    }

    console.log('Image data received, calling Google Vision API...');
    // Extract text using Google Vision
    const results = await extractTextFromImage(imageBase64);
    console.log('Google Vision API returned', results.length, 'text detections');

    // Convert results to simple text format for consistency with Tesseract
    const extractedText = results.map(result => result.text).join(' ');

    return NextResponse.json({
      success: true,
      data: {
        text: extractedText,
        detections: results.length,
        confidence: results.length > 0 ? results.reduce((acc, r) => acc + r.confidence, 0) / results.length : 0,
        spatialData: results // Include the full spatial data for advanced processing
      }
    });

  } catch (error) {
    console.error('Google Vision OCR error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}