import { Inter } from 'next/font/google'
import '../index.css'
import { Toaster } from '@/components/ui/toaster'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Ireland Pay Analytics',
  description: 'Analytics platform for Ireland Pay merchant and residual data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen flex">
          <aside className="w-64 bg-sidebar-background border-r border-sidebar-border">
            <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
              <h1 className="text-lg font-semibold">Ireland Pay Analytics</h1>
            </div>
            <nav className="p-2">
              <ul className="space-y-1">
                <li>
                  <Link href="/" className={`sidebar-nav-link ${pathname === '/' ? 'active' : ''}`}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/uploads" className={`sidebar-nav-link ${pathname.startsWith('/uploads') ? 'active' : ''}`}>
                    Data Uploads
                  </Link>
                </li>
                <li>
                  <Link href="/merchants" className={`sidebar-nav-link ${pathname.startsWith('/merchants') ? 'active' : ''}`}>
                    Merchants
                  </Link>
                </li>
                <li>
                  <Link href="/analytics" className={`sidebar-nav-link ${pathname.startsWith('/analytics') ? 'active' : ''}`}>
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link href="/residuals" className={`sidebar-nav-link ${pathname.startsWith('/residuals') ? 'active' : ''}`}>
                    Residuals
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
          <div className="flex-grow">
            <header className="h-16 border-b flex items-center px-6 bg-background">
              <div className="ml-auto">
                {/* Profile or account section could go here */}
              </div>
            </header>
            <div className="p-6">
              {children}
            </div>
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  )
}
