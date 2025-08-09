import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Server-only env access
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Throw only on server at runtime
  if (typeof window === 'undefined') {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
}

// Enforce expected project (prevents accidental cross-project usage)
const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co'
try {
  const host = new URL(SUPABASE_URL).host
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`)
  }
} catch (e) {
  if (typeof window === 'undefined') {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}`)
  }
}

// Singleton instances
let serverClient: ReturnType<typeof createClient<Database>> | undefined
let serviceClient: ReturnType<typeof createClient<Database>> | undefined

export const createSupabaseServerClient = () => {
  if (!serverClient) {
    serverClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  }
  return serverClient
}

export const createSupabaseServiceClient = () => {
  if (!serviceClient) {
    serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  }
  return serviceClient
}


