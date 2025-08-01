import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/admin-check'

export async function requireAdmin(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized - No valid authorization header', { status: 401 })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify the token with Supabase
    const supabase = createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return new Response('Unauthorized - Invalid token', { status: 401 })
    }
    
    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id)
    
    if (!userIsAdmin) {
      return new Response('Forbidden - Admin access required', { status: 403 })
    }
    
    return null // Continue with the request
  } catch (error) {
    console.error('Admin auth middleware error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function requireAdminOrServiceRole(request: NextRequest) {
  try {
    // Check for service role key first (for cron jobs)
    const authHeader = request.headers.get('authorization')
    
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      return null // Allow service role access
    }
    
    // Otherwise, require admin access
    return await requireAdmin(request)
  } catch (error) {
    console.error('Admin or service role auth middleware error:', error)
    return new Response('Internal server error', { status: 500 })
  }
} 