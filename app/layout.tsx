import type { Metadata, Viewport } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase';
import { Sora, Roboto_Mono } from 'next/font/google';
import Link from 'next/link';
import { Analytics } from "@vercel/analytics/next";
import Providers from './providers';
import './globals.css';
import { StagewiseToolbar } from '@stagewise/toolbar-next';
import ReactPlugin from '@stagewise-plugins/react';

import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Font configuration for a more modern look
const sora = Sora({ 
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: 'Kairos Analytics',
  description: 'Real-time merchant analytics and insights dashboard',
};

export const viewport: Viewport = {
  themeColor: '#282828', // Updated to Gruvbox bg color
};

// This layout is used for the public-facing parts of the site
// Dashboard has its own layout with sidebar navigation
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${sora.variable} ${robotoMono.variable} font-sora bg-background min-h-screen text-foreground`}>
        {/* Add debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-0 right-0 bg-black/80 text-white text-xs p-1 z-50">
            Ireland Pay Analytics - {process.env.NODE_ENV}
          </div>
        )}
        
        {/* Main content with CSRF protection */}
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <Analytics />
        <StagewiseToolbar 
          config={{
            plugins: [ReactPlugin]
          }}
        />
      </body>
    </html>
  );
}