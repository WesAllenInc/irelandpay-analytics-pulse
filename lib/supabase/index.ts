// Re-export only client functions for client-side components
export { createClient, createSupabaseClient, createSupabaseBrowserClient } from './client';

// Don't export server functions from the main index to avoid conflicts
// Server functions should be imported directly from './server' when needed

// Export types
export type { Database } from '@/types/database'; 