import type { Metadata, Viewport } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase';
import { Inter, Roboto_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Font configuration for a more modern look
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter', 
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
      <body className={`${inter.variable} ${robotoMono.variable} font-sans bg-background min-h-screen text-foreground`}>
        {/* Only use the full sidebar layout for dashboard routes */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}