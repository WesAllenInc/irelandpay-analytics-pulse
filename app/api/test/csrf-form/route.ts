import { NextRequest, NextResponse } from 'next/server';
import { withCsrfProtection } from '@/lib/api-middleware';

/**
 * Test API route handler for CSRF form submissions
 */
async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }
  
  try {
    // Parse form data
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    
    // Validate inputs
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    // Process the form data (in a real app, you might save to database, etc.)
    console.log('Form data received:', { name, email });
    
    // Return success response
    return NextResponse.json(
      { 
        message: 'Form submitted successfully with CSRF protection',
        data: { name, email }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing form data:', error);
    return NextResponse.json(
      { error: 'Failed to process form data' },
      { status: 500 }
    );
  }
}

// Export the handler with CSRF protection
export const POST = withCsrfProtection(handler);
