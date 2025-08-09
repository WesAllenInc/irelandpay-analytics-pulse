import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Use standard environment variables first, then fall back to prefixed names
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.ainmbbtycciukbjjdjtl_NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase URL or ANON_KEY environment variables');
  }
  
  return createBrowserClient<Database>(url, key)
}

// Aliases for backward compatibility
export const createSupabaseClient = createClient;
export const createSupabaseBrowserClient = createClient;
