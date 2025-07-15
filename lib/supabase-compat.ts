// This file provides compatibility functions for the @supabase/auth-helpers-nextjs package
// which is being deprecated in favor of @supabase/ssr
// 
// These functions are drop-in replacements for the functions from @supabase/auth-helpers-nextjs
// and should be used in place of those functions in all components and pages

import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

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
        }
        // Note: 'cookies' was removed as it's not compatible with createClient options
      }
    ) as ReturnType<typeof createBrowserClient<T>>
  }
  
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
              ?.split('=')[1];
          },
          set(name, value, options) {
            let cookieString = `${name}=${value}`;
            if (options?.expires) cookieString += `; expires=${options.expires.toUTCString()}`;
            if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`;
            if (options?.domain) cookieString += `; domain=${options.domain}`;
            if (options?.path) cookieString += `; path=${options.path}`;
            if (options?.sameSite) cookieString += `; samesite=${String(options.sameSite).toLowerCase()}`;
            if (options?.secure) cookieString += `; secure`;
            document.cookie = cookieString;
          },
          remove(name, options) {
            this.set(name, '', { ...options, maxAge: -1 });
          }
        }
      }
    )
  }
  
  return browserClient as unknown as ReturnType<typeof createBrowserClient<T>>
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
        }
        // Note: 'cookies' was removed as it's not compatible with createClient options
      }
    )
  }
  
  return serverClient as unknown as ReturnType<typeof createClient<T>>
}

// Route handler client - same as server client
export const createRouteHandlerClient = <T = Database>() => {
  return createServerComponentClient<T>()
}
