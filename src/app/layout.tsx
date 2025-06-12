import { Inter } from 'next/font/google'
import '../index.css'
import { Toaster } from '@/components/ui/toaster'

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
                  <a href="/" className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent">
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href="/uploads" className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent">
                    Data Uploads
                  </a>
                </li>
                <li>
                  <a href="/merchants" className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent">
                    Merchants
                  </a>
                </li>
                <li>
                  <a href="/analytics" className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent">
                    Analytics
                  </a>
                </li>
                <li>
                  <a href="/residuals" className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent">
                    Residuals
                  </a>
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
