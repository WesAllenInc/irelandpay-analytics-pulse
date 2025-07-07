// This file provides compatibility functions for the @supabase/auth-helpers-nextjs package
// which is being deprecated in favor of @supabase/ssr
// 
// These functions are drop-in replacements for the functions from @supabase/auth-helpers-nextjs
// and should be used in place of those functions in all components and pages

import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CookieOptions } from '@supabase/auth-helpers-shared'

// Singleton pattern to avoid multiple client instances
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null
let serverClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * This file provides compatibility with @supabase/auth-helpers-nextjs
 * while using modern @supabase/ssr approach to avoid multiple client instances
 */

// Create browser client (singleton)
export const createClientComponentClient = <T = Database>() => {
  if (typeof window === 'undefined') {
    // Server-side rendering
    return createClient<T>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
        cookies: {
          name: 'sb-auth-token',
          lifetime: 60 * 60 * 24 * 7, // 7 days
          domain: '',
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        }
      }
    )
  }
  
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          name: 'sb-auth-token',
          lifetime: 60 * 60 * 24 * 7, // 7 days
          domain: '',
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        }
      }
    )
  }
  
  return browserClient as ReturnType<typeof createBrowserClient<T>>
}

// Create server client (singleton)
export const createServerComponentClient = <T = Database>() => {
  if (!serverClient) {
    serverClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
        cookies: {
          name: 'sb-auth-token',
          lifetime: 60 * 60 * 24 * 7, // 7 days
          domain: '',
          path: '/',
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        }
      }
    )
  }
  
  return serverClient as ReturnType<typeof createClient<T>>
}

// Route handler client - same as server client
export const createRouteHandlerClient = <T = Database>() => {
  return createServerComponentClient<T>()
}
