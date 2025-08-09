import { createBrowserClient } from '@supabase/ssr'

// Singleton to avoid multiple instances
let browserClient: ReturnType<typeof createBrowserClient> | undefined

export const createSupabaseBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co'
  const host = new URL(supabaseUrl).host
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`)
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}
