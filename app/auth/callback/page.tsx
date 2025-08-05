'use client'; // Explicitly using page.tsx to handle auth callbacks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';

// Allowed users whitelist
const ALLOWED_USERS = [
  'wvazquez@irelandpay.com',
  'jmarkey@irelandpay.com'
];

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

      // Check if user is in the allowed list
      if (session?.user?.email && !ALLOWED_USERS.includes(session.user.email.toLowerCase())) {
        console.error('Unauthorized user attempted to sign in:', session.user.email);
        await supabase.auth.signOut();
        router.push('/auth?error=unauthorized');
        return;
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
