import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { path } = await request.json()

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Path is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]

    if (!projectRef) {
      throw new Error('Invalid Supabase URL configuration')
    }

    const functionUrl = `https://${projectRef}.supabase.co/functions/v1/processResidualExcel`

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ path })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Edge function error' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
