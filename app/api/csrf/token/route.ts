import { NextRequest, NextResponse } from 'next/server';
import { getCSRFToken } from '@/lib/csrf';

/**
 * API endpoint to get a CSRF token
 * This is used by the useCsrf hook to fetch a token for client components
 */
export async function GET(req: NextRequest) {
  try {
    // Generate or refresh a CSRF token
    const csrfToken = getCSRFToken();
    
    return NextResponse.json(
      { csrfToken },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
