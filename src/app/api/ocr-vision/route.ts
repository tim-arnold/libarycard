import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromImage, isConfigured } from '@/lib/googleVisionApi';

export async function POST(request: NextRequest) {
  try {
    // Check if Google Vision is configured
    if (!(await isConfigured())) {
      return NextResponse.json({
        success: false,
        error: 'Google Vision API is not configured. Please set GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID environment variables.'
      }, { status: 500 });
    }

    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({
        success: false,
        error: 'No image data provided'
      }, { status: 400 });
    }

    // Extract text using Google Vision
    const results = await extractTextFromImage(imageBase64);

    // Convert results to simple text format for consistency with Tesseract
    const extractedText = results.map(result => result.text).join(' ');

    return NextResponse.json({
      success: true,
      data: {
        text: extractedText,
        detections: results.length,
        confidence: results.length > 0 ? results.reduce((acc, r) => acc + r.confidence, 0) / results.length : 0
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