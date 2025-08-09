// Re-export all Supabase client functions
export { createClient, createSupabaseClient, createSupabaseBrowserClient } from './client';
export { createClient as createServerClient, createSupabaseServerClient, createSupabaseServiceClient } from './server';

// Export types
export type { Database } from '@/types/database.types'; 