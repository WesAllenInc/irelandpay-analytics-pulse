// Re-export client and server functions for easier imports
export { createClient, createSupabaseClient, createSupabaseBrowserClient } from './client';
export { createClient as createServerClient, createSupabaseServiceClient, createSupabaseServerClient } from './server';

// Export types
export type { Database } from '@/types/database'; 