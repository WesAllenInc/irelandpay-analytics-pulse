// Vercel deployment fix - force fresh build cache and module resolution
import { createBrowserClient as ssrCreateBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Environment validation - only run at runtime, not during build
// Supports both Vercel-Supabase integration variables and standard Next.js variables
function validateEnvironment() {
  // Only validate at runtime, not during build
  if (typeof window === 'undefined' && !process.env.NEXT_PHASE) {
    return {
      SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    }
  }

  // Try Vercel-Supabase integration variables first, then fall back to standard names
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables. Expected either SUPABASE_URL/SUPABASE_ANON_KEY (Vercel integration) or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (standard)')
  }

  // Enforce expected project (prevents accidental cross-project usage)
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co'
  const host = new URL(SUPABASE_URL).host
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`)
  }

  return { SUPABASE_URL, SUPABASE_ANON_KEY }
}

// Singleton instance to prevent multiple client creation
let browserClient: ReturnType<typeof ssrCreateBrowserClient> | undefined

/**
 * Create a browser client for client-side components
 * Uses @supabase/ssr createBrowserClient for proper SSR handling
 */
export function createBrowserClient() {
  if (!browserClient) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = validateEnvironment()
    
    // Only create client if we have valid environment variables
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      browserClient = ssrCreateBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    } else {
      // Return a mock client for build time
      return {} as any
    }
  }
  return browserClient
}

// Aliases for backward compatibility
export const createClient = createBrowserClient
export const createSupabaseClient = createBrowserClient
export const createSupabaseBrowserClient = createBrowserClient

// Export types
export type { Database } 
