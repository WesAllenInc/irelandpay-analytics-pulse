'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Settings,
  BarChart3,
  Activity,
  Upload
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Merchants', href: '/dashboard/merchants', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Metrics', href: '/dashboard/metrics', icon: BarChart3 },
  { name: 'Reports', href: '/dashboard/reports', icon: Activity },
  { name: 'Residuals', href: '/dashboard/residuals', icon: TrendingUp },
  { name: 'Upload', href: '/dashboard/upload', icon: Upload },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function TopNavigation() {
  const pathname = usePathname()

  return (
    <div className="bg-white shadow">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="flex items-center">
                <div className="flex items-center">
                  <Image 
                    src="/IRIS IP LOGO.png" 
                    alt="Ireland Pay" 
                    width={180} 
                    height={45} 
                    className="h-10 w-auto" 
                    priority
                  />
                </div>
              </Link>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navigation.map((item) => {
                const isActive = pathname?.startsWith(item.href) || false
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* New button removed as requested */}
          
          <div className="-mr-2 flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
