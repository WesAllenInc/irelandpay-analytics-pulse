'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Settings,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export function AdminSidebar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Admin Navigation Items
  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: BarChart3,
    },
    {
      name: 'Agent Payouts',
      href: '/admin/agent-payouts',
      icon: Users,
    },
    {
      name: 'Sync Scheduling',
              href: '/dashboard/settings?tab=sync',
      icon: Clock,
    },
    {
      name: 'Data Validation',
      href: '/admin/data-validation',
      icon: ShieldCheck,
    },

    {
      name: 'Excel Reports',
      href: '/admin/reports',
      icon: FileSpreadsheet,
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ]

  return (
    <div
      className={cn(
        'flex flex-col border-r bg-muted/40 transition-all duration-300',
        isCollapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Admin Header with brand */}
      <div className="p-4 flex items-center justify-between border-b">
        {!isCollapsed && (
          <div className="font-semibold text-lg">Admin Portal</div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      {/* Admin Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center px-2 py-2 rounded-md hover:bg-accent/50 transition-colors',
                  pathname === item.href && 'bg-accent text-accent-foreground',
                  isCollapsed ? 'justify-center' : 'space-x-3'
                )}
              >
                <item.icon size={20} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-3 border-t">
        <div className={cn(
          'flex items-center',
          isCollapsed ? 'justify-center' : 'space-x-3'
        )}>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">
                {user?.email?.split('@')[0]}
              </span>
              <Button
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={signOut}
              >
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
