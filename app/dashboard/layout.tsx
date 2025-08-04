'use client'

import { useRealtimeData } from '@/hooks/use-realtime-data'
import { useMerchantData } from '@/hooks/use-merchant-data'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'
import type { Database } from '@/types/database'

import { Home, Users, BarChart3, Settings } from 'lucide-react'
import { NavBar } from '@/components/ui/tubelight-navbar'
import { FloatingPaths } from '@/components/ui/background-paths'

type MasterData = Database['public']['Tables']['master_data_mv']['Row']

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get merchant data from the hook
  const { data: initialMerchantData, loading } = useMerchantData()
  
  // Set up realtime subscription for master data
  // Using mid as the identifier since MasterData doesn't have an id field
  const realtimeMasterData = useRealtimeData<MasterData & { id?: string }>(
    'master_data_mv',
    initialMerchantData.map(item => ({ ...item, id: item.mid }))
  )
  
  // Access the store
  const setMasterData = useStore(state => state.setMasterData)
  
  // Update the store when data changes
  useEffect(() => {
    if (realtimeMasterData.length > 0) {
      setMasterData(realtimeMasterData)
    }
  }, [realtimeMasterData, setMasterData])
  
  // Navigation items for the tubelight navbar
  const navItems = [
    { name: 'Dashboard', url: '/dashboard', icon: Home },
    { name: 'Merchants', url: '/dashboard/merchants', icon: Users },
    { name: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', url: '/dashboard/settings', icon: Settings }
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Background animation */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      
      {/* Tubelight navbar */}
      <NavBar items={navItems} />
      
      <main className="flex-1 overflow-y-auto mt-6 relative z-10">
        <div className="container mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-success"></div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

    </div>
  )
}