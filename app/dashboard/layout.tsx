import { NavSidebar } from '@/components/dashboard/nav-sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-950">
      <NavSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}