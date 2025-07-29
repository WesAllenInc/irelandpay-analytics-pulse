import { createBrowserClient } from '@supabase/ssr'

export const createSupabaseBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a mock client to prevent build errors
    if (typeof window === 'undefined') {
      console.warn('Supabase environment variables not found during build time');
      return createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      );
    }
    throw new Error('Missing Supabase environment variables');
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
