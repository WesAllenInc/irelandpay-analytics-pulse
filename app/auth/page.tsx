'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
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
      
      if (session) {
        // User is already authenticated, fetch role and redirect
        const { data: agentData } = await supabase
          .from('agents')
          .select('role')
          .eq('email', session.user.email || '')
          .single();
        
        if (agentData) {
          // Redirect based on role
          router.push(agentData.role === 'admin' ? '/dashboard' : '/leaderboard');
        } else {
          // If no agent record exists but user is authenticated, create one
          try {
            await supabase.from('agents').insert({
              email: session.user.email || '',
              agent_name: session.user?.user_metadata?.name || (session.user.email || '').split('@')[0],
              role: 'agent'
            });
            router.push('/leaderboard');
          } catch (err) {
            console.error('Error creating agent record:', err);
          }
        }
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Redirect after sign in
          const { data } = await supabase
            .from('agents')
            .select('role')
            .eq('email', session.user.email || '')
            .single();
          
          router.push(data?.role === 'admin' ? '/dashboard' : '/leaderboard');
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
        {/* Logo */}
        <div className="relative h-20 w-64 mb-6">
          <Image 
            src="/kairos-logo.png" 
            alt="Kairos Logo" 
            fill 
            style={{ objectFit: 'contain' }} 
            priority 
          />
        </div>
        
        {/* Animated Title */}
        <div className="text-center mb-8">
          <ScrambledText
            className="text-white font-bold tracking-tight"
            radius={200}
            duration={1.5}
            speed={0.3}
            scrambleChars=".:/|=_"
          >
            Kairos Analytics
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
          <p>© {new Date().getFullYear()} Kairos Analytics. All rights reserved.</p>  
        </div>
      </div>
    </main>
  );
}
