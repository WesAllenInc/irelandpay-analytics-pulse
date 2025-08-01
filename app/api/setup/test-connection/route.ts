import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { baseUrl, apiKey } = await request.json()

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Base URL and API key are required' },
        { status: 400 }
      )
    }

    // Test the connection by making a simple API call
    const testResponse = await fetch(`${baseUrl}/merchants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (testResponse.ok) {
      return NextResponse.json({
        success: true,
        message: 'Connection test successful'
      })
    } else {
      const errorText = await testResponse.text()
      return NextResponse.json(
        { 
          error: `API connection failed: ${testResponse.status} ${testResponse.statusText}`,
          details: errorText
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
} 