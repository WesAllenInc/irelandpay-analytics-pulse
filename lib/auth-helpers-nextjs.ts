/**
 * This is a shim/compatibility file to redirect imports from '@supabase/auth-helpers-nextjs'
 * to our compatibility layer in lib/supabase-compat.ts
 * 
 * This file ensures that all imports from @supabase/auth-helpers-nextjs will work
 * by using our compatibility implementation which prevents multiple client instances
 */

import { 
  createClientComponentClient,
  createServerComponentClient,
  createRouteHandlerClient
} from './supabase-compat';

// Export all the functions from our compatibility layer
export { 
  createClientComponentClient,
  createServerComponentClient,
  createRouteHandlerClient
};

// Simple compatibility implementation for any other functions that might be imported
export const createMiddlewareClient = createServerComponentClient;

// Re-export needed types
export type { SupabaseClient, Session, User } from '@supabase/supabase-js';

// Export dummy implementations for any other functions that might be imported
export const createServerActionClient = createServerComponentClient;


