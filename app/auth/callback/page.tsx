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
        console.log('🔍 Auth callback started');
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 URL search params:', window.location.search);
        console.log('🔍 URL hash:', window.location.hash);
        
        // Get the session after OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession();

        // Log for debugging
        console.log('🔍 Auth callback session:', session);
        console.log('🔍 Auth callback error:', error);
        
        if (error) {
          console.error('❌ Error getting session:', error);
          router.replace('/auth?error=session');
          return;
        }

        if (!session?.user?.email) {
          console.error('❌ No session or user email found');
          console.log('🔍 Session data:', session);
          router.replace('/auth?error=no-session');
          return;
        }

        console.log('✅ User email found:', session.user.email);

        // Check if user is in the allowed list
        if (!ALLOWED_USERS.includes(session.user.email.toLowerCase())) {
          console.error('❌ Unauthorized user attempted to sign in:', session.user.email);
          await supabase.auth.signOut();
          router.replace('/auth?error=unauthorized');
          return;
        }

        console.log('✅ User authenticated successfully:', session.user.email);
        console.log('✅ User metadata:', session.user.user_metadata);
        
        // Check if user is an executive first
        const { isExecutiveUser } = await import('@/lib/auth/executive-check');
        const isExecutive = isExecutiveUser(session.user.email);
        
        if (isExecutive) {
          console.log('✅ Executive user detected, redirecting to dashboard');
          router.replace('/dashboard');
          return;
        }
        
        // Get user role to determine redirect path for non-executive users
        const { data: agentData, error: roleError } = await supabase
          .from('agents')
          .select('role')
          .eq('email', session.user.email)
          .single();
        
        if (roleError) {
          console.log('⚠️ No agent record found, creating one...');
          // Create agent record if it doesn't exist
          const { error: insertError } = await supabase.from('agents').insert({
            email: session.user.email,
            agent_name: session.user?.user_metadata?.name || session.user.email.split('@')[0],
            role: 'agent'
          });
          
          if (insertError) {
            console.error('❌ Error creating agent record:', insertError);
            router.replace('/leaderboard');
            return;
          }
          
          console.log('✅ Agent record created');
          router.replace('/leaderboard');
          return;
        }
        
        // Determine redirect path based on role
        const userRole = agentData.role || 'agent';
        const redirectPath = userRole === 'admin' ? '/dashboard' : '/leaderboard';
        
        console.log('✅ User role:', userRole);
        console.log('🔄 Redirecting to:', redirectPath);
        router.replace(redirectPath);
        
      } catch (err) {
        console.error('❌ Error in auth callback:', err);
        router.replace('/auth?error=callback');
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Logging you in...</h2>
        <p className="mt-2">Please wait while we complete the authentication process.</p>
        <p className="mt-2 text-sm text-gray-500">Check browser console for debugging info</p>
      </div>
    </div>
  );
}
