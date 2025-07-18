'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import AuthCard from '@/components/Auth/AuthCard';
import ScrambledText from '@/components/Auth/ScrambledText';

// Dynamically import the ParticleBG component to avoid SSR issues
const ParticleBG = dynamic(() => import('@/components/Auth/ParticleBG'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black/90" />
});

export default function AuthPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  
  // Handle initial auth state and redirects
  useEffect(() => {
    setMounted(true);
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AUTH PAGE] Session:', session);
      
      // Only redirect if user is truly authenticated
      if (session?.user?.email) {
        try {
          // User is authenticated, fetch role and redirect
          const { data: agentData, error: roleError } = await supabase
            .from('agents')
            .select('*') // Select all columns to handle possible schema differences
            .eq('email', session.user.email)
            .single();
          
          console.log('[AUTH PAGE] Agent data:', agentData);
          
          if (roleError) {
            console.error('[AUTH PAGE] Error fetching agent:', roleError);
          }
          
          if (agentData) {
            // Check if role column exists or use agent_role or other possible column names
            const userRole = agentData.role || agentData.agent_role || agentData.user_role || agentData.user_type || 'agent';
            // Redirect based on role
            router.push(userRole === 'admin' ? '/dashboard' : '/leaderboard');
          } else {
            // If no agent record exists but user is authenticated, create one
            try {
              // Check if the table has a role column first
              const { error: insertError } = await supabase.from('agents').insert({
                email: session.user.email,
                agent_name: session.user?.user_metadata?.name || (session.user.email).split('@')[0],
                // We'll exclude the role field if it causes issues
              });
              
              if (insertError) {
                console.error('[AUTH PAGE] Error creating agent record:', insertError);
                // Default redirect on error
                router.push('/leaderboard'); 
              } else {
                router.push('/leaderboard');
              }
            } catch (err) {
              console.error('[AUTH PAGE] Exception creating agent record:', err);
              // Default redirect on exception
              router.push('/leaderboard');
            }
          }
        } catch (err) {
          console.error('[AUTH PAGE] Exception in auth flow:', err);
          // Default redirect on any exception
          router.push('/leaderboard');
        }
      } else if (session) {
        // Session exists but no user, log warning
        console.warn('[AUTH PAGE] Session exists but no user:', session);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email) {
          // Redirect after sign in
          const { data } = await supabase
            .from('agents')
            .select('role')
            .eq('email', session.user.email)
            .single();
          
          router.push(data?.role === 'admin' ? '/dashboard' : '/leaderboard');
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
        
        {/* Auth Card */}
        <div className="w-full max-w-md px-4">
          <AuthCard className="bg-black/80 backdrop-blur-sm border-gray-800" />
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-gray-500 text-sm text-center">
          <p>© {new Date().getFullYear()} Ireland Pay Analytics. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
