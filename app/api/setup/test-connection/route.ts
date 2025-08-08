import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { baseUrl } = await request.json()
    const apiKey = process.env.IRELANDPAY_CRM_API_KEY

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Base URL is required and server API key must be configured' },
        { status: 400 }
      )
    }

    // Test the connection by making a simple API call
    const testResponse = await fetch(`${baseUrl}/merchants`, {
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