import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    let baseUrl: string | undefined
    try {
      const body = await request.json()
      baseUrl = body?.baseUrl
    } catch {
      // no body provided
    }

    const apiKey = process.env.IRELANDPAY_CRM_API_KEY
    const resolvedBaseUrl = baseUrl || process.env.IRELANDPAY_CRM_BASE_URL

    if (!resolvedBaseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Ireland Pay CRM base URL and server API key must be configured' },
        { status: 400 }
      )
    }

    // Test the connection by making a simple API call
    const testResponse = await fetch(`${resolvedBaseUrl}/merchants`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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