'use client'

import { FeySidebar } from '@/components/navigation/FeySidebar'
import { useRealtimeData } from '@/hooks/use-realtime-data'
import { useMerchantData } from '@/hooks/use-merchant-data'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'
import type { Database } from '@/types/database'
import { StagewiseToolbarWrapper } from '@/components/ui/stagewise-toolbar'

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
  
  return (
    <div className="flex h-screen overflow-hidden">
      <FeySidebar />
      <main className="flex-1 overflow-y-auto">
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
      <StagewiseToolbarWrapper />
    </div>
  )
}