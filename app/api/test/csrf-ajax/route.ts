import { NextRequest, NextResponse } from 'next/server';
import { withCsrfProtection } from '@/lib/api-middleware';

/**
 * Test API route handler for CSRF AJAX requests
 */
async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }
  
  try {
    // Parse JSON data
    const data = await req.json();
    
    // Process the data (in a real app, you might save to database, etc.)
    console.log('AJAX request received with CSRF protection:', data);
    
    // Return success response
    return NextResponse.json(
      { 
        message: 'AJAX request processed successfully with CSRF protection',
        receivedData: data,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing AJAX request:', error);
    return NextResponse.json(
      { error: 'Failed to process AJAX request' },
      { status: 500 }
    );
  }
}

// Export the handler with CSRF protection
export const POST = withCsrfProtection(handler);
