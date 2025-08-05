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
      try {
        // Get the session after OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession();

        // Log for debugging
        console.log('Auth callback session:', session);
        console.log('Auth callback error:', error);
        
        if (error) {
          console.error('Error getting session:', error);
          router.push('/auth?error=session');
          return;
        }

        if (!session?.user?.email) {
          console.error('No session or user email found');
          router.push('/auth?error=no-session');
          return;
        }

        // Check if user is in the allowed list
        if (!ALLOWED_USERS.includes(session.user.email.toLowerCase())) {
          console.error('Unauthorized user attempted to sign in:', session.user.email);
          await supabase.auth.signOut();
          router.push('/auth?error=unauthorized');
          return;
        }

        console.log('User authenticated successfully:', session.user.email);
        
        // Redirect to dashboard or homepage after successful login
        router.push('/');
      } catch (err) {
        console.error('Error in auth callback:', err);
        router.push('/auth?error=callback');
      }
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
