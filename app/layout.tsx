import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ireland Pay Analytics',
  description: 'Real-time merchant analytics and insights dashboard',
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
      <body className={`${inter.className} bg-black min-h-screen`}>
        <div className="flex h-screen overflow-hidden">
          {/* Collapsible Sidebar */}
          <aside className="w-64 bg-background-secondary border-r border-card-border transition-all duration-300">
            {/* Logo Section */}
            <div className="p-6 border-b border-card-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">IP</span>
                </div>
                <span className="text-white font-semibold">IrelandPay</span>
              </div>
            </div>
            {/* Navigation */}
            <nav className="p-4">
              {/* Navigation items with hover effects */}
              <Link href="/" className="text-lg font-medium text-white hover:text-white">Dashboard</Link>
              <Link href="/dashboard/upload" className="text-lg font-medium text-white hover:text-white">Upload</Link>
              <Link href="/components-demo" className="text-lg font-medium text-white hover:text-white">Components</Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="h-16 bg-background-secondary border-b border-card-border px-6 flex items-center justify-between">
              {/* Search, notifications, user menu */}
              <div className="hidden md:flex space-x-4">
                {/* Horizontal links for md+: */}
                <Link href="/" className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white">Dashboard</Link>
                <Link href="/dashboard/upload" className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white">Upload</Link>
                <Link href="/components-demo" className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white">Components</Link>
              </div>
              <div className="md:hidden">
                {/* Mobile menu */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[240px] sm:w-[300px]">
                    <div className="flex flex-col space-y-4 mt-6">
                      <Link href="/" className="text-lg font-medium">Dashboard</Link>
                      <Link href="/dashboard/upload" className="text-lg font-medium">Upload</Link>
                      <Link href="/components-demo" className="text-lg font-medium">Components</Link>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </header>
            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-black">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}