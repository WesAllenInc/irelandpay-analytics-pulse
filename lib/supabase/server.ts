import { createServerClient as ssrCreateServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseJSClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Environment validation - only run at runtime, not during build
// Supports both Vercel-Supabase integration variables and standard Next.js variables
function validateEnvironment() {
  // Only validate at runtime, not during build
  if (typeof window === 'undefined' && !process.env.NEXT_PHASE) {
    return {
      SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    }
  }

  // Try Vercel-Supabase integration variables first, then fall back to standard names
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables. Expected either SUPABASE_URL/SUPABASE_ANON_KEY (Vercel integration) or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (standard)')
  }

  // Enforce expected project (prevents accidental cross-project usage)
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co'
  const host = new URL(SUPABASE_URL).host
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`)
  }

  return { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY }
}

// Singleton instances to prevent multiple client creation
let serverClient: ReturnType<typeof ssrCreateServerClient> | undefined
let serviceClient: ReturnType<typeof createSupabaseJSClient> | undefined

/**
 * Create a server client for server-side components and API routes
 * Uses @supabase/ssr createServerClient with proper cookie handling
 */
export function createServerClient() {
  if (!serverClient) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = validateEnvironment()
    
    // Only create client if we have valid environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {} as any
    }
    
    // Work around Next typings variance across versions by casting
    const getCookies = cookies as unknown as () => {
      get: (name: string) => { value?: string } | undefined
      set: (options: { name: string; value: string } & CookieOptions) => void
    }

    serverClient = ssrCreateServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return getCookies().get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          getCookies().set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          getCookies().set({ name, value: '', ...options })
        },
      },
    })
  }
  return serverClient
}

/**
 * Create a service client with admin privileges
 * Uses service role key for operations that require elevated permissions
 */
export function createServiceClient() {
  if (!serviceClient) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnvironment()
    
    // Only create client if we have valid environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {} as any
    }

    serviceClient = createSupabaseJSClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return serviceClient
}

// Aliases for backward compatibility
export const createSupabaseServerClient = createServerClient
export const createSupabaseServiceClient = createServiceClient

// Export types
export type { Database }
