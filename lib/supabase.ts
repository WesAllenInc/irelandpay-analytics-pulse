// Temporary re-exports to avoid breaking imports during migration
// Migrate imports to:
// - '@/lib/supabase-browser' in client code
// - '@/lib/supabase-server' in server code
export { createSupabaseBrowserClient } from './supabase-browser'
export { createSupabaseServerClient, createSupabaseServiceClient } from './supabase-server'


