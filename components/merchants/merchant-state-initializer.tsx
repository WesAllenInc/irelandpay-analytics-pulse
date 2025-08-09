'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { Database } from '@/types/database.types'

type MasterData = Database['public']['Tables']['master_data_mv']['Row']
type ChartData = { time: string; value: number; [key: string]: any }

interface MerchantStateInitializerProps {
  merchant: MasterData
  volumeData: ChartData[]
  profitData: ChartData[]
}

export function MerchantStateInitializer({ 
  merchant, 
  volumeData, 
  profitData 
}: MerchantStateInitializerProps) {
  const { 
    setSelectedMerchant,
    setMasterData
  } = useStore()
  
  // Initialize the store with the merchant data
  useEffect(() => {
    if (merchant) {
      // Set the selected merchant in the store
      setSelectedMerchant({
        id: merchant.mid,
        mid: merchant.mid,
        merchant_dba: merchant.merchant_dba,
        datasource: merchant.datasource,
        total_txns: merchant.total_txns,
        total_volume: merchant.merchant_volume,
        month: merchant.volume_month || '',
        created_at: new Date().toISOString()
      })
      
      // Cache the chart data in the store
      if (volumeData && profitData) {
        // Convert to the format expected by the store
        const masterDataForStore = volumeData.map(volume => {
          // Find matching profit data for the same month
          const profit = profitData.find(p => p.time === volume.time)
          
          return {
            mid: merchant.mid,
            merchant_dba: merchant.merchant_dba,
            datasource: merchant.datasource,
            volume_month: volume.time,
            merchant_volume: volume.value,
            total_txns: volume.transactions || 0,
            net_profit: profit?.value || null,
            profit_month: profit?.time || null,
            profit_margin: profit?.value && volume.value ? (profit.value / volume.value) : null,
            year: new Date(volume.time).getFullYear(),
            month_num: new Date(volume.time).getMonth() + 1
          }
        })
        
        setMasterData(masterDataForStore)
      }
    }
  }, [merchant, volumeData, profitData, setSelectedMerchant, setMasterData])
  
  // This is a client component that doesn't render anything
  return null
}
