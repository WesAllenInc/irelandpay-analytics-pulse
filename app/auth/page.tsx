'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import SimplifiedAuthCard from '@/components/Auth/SimplifiedAuthCard';
import ScrambledText from '@/components/Auth/ScrambledText';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { hasAdminAccess } from '@/lib/auth/executive-check';

// Dynamically import the ParticleBG component to avoid SSR issues
const ParticleBG = dynamic(() => import('@/components/Auth/ParticleBG'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black/90" />
});

export default function AuthPage() {
  const [mounted, setMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  
  // Handle initial auth state and redirects
  useEffect(() => {
    setMounted(true);
    
    const checkAuth = async () => {
      console.log('🔍 Auth page - checking authentication...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AUTH PAGE] Session:', session);
      
      // Only redirect if user is truly authenticated and not already redirecting
      if (session?.user?.email && !isRedirecting) {
        console.log('✅ User has session with email:', session.user.email);

        try {
          // Check if user has admin access
          const isAdmin = await hasAdminAccess(session.user.email, supabase);
          
          if (isAdmin) {
            console.log('✅ User has admin access, redirecting to dashboard');
            setIsRedirecting(true);
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
            return;
          }
          
          // For non-admin users, check database role
          const { data: agentData, error: roleError } = await supabase
            .from('agents')
            .select('*')
            .eq('email', session.user.email)
            .single();
          
          console.log('[AUTH PAGE] Agent data:', agentData);
          
          if (roleError) {
            console.error('[AUTH PAGE] Error fetching agent:', roleError);
          }
          
          if (agentData) {
            // Check if role column exists or use agent_role or other possible column names
            const userRole = agentData.role || agentData.agent_role || agentData.user_role || agentData.user_type || 'agent';
            console.log('✅ User role:', userRole);
            // Redirect based on role
            const redirectPath = userRole === 'admin' ? '/dashboard' : '/leaderboard';
            console.log('🔄 Redirecting to:', redirectPath);
            setIsRedirecting(true);
            setTimeout(() => {
              window.location.href = redirectPath;
            }, 2000);
          } else {
            // If no agent record exists but user is authenticated, create one
            try {
              console.log('🔄 Creating new agent record...');
              const { error: insertError } = await supabase.from('agents').insert({
                email: session.user.email,
                agent_name: session.user?.user_metadata?.name || (session.user.email).split('@')[0],
                role: 'agent'
              });
              
              if (insertError) {
                console.error('[AUTH PAGE] Error creating agent record:', insertError);
                setIsRedirecting(true);
                setTimeout(() => {
                  window.location.href = '/leaderboard';
                }, 2000);
              } else {
                console.log('✅ Agent record created, redirecting to leaderboard');
                setIsRedirecting(true);
                setTimeout(() => {
                  window.location.href = '/leaderboard';
                }, 2000);
              }
            } catch (err) {
              console.error('[AUTH PAGE] Exception creating agent record:', err);
              setIsRedirecting(true);
              setTimeout(() => {
                window.location.href = '/leaderboard';
              }, 2000);
            }
          }
        } catch (err) {
          console.error('[AUTH PAGE] Exception in auth flow:', err);
          setIsRedirecting(true);
          setTimeout(() => {
            window.location.href = '/leaderboard';
          }, 2000);
        }
      } else if (session) {
        // Session exists but no user, log warning
        console.warn('[AUTH PAGE] Session exists but no user:', session);
      } else {
        console.log('❌ No session found, staying on auth page');
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 Auth state change event:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user?.email && !isRedirecting) {
          console.log('✅ SIGNED_IN event with email:', session.user.email);
          
          try {
            // Check if user has admin access
            const isAdmin = await hasAdminAccess(session.user.email, supabase);
            
            if (isAdmin) {
              console.log('✅ Admin user signed in, redirecting to dashboard');
              setIsRedirecting(true);
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 2000);
              return;
            }
            
            // For non-admin users, check database role
            const { data } = await supabase
              .from('agents')
              .select('role')
              .eq('email', session.user.email)
              .single();
            
            const redirectPath = data?.role === 'admin' ? '/dashboard' : '/leaderboard';
            console.log('🔄 Auth state change redirecting to:', redirectPath);
            setIsRedirecting(true);
            setTimeout(() => {
              window.location.href = redirectPath;
            }, 2000);
          } catch (err) {
            console.error('[AUTH PAGE] Exception in auth state change:', err);
            setIsRedirecting(true);
            setTimeout(() => {
              window.location.href = '/leaderboard';
            }, 2000);
          }
        } else if (event === 'SIGNED_IN' && session) {
          // Session exists but no user, log warning
          console.warn('[AUTH PAGE] SIGNED_IN event but no user:', session);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Define Ireland Pay colors (Gruvbox inspired palette)
  const colors = ['#d79921', '#98971a', '#458588', '#b16286', '#689d6a', '#d65d0e'];

  if (!mounted) return null;

  // Show loading spinner if redirecting
  if (isRedirecting) {
    return (
      <main className="min-h-screen w-full flex flex-col justify-center items-center relative bg-black">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white mb-2">Redirecting...</h2>
          <p className="text-gray-300">Please wait while we redirect you to your dashboard.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-center items-center relative bg-black">
      {/* Particle Background */}
      <ParticleBG 
        particleCount={150}
        particleSpread={15}
        particleColors={colors}
        speed={0.08}
        particleBaseSize={80}
        moveParticlesOnHover={true}
        alphaParticles={true}
      />
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl px-4 py-12 flex flex-col items-center justify-center space-y-8">
        {/* Animated Title */}
        <div className="text-center mb-8">
          <ScrambledText
            className="text-white font-bold tracking-tight"
            radius={200}
            duration={1.5}
            speed={0.3}
            scrambleChars=".:/|=_"
          >
            Ireland Pay Analytics
          </ScrambledText>
          
          <div className="mt-4 text-gray-300 text-lg font-light opacity-80">
            Upload Residuals. Track Profits. Empower Agents.
          </div>
        </div>
        
        {/* Simplified Auth Card */}
        <div className="w-full max-w-md px-4">
          <SimplifiedAuthCard className="bg-black/80 backdrop-blur-sm border-gray-800" />
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-gray-500 text-sm text-center">
          <p>© {new Date().getFullYear()} Ireland Pay Analytics. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
