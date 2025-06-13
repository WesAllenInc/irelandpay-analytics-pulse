import type { Metadata } from 'next';
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
  title: 'Ireland Pay Analytics',
  description: 'Real-time merchant analytics and insights dashboard',
  themeColor: '#080a0f',
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
        <div className="flex h-screen overflow-hidden">
          {/* Collapsible Sidebar - Styled like Fey inspiration */}
          <aside className="w-64 bg-background-secondary border-r border-card-border transition-all duration-300">
            {/* Logo Section */}
            <div className="p-6 border-b border-card-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center shadow-elevated">
                  <span className="text-white font-bold">IP</span>
                </div>
                <span className="text-foreground font-semibold tracking-wide">IrelandPay</span>
              </div>
            </div>
            {/* Navigation */}
            <nav className="p-4 space-y-2.5">
              {/* Navigation items with hover effects */}
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-foreground hover:bg-card hover:shadow-card transition-all duration-200 font-medium">
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/dashboard/upload" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-foreground hover:bg-card hover:shadow-card transition-all duration-200 font-medium">
                <span>Upload</span>
              </Link>
              <Link 
                href="/dashboard/analytics" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-foreground hover:bg-card hover:shadow-card transition-all duration-200 font-medium">
                <span>Analytics</span>
              </Link>
              <Link 
                href="/dashboard/merchants" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-foreground hover:bg-card hover:shadow-card transition-all duration-200 font-medium">
                <span>Merchants</span>
              </Link>
              <Link 
                href="/components-demo" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-md text-foreground hover:bg-card hover:shadow-card transition-all duration-200 font-medium">
                <span>Components</span>
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="h-16 bg-background-secondary border-b border-card-border px-6 flex items-center justify-between">
              {/* Title and search area */}
              <div className="flex items-center space-x-4">
                <span className="text-foreground font-medium tracking-wide hidden md:inline">Ireland Pay Analytics</span>
                <div className="hidden md:block relative rounded-full bg-background border border-card-border px-4 py-1.5 min-w-[240px]">
                  <input 
                    type="text" 
                    className="bg-transparent border-none focus:outline-none text-foreground text-sm w-full" 
                    placeholder="Search..."
                  />
                </div>
              </div>
              
              {/* Right side controls */}
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" className="text-foreground-muted hover:text-foreground rounded-full w-8 h-8">
                  <span className="sr-only">Notifications</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </Button>
                
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                  IP
                </div>
                
                {/* Mobile menu */}
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Open menu">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[280px] bg-background border-l border-card-border">
                      <div className="flex flex-col space-y-4 mt-6 px-2">
                        <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2.5 rounded-md hover:bg-card transition-all duration-200">
                          <span>Dashboard</span>
                        </Link>
                        <Link href="/dashboard/upload" className="flex items-center space-x-3 px-3 py-2.5 rounded-md hover:bg-card transition-all duration-200">
                          <span>Upload</span>
                        </Link>
                        <Link href="/dashboard/analytics" className="flex items-center space-x-3 px-3 py-2.5 rounded-md hover:bg-card transition-all duration-200">
                          <span>Analytics</span>
                        </Link>
                        <Link href="/dashboard/merchants" className="flex items-center space-x-3 px-3 py-2.5 rounded-md hover:bg-card transition-all duration-200">
                          <span>Merchants</span>
                        </Link>
                        <Link href="/components-demo" className="flex items-center space-x-3 px-3 py-2.5 rounded-md hover:bg-card transition-all duration-200">
                          <span>Components</span>
                        </Link>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </header>
            
            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-background">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}