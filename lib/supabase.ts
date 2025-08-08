import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { env, serverOnlyEnv } from '@/lib/env';

// Browser client for client components
export const createSupabaseBrowserClient = () => {
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co';
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`);
  }
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

// Server client for server components and API routes
export const createSupabaseServerClient = () => {
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co';
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`);
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

// Service role client for admin operations (only use in secure contexts)
export const createSupabaseServiceClient = () => {
  // This function should only be called from server-side code
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseServiceClient must only be used in server-side code');
  }
  
  const expectedHost = 'ainmbbtycciukbjjdjtl.supabase.co';
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
  if (host !== expectedHost) {
    throw new Error(`Supabase URL host mismatch. Expected ${expectedHost}, received ${host}`);
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY);
};
