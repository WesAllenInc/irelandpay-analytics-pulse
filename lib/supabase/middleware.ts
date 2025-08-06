import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Create a Supabase client for middleware with service role permissions
 * This bypasses RLS and allows the middleware to check user permissions
 */
export function createSupabaseMiddlewareClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ainmbbtycciukbjjdjtl.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbm1iYnR5Y2NpdWtiampkanRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM2OTI5OCwiZXhwIjoyMDYzOTQ1Mjk4fQ.z4Lralzdldn5tY_T0qSDpvNeu3vJ09izPvNLlX4BC2M';
  
  if (!url || !key) {
    throw new Error('Missing Supabase URL or SERVICE_ROLE_KEY environment variables for middleware');
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} 