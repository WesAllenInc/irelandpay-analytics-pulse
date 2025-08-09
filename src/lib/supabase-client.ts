import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Factory function to create a Supabase client with proper error handling.
 * This ensures consistent client creation across the application.
 */
export function makeSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient<Database>(url, key);
}

/**
 * Factory function to create a Supabase client for browser usage.
 * Uses the public anon key for client-side operations.
 */
export function makeSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return createClient<Database>(url, key);
}

/**
 * Factory function to create a Supabase client for server-side operations.
 * Uses the service role key for admin operations.
 */
export function makeSupabaseServerClient() {
  // This function should only be called from server-side code
  if (typeof window !== 'undefined') {
    throw new Error('makeSupabaseServerClient must only be used in server-side code');
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient<Database>(url, key);
} 