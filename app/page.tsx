'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Temporary component that redirects to dashboard
export default function LandingPage() {
  const router = useRouter();
  
  // Automatically redirect to dashboard
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  // Show a simple loading screen briefly while redirecting
  return (
    <div className="min-h-screen bg-gruvbox-bg flex flex-col items-center justify-center p-4">
      {/* Gradient background effect - Gruvbox Dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-gruvbox-green/20 via-transparent to-transparent" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gruvbox-yellow to-gruvbox-orange rounded-2xl flex items-center justify-center shadow-lg shadow-gruvbox-yellow/20">
              <span className="text-2xl font-bold text-gruvbox-bg">IP</span>
            </div>
            <h1 className="text-4xl font-bold text-gruvbox-fg-1">IrelandPay</h1>
          </div>
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center space-x-2 text-gruvbox-fg-1">
          <div className="w-3 h-3 rounded-full bg-gruvbox-yellow animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-gruvbox-orange animate-pulse delay-150" />
          <div className="w-3 h-3 rounded-full bg-gruvbox-green animate-pulse delay-300" />
          <span className="ml-3 text-gruvbox-gray">Redirecting to dashboard...</span>
        </div>
      </div>
    </div>
  );
}
