// Vercel deployment fix - force fresh build cache and module resolution
import { createBrowserClient as ssrCreateBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
}

// Enforce expected project (prevents accidental cross-project usage)
const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co'
const host = new URL(SUPABASE_URL).host
if (host !== expectedHost) {
  throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`)
}

// Singleton instance to prevent multiple client creation
let browserClient: ReturnType<typeof ssrCreateBrowserClient> | undefined

/**
 * Create a browser client for client-side components
 * Uses @supabase/ssr createBrowserClient for proper SSR handling
 */
export function createBrowserClient() {
  if (!browserClient) {
    browserClient = ssrCreateBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return browserClient
}

// Aliases for backward compatibility
export const createClient = createBrowserClient
export const createSupabaseClient = createBrowserClient
export const createSupabaseBrowserClient = createBrowserClient

// Export types
export type { Database } 
