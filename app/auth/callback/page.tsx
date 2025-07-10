'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Try to get session
      const { data: { session }, error } = await supabase.auth.getSession();

      // Log for debugging
      console.log('Auth callback session:', session);
      
      if (error) {
        console.error('Error getting session:', error);
        router.push('/auth?error=session');
        return;
      }

      if (!session) {
        // Exchange code for session if needed
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.hash.substring(1)
        );
        
        if (exchangeError) {
          console.error('Error exchanging code for session:', exchangeError);
          router.push('/auth?error=exchange');
          return;
        }
      }

      // Redirect to dashboard or homepage after successful login
      router.push('/');
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Logging you in...</h2>
        <p className="mt-2">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
}
