import { createBrowserClient } from '@supabase/ssr'

export const createSupabaseBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Enforce connection to the expected project only
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co';
  try {
    const host = new URL(supabaseUrl).host;
    if (host !== expectedHost) {
      throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`);
    }
  } catch (e) {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
