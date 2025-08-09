'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { createClientComponentClient } from "@/lib/supabase-compat"
import { Database } from '@/types/database'
import Link from 'next/link'

import { InteractiveChart } from '@/components/charts/interactive-chart'
import { ComparisonToggle } from '@/components/merchants/comparison-toggle'

type MasterData = Database['public']['Tables']['master_data_mv']['Row']
type ChartData = { time: string; value: number; [key: string]: any }

export default function MerchantComparisonPage() {
  const searchParams = useSearchParams()
  const ids = searchParams?.get('ids')
  const merchantIds = ids ? ids.split(',') : []
  const supabase = createClientComponentClient<Database>()
  
  const { selectedMerchants, comparisonMode, toggleComparisonMode } = useStore()
  const [merchants, setMerchants] = useState<MasterData[]>([])
  const [volumeData, setVolumeData] = useState<Record<string, ChartData[]>>({})
  const [profitData, setProfitData] = useState<Record<string, ChartData[]>>({})
  const [bpsData, setBpsData] = useState<Record<string, ChartData[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [comparisonType, setComparisonType] = useState<'mom' | 'yoy'>('mom')
  
  // Load merchant data
  useEffect(() => {
    const fetchMerchantData = async () => {
      setIsLoading(true)
      
      // Use IDs from URL params or from store
      const ids = merchantIds.length > 0 ? merchantIds : selectedMerchants
      
      if (ids.length === 0) {
        setIsLoading(false)
        return
      }
      
      // Fetch merchant info
      const { data: merchantData } = await supabase
        .from('master_data_mv')
        .select('*')
        .in('mid', ids)
        .order('merchant_volume', { ascending: false })
      
      if (merchantData) {
        setMerchants(merchantData)
        
        // Fetch volume data for each merchant
        const volumePromises = ids.map(async (id) => {
          const { data } = await supabase
            .from('merchant_data')
            .select('month, total_volume, total_txns')
            .eq('mid', id)
            .order('month')
          
          return { id, data }
        })
        
        // Fetch profit data for each merchant
        const profitPromises = ids.map(async (id) => {
          const { data } = await supabase
            .from('residual_data')
            .select('payout_month, net_profit')
            .eq('mid', id)
            .order('payout_month')
          
          return { id, data }
        })
        
        // Wait for all data to load
        const volumeResults = await Promise.all(volumePromises)
        const profitResults = await Promise.all(profitPromises)
        
        // Format volume data
        const formattedVolumeData: Record<string, ChartData[]> = {}
        volumeResults.forEach(result => {
          if (result.data) {
            formattedVolumeData[result.id] = result.data.map(item => ({
              time: item.month!,
              value: item.total_volume,
              transactions: item.total_txns
            }))
          }
        })
        
        // Format profit data
        const formattedProfitData: Record<string, ChartData[]> = {}
        profitResults.forEach(result => {
          if (result.data) {
            formattedProfitData[result.id] = result.data.map(item => ({
              time: item.payout_month!,
              value: item.net_profit
            }))
          }
        })
        
        // Calculate BPS data
        const formattedBpsData: Record<string, ChartData[]> = {}
        ids.forEach(id => {
          const merchantVolume = formattedVolumeData[id] || []
          const merchantProfit = formattedProfitData[id] || []
          
          formattedBpsData[id] = merchantVolume
            .map(volume => {
              // Find matching profit data for the same month
              const profit = merchantProfit.find(p => p.time === volume.time)
              
              if (profit && volume.value > 0) {
                return {
                  time: volume.time,
                  value: (profit.value / volume.value) * 10000 // Convert to basis points
                }
              }
              return null
            })
            .filter(Boolean) as ChartData[]
        })
        
        setVolumeData(formattedVolumeData)
        setProfitData(formattedProfitData)
        setBpsData(formattedBpsData)
      }
      
      setIsLoading(false)
    }
    
    fetchMerchantData()
  }, [merchantIds, selectedMerchants, supabase])
  
  // Enable comparison mode by default
  useEffect(() => {
    if (!comparisonMode) {
      toggleComparisonMode()
    }
  }, [comparisonMode, toggleComparisonMode])
  
  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }
  
  // Calculate performance ranking
  const calculateRanking = () => {
    if (merchants.length === 0) return []
    
    return merchants.map(merchant => {
      // Get latest volume and profit
      const merchantVolumeData = volumeData[merchant.mid] || []
      const merchantProfitData = profitData[merchant.mid] || []
      const merchantBpsData = bpsData[merchant.mid] || []
      
      const latestVolume = merchantVolumeData.length > 0 
        ? merchantVolumeData[merchantVolumeData.length - 1].value 
        : 0
      
      const latestProfit = merchantProfitData.length > 0 
        ? merchantProfitData[merchantProfitData.length - 1].value 
        : 0
      
      const latestBps = merchantBpsData.length > 0 
        ? merchantBpsData[merchantBpsData.length - 1].value 
        : 0
      
      // Calculate month-over-month changes
      const previousMonthVolume = merchantVolumeData.length > 1 
        ? merchantVolumeData[merchantVolumeData.length - 2].value 
        : 0
      
      const previousMonthProfit = merchantProfitData.length > 1 
        ? merchantProfitData[merchantProfitData.length - 2].value 
        : 0
      
      const volumeChange = previousMonthVolume > 0 
        ? ((latestVolume - previousMonthVolume) / previousMonthVolume) * 100 
        : 0
      
      const profitChange = previousMonthProfit > 0 
        ? ((latestProfit - previousMonthProfit) / previousMonthProfit) * 100 
        : 0
      
      return {
        merchant,
        metrics: {
          volume: latestVolume,
          profit: latestProfit,
          bps: latestBps,
          volumeChange,
          profitChange
        }
      }
    }).sort((a, b) => b.metrics.profit - a.metrics.profit) // Sort by profit
  }
  
  const rankings = calculateRanking()

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Merchant Comparison</h1>
            <p className="text-sm text-gray-400 mt-1">
              Comparing {merchants.length} merchant{merchants.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
      
      {/* Comparison type toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Merchants:</span>
          <div className="flex items-center gap-2">
            {merchants.map(merchant => (
              <Link 
                key={merchant.mid}
                href={`/dashboard/merchants/${merchant.mid}`}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
              >
                {merchant.merchant_dba}
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Comparison:</span>
          <div className="flex items-center bg-gray-800 rounded-md p-1">
            <button
              onClick={() => setComparisonType('mom')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                comparisonType === 'mom'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Month over Month
            </button>
            <button
              onClick={() => setComparisonType('yoy')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                comparisonType === 'yoy'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Year over Year
            </button>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : merchants.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-4">No Merchants Selected</h2>
          <p className="text-gray-400 mb-6">
            Select merchants from the dashboard to compare their performance.
          </p>
          <Link 
            href="/dashboard" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <>
          {/* Synchronized charts */}
          <div className="space-y-6">
            {/* Volume comparison */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Transaction Volume</h2>
              <div className="h-[400px]">
                <InteractiveChart 
                  data={volumeData[merchants[0]?.mid] || []}
                  title={merchants[0]?.merchant_dba || 'Volume'}
                  type="area"
                  color="#2962FF"
                  id="volume-comparison-chart"
                  additionalSeries={merchants.slice(1).map((merchant, index) => ({
                    data: volumeData[merchant.mid] || [],
                    title: merchant.merchant_dba,
                    color: [
                      '#00E676',
                      '#FF9800',
                      '#E91E63',
                      '#9C27B0',
                      '#607D8B'
                    ][index % 5],
                    type: 'area'
                  }))}
                />
              </div>
            </div>
            
            {/* Profit comparison */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Net Profit</h2>
              <div className="h-[400px]">
                <InteractiveChart 
                  data={profitData[merchants[0]?.mid] || []}
                  title={merchants[0]?.merchant_dba || 'Profit'}
                  type="line"
                  color="#00E676"
                  id="profit-comparison-chart"
                  additionalSeries={merchants.slice(1).map((merchant, index) => ({
                    data: profitData[merchant.mid] || [],
                    title: merchant.merchant_dba,
                    color: [
                      '#2962FF',
                      '#FF9800',
                      '#E91E63',
                      '#9C27B0',
                      '#607D8B'
                    ][index % 5],
                    type: 'line'
                  }))}
                />
              </div>
            </div>
            
            {/* BPS comparison */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Basis Points (BPS)</h2>
              <div className="h-[400px]">
                <InteractiveChart 
                  data={bpsData[merchants[0]?.mid] || []}
                  title={merchants[0]?.merchant_dba || 'BPS'}
                  type="line"
                  color="#FF9800"
                  id="bps-comparison-chart"
                  additionalSeries={merchants.slice(1).map((merchant, index) => ({
                    data: bpsData[merchant.mid] || [],
                    title: merchant.merchant_dba,
                    color: [
                      '#2962FF',
                      '#00E676',
                      '#E91E63',
                      '#9C27B0',
                      '#607D8B'
                    ][index % 5],
                    type: 'line'
                  }))}
                />
              </div>
            </div>
            
            {/* Performance ranking table */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Performance Ranking</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-sm text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Merchant</th>
                      <th className="py-3 px-4">Volume</th>
                      <th className="py-3 px-4">Volume Change</th>
                      <th className="py-3 px-4">Profit</th>
                      <th className="py-3 px-4">Profit Change</th>
                      <th className="py-3 px-4">BPS</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {rankings.map((item, index) => (
                      <tr key={item.merchant.mid} className="border-b border-gray-800">
                        <td className="py-3 px-4 font-medium">{index + 1}</td>
                        <td className="py-3 px-4">
                          <Link href={`/dashboard/merchants/${item.merchant.mid}`} className="text-blue-400 hover:underline">
                            {item.merchant.merchant_dba}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{formatCurrency(item.metrics.volume)}</td>
                        <td className="py-3 px-4">
                          <span className={`${item.metrics.volumeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.metrics.volumeChange >= 0 ? '↑' : '↓'} 
                            {Math.abs(item.metrics.volumeChange).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">{formatCurrency(item.metrics.profit)}</td>
                        <td className="py-3 px-4">
                          <span className={`${item.metrics.profitChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.metrics.profitChange >= 0 ? '↑' : '↓'} 
                            {Math.abs(item.metrics.profitChange).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">{item.metrics.bps.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
