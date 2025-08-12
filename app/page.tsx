'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FloatingPaths } from '@/components/ui/background-paths';

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
          // Executive users always get admin access
          const { isExecutiveUser } = await import('@/lib/auth/executive-check');
          const isExecutive = isExecutiveUser(session.user.email);
          
          if (isExecutive) {
            console.log('[Landing] Executive user detected, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
          
          // For non-executive users, check database role
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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white dark:bg-gruvbox-bg">
      {/* Background animation */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-4xl mx-auto"
        >
          {error ? (
            <div className="backdrop-blur-lg bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md mx-auto">
              <motion.h1 
                className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-100"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                Authentication Error
              </motion.h1>
              <motion.p 
                className="mb-6 text-white/80"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                {error}
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button asChild variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-red-300/30">
                  <Link href="/auth">Go to Login</Link>
                </Button>
              </motion.div>
            </div>
          ) : (
            <>
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
                {"Ireland Pay".split(" ").map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    className="inline-block mr-4 last:mr-0"
                  >
                    {word.split("").map((letter, letterIndex) => (
                      <motion.span
                        key={`${wordIndex}-${letterIndex}`}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                          delay: wordIndex * 0.1 + letterIndex * 0.03,
                          type: "spring",
                          stiffness: 150,
                          damping: 25,
                        }}
                        className="inline-block text-transparent bg-clip-text 
                        bg-gradient-to-r from-neutral-900 to-neutral-700/80 
                        dark:from-white dark:to-white/80"
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </span>
                ))}
              </h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-12 text-xl text-neutral-600 dark:text-neutral-300"
              >
                <p>Analytics Platform</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="flex items-center justify-center space-x-3 my-8"
              >
                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse delay-150" />
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-300" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="inline-block group relative bg-gradient-to-b from-black/10 to-white/10 
                dark:from-white/10 dark:to-black/10 p-px rounded-2xl backdrop-blur-lg 
                overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <Button
                  asChild
                  variant="ghost"
                  className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md 
                  bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 
                  text-black dark:text-white transition-all duration-300 
                  group-hover:-translate-y-0.5 border border-black/10 dark:border-white/10
                  hover:shadow-md dark:hover:shadow-neutral-800/50"
                >
                  <Link href="/auth">
                    <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                      Enter Analytics
                    </span>
                    <span
                      className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 
                      transition-all duration-300"
                    >
                      →
                    </span>
                  </Link>
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
