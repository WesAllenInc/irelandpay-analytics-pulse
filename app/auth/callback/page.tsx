'use client'; // Explicitly using page.tsx to handle auth callbacks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { hasAdminAccess } from '@/lib/auth/executive-check';

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
          window.location.href = '/auth?error=session';
          return;
        }

        if (!session?.user?.email) {
          console.error('❌ No session or user email found');
          console.log('🔍 Session data:', session);
          window.location.href = '/auth?error=no-session';
          return;
        }

        console.log('✅ User email found:', session.user.email);
        console.log('✅ User authenticated successfully:', session.user.email);
        console.log('✅ User metadata:', session.user.user_metadata);
        
        // Check if user has admin access
        const isAdmin = await hasAdminAccess(session.user.email, supabase);
        
        if (isAdmin) {
          console.log('✅ User has admin access, redirecting to dashboard');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
          return;
        }
        
        // For non-admin users, check database role
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
            setTimeout(() => {
              window.location.href = '/leaderboard';
            }, 2000);
            return;
          }
          
          console.log('✅ Agent record created');
          setTimeout(() => {
            window.location.href = '/leaderboard';
          }, 2000);
          return;
        }
        
        // Determine redirect path based on role
        const userRole = agentData.role || 'agent';
        const redirectPath = userRole === 'admin' ? '/dashboard' : '/leaderboard';
        
        console.log('✅ User role:', userRole);
        console.log('🔄 Redirecting to:', redirectPath);
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 2000);
        
      } catch (err) {
        console.error('❌ Error in auth callback:', err);
        window.location.href = '/auth?error=callback';
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-white mb-2">Logging you in...</h2>
        <p className="text-gray-300 mb-4">Please wait while we complete the authentication process.</p>
        <p className="text-sm text-gray-500">Check browser console for debugging info</p>
      </div>
    </div>
  );
}
