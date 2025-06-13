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
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
          <header className="w-full bg-white dark:bg-gray-800 shadow-sm">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
              {/* Logo and nav links, which collapse into a burger menu at md: */}
              <div className="flex items-center justify-between w-full">
                <Link href="/" className="text-xl font-bold dark:text-white">IrelandPay</Link>
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
              </div>
            </nav>
          </header>
          <main className="flex flex-col flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="bg-white dark:bg-gray-800 shadow-inner py-4">
            <div className="max-w-7xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
              © 2025 IrelandPay Analytics
            </div>
          </footer>
          <Toaster />
        </div>
      </body>
    </html>
  );
}