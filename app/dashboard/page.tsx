import { createClient } from '@/lib/supabase/server'
import { TradingViewWidget } from '@/components/charts/trading-view-widget'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { MerchantTable } from '@/components/dashboard/merchant-table'
import { RealtimeIndicator } from '@/components/dashboard/realtime-indicator'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Fetch current month data for metrics
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7) + '-01'
  
  // Get aggregated metrics
  const { data: currentMetrics } = await supabase
    .from('merchant_data')
    .select('total_volume, total_txns')
    .gte('month', currentMonth)
    .order('month', { ascending: false })
  
  const { data: lastMonthMetrics } = await supabase
    .from('merchant_data')
    .select('total_volume, total_txns')
    .gte('month', lastMonth)
    .lt('month', currentMonth)
  
  // Calculate totals
  const currentVolume = currentMetrics?.reduce((sum, m) => sum + m.total_volume, 0) || 0
  const currentTxns = currentMetrics?.reduce((sum, m) => sum + m.total_txns, 0) || 0
  const lastVolume = lastMonthMetrics?.reduce((sum, m) => sum + m.total_volume, 0) || 0
  const lastTxns = lastMonthMetrics?.reduce((sum, m) => sum + m.total_txns, 0) || 0
  
  // Fetch time series data for charts
  const { data: volumeData } = await supabase
    .from('merchant_data')
    .select('month, total_volume')
    .not('month', 'is', null)
    .order('month')
    .gte('month', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

  const { data: profitData } = await supabase
    .from('master_data_mv')
    .select('volume_month, net_profit')
    .not('volume_month', 'is', null)
    .not('net_profit', 'is', null)
    .order('volume_month')
    .gte('volume_month', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

  // Get top merchants
  const { data: topMerchants } = await supabase
    .from('master_data_mv')
    .select('*')
    .order('merchant_volume', { ascending: false })
    .limit(10)

  // Aggregate volume data by month
  const aggregatedVolumeData = volumeData?.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.time === curr.month)
    if (existing) {
      existing.value += curr.total_volume
    } else {
      acc.push({ time: curr.month, value: curr.total_volume })
    }
    return acc
  }, []) || []

  // Aggregate profit data by month
  const aggregatedProfitData = profitData?.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.time === curr.volume_month)
    if (existing) {
      existing.value += curr.net_profit
    } else {
      acc.push({ time: curr.volume_month, value: curr.net_profit })
    }
    return acc
  }, []) || []

  const metrics = {
    totalVolume: currentVolume,
    volumeChange: lastVolume ? ((currentVolume - lastVolume) / lastVolume) * 100 : 0,
    totalTransactions: currentTxns,
    transactionsChange: lastTxns ? ((currentTxns - lastTxns) / lastTxns) * 100 : 0,
    activeMerchants: topMerchants?.length || 0,
    avgTransactionValue: currentTxns > 0 ? currentVolume / currentTxns : 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
        <RealtimeIndicator />
      </div>
      
      <MetricsCards metrics={metrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TradingViewWidget 
          data={aggregatedVolumeData} 
          title="Transaction Volume" 
          height={400}
          type="area"
          color="#2962FF"
        />
        <TradingViewWidget 
          data={aggregatedProfitData} 
          title="Net Profit" 
          height={400}
          type="line"
          color="#00E676"
        />
      </div>
      
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Top Merchants</h2>
        <MerchantTable merchants={topMerchants || []} />
      </div>
    </div>
  )
}