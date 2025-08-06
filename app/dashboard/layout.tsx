'use client'

import { useRealtimeData } from '@/hooks/use-realtime-data'
import { useMerchantData } from '@/hooks/use-merchant-data'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'
import type { Database } from '@/types/database'
import { motion } from 'framer-motion'

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
    <div className="flex flex-col min-h-screen overflow-hidden relative bg-gradient-to-br from-background via-background to-background-secondary">
      {/* Enhanced Background Animation */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
        {/* Additional gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5" />
      </div>
      
      {/* Tubelight navbar */}
      <NavBar items={navItems} />
      
      {/* Main Content */}
      <motion.main 
        className="flex-1 overflow-y-auto mt-20 sm:mt-24 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {loading ? (
            <motion.div 
              className="flex items-center justify-center h-64"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/60 animate-ping"></div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {children}
            </motion.div>
          )}
        </div>
      </motion.main>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 py-4 text-center text-sm text-foreground/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <p>© 2025 Ireland Pay Analytics. All rights reserved.</p>
        </div>
      </motion.footer>
    </div>
  )
}