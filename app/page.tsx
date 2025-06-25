'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import Link from 'next/link';

// Landing page that checks auth and redirects appropriately
export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check authentication and redirect accordingly
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('[Landing] Session check:', !!session?.user, session?.user?.email);
        
        if (session?.user?.email) {
          // Authenticated user - check role
          const { data: agentData, error: roleError } = await supabase
            .from('agents')
            .select('role')
            .eq('email', session.user.email)
            .single();
          
          if (roleError) {
            console.error('[Landing] Role fetch error:', roleError);
            // Default to auth page if we can't determine role
            router.push('/auth');
            return;
          }
          
          // Redirect based on role
          if (agentData?.role === 'admin') {
            console.log('[Landing] Redirecting admin to dashboard');
            router.push('/dashboard');
          } else {
            console.log('[Landing] Redirecting agent to leaderboard');
            router.push('/leaderboard');
          }
        } else {
          // Not authenticated - go to login
          console.log('[Landing] Not authenticated, redirecting to auth');
          router.push('/auth');
        }
      } catch (err: any) {
        console.error('[Landing] Error in auth check:', err);
        setError(err?.message || 'Error checking authentication');
        // Fallback to auth page on error
        router.push('/auth');
      }
    };
    
    // Add timeout to prevent hanging on redirect screen
    const redirectTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[Landing] Redirect timeout - forcing to /auth');
        router.push('/auth');
      }
    }, 5000);
    
    checkAuthAndRedirect();
    
    return () => clearTimeout(redirectTimeout);
  }, [router, isLoading]);

  // Show loading screen or error message
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        {error ? (
          <div className="bg-red-900/50 border border-red-500 rounded-md p-4 max-w-md">
            <h1 className="text-xl font-semibold mb-2 text-red-300">Authentication Error</h1>
            <p className="mb-4 text-white/70">{error}</p>
            <Link href="/auth" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md">
              Go to Login
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Ireland Pay Analytics</h1>
              <p className="text-gray-400">Connecting to your dashboard...</p>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse delay-150" />
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-300" />
            </div>
            <div className="mt-6 text-sm text-gray-400">
              <p>If you are not redirected automatically,</p>
              <Link href="/auth" className="text-blue-400 hover:underline mt-2 inline-block">
                click here to log in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
