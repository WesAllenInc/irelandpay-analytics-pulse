// This is a shim/compatibility file to redirect imports from '@supabase/auth-helpers-nextjs'
// to our compatibility layer in lib/supabase-compat.ts

import { 
  createClientComponentClient,
  createServerComponentClient,
  createRouteHandlerClient
} from './supabase-compat';

// Export all the functions from our compatibility layer to match the '@supabase/auth-helpers-nextjs' API
export { 
  createClientComponentClient,
  createServerComponentClient,
  createRouteHandlerClient
};

// Re-export any other needed functions or types
export type {
  SupabaseClient,
  Session,
  User
} from '@supabase/supabase-js';
