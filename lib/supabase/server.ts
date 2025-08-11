import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  // Work around Next typings variance across versions by casting
  const getCookies = cookies as unknown as () => {
    get: (name: string) => { value?: string } | undefined
    set: (options: { name: string; value: string } & import('@supabase/ssr').CookieOptions) => void
  };
  
  // Use standard environment variables only
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase URL or ANON_KEY environment variables');
  }

  // Enforce expected project
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co';
  const host = new URL(url).host;
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`);
  }

  return createServerClient<Database>(url, key, {
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
};

// Create a proper service client with functions support
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or SERVICE_ROLE_KEY environment variables');
  }

  // Enforce expected project
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co';
  const host = new URL(url).host;
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`);
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Aliases for backward compatibility
export const createSupabaseServerClient = createClient;