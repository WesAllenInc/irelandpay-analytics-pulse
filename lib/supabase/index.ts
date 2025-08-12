// Re-export client functions for client-side components
export { createClient, createSupabaseClient, createSupabaseBrowserClient } from './client';

// Re-export server functions for server-side components
export { createClient as createSupabaseServerClient, createSupabaseServiceClient } from './server';

// Export types
export type { Database } from '@/types/database'; 