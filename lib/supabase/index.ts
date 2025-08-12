// Re-export client functions
export { 
  createClient, 
  createSupabaseClient, 
  createSupabaseBrowserClient
} from './client';

// Re-export server functions
export { 
  createServerClient,
  createSupabaseServerClient,
  createServiceClient,
  createSupabaseServiceClient
} from './server';

// Export types
export type { Database } from '@/types/database'; 