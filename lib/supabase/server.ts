import { createServerClient as ssrCreateServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseJSClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
}

// Enforce expected project (prevents accidental cross-project usage)
const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co'
const host = new URL(SUPABASE_URL).host
if (host !== expectedHost) {
  throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`)
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
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  if (!serviceClient) {
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
