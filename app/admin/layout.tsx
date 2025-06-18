'use client'

import RouteGuard from '@/components/Auth/RouteGuard'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Toaster } from '@/components/ui/toaster'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Only allow users with admin role to access admin routes
    <RouteGuard requireAuth={true} requireAdmin={true}>
      <div className="flex h-screen">
        {/* Admin sidebar navigation */}
        <AdminSidebar />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
        
        <Toaster />
      </div>
    </RouteGuard>
  )
}
