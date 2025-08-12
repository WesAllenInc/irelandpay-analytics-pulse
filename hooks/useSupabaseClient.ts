import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hook to get a Supabase client for client-side components
 * @returns A Supabase client instance
 */
export function useSupabaseClient(): SupabaseClient {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    setClient(supabase);
  }, []);
  
  // Return client or throw an error if not initialized
  if (!client) {
    // During SSR/static generation, return a dummy client to prevent build errors
    if (typeof window === 'undefined') {
      return createSupabaseBrowserClient();
    }
    throw new Error('Supabase client not initialized');
  }
  
  return client;
}
