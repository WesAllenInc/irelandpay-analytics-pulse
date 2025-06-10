import { createClient } from '@/lib/supabase/server'
import { TradingViewWidget } from '@/components/charts/trading-view-widget-final'
import { TotalSalesChart } from '@/components/charts/total-sales-chart'
import { EstimatedProfitChart } from '@/components/charts/estimated-profit-chart'
import { MetricsCards } from '@/components/dashboard/metrics-cards'
import { MerchantTable } from '@/components/dashboard/merchant-table'
import { RealtimeIndicator } from '@/components/dashboard/realtime-indicator'
import { 
  getDaysInCurrentMonth, 
  getDaysElapsedInMonth, 
  formatDateToMMDD,
  calculateEOMEstimate,
  generateCurrentMonthDates,
  formatDateToYYYYMMDD
} from '@/lib/utils/date-utils'

// Animation-related imports
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

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
    
  // Fetch daily sales data for MTD chart
  const { data: dailySalesData } = await supabase
    .from('merchant_volume')
    .select('volume_date, daily_volume')
    .gte('volume_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    .lte('volume_date', new Date().toISOString())
    .order('volume_date')
    
  // Fetch merchant profitability data
  const { data: merchantProfitability } = await supabase
    .from('estimated_net_profit')
    .select('merchant_id, name, bps_last_month, projected_volume_this_month, estimated_profit')
    .order('estimated_profit', { ascending: false })

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
  
  // Process daily sales data for MTD chart
  const daysInMonth = getDaysInCurrentMonth()
  const daysElapsed = getDaysElapsedInMonth()
  
  // Create a map of date to daily volume
  const dailySalesMap = new Map()
  dailySalesData?.forEach(item => {
    const dateStr = item.volume_date.split('T')[0]
    const existing = dailySalesMap.get(dateStr) || 0
    dailySalesMap.set(dateStr, existing + item.daily_volume)
  })
  
  // Calculate MTD total
  const mtdTotal = Array.from(dailySalesMap.values()).reduce((sum, val) => sum + val, 0)
  
  // Calculate EOM estimate
  const eomEstimate = calculateEOMEstimate(mtdTotal, daysElapsed, daysInMonth)
  
  // Generate data for the chart
  const currentMonthDates = generateCurrentMonthDates()
  const salesChartData = currentMonthDates.map(date => {
    const dateStr = formatDateToYYYYMMDD(date)
    const displayDate = formatDateToMMDD(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const isInFuture = date > today
    const isPast = date < today
    
    return {
      date: displayDate,
      actualVolume: isPast ? (dailySalesMap.get(dateStr) || 0) : 0,
      projectedVolume: isInFuture ? eomEstimate / daysInMonth : undefined
    }
  })
  
  // Process merchant profitability data
  const merchants = merchantProfitability?.map(item => ({
    merchantId: item.merchant_id,
    name: item.name,
    bps: item.bps_last_month,
    projectedVolume: item.projected_volume_this_month,
    estimatedProfit: item.estimated_profit
  })) || []
  
  const totalEstimatedProfit = merchants.reduce((sum, merchant) => sum + merchant.estimatedProfit, 0)

  const metrics = {
    totalVolume: currentVolume,
    volumeChange: lastVolume ? ((currentVolume - lastVolume) / lastVolume) * 100 : 0,
    totalTransactions: currentTxns,
    transactionsChange: lastTxns ? ((currentTxns - lastTxns) / lastTxns) * 100 : 0,
    activeMerchants: topMerchants?.length || 0,
    avgTransactionValue: currentTxns > 0 ? currentVolume / currentTxns : 0,
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 group">  
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
          <span className="inline-flex transition-all duration-300 group-hover:rotate-12">
            <Sparkles className="h-6 w-6 text-yellow-500 opacity-70 group-hover:opacity-100" />
          </span>
          <Badge variant="outline" className="ml-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-none p-1 px-2">
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Badge>
        </div>
        <RealtimeIndicator />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <MetricsCards metrics={metrics} />
      </motion.div>
      
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <TotalSalesChart
          data={salesChartData}
          mtdTotal={mtdTotal}
          eomEstimate={eomEstimate}
          daysElapsed={daysElapsed}
          totalDaysInMonth={daysInMonth}
        />
        <EstimatedProfitChart
          merchants={merchants}
          totalEstimatedProfit={totalEstimatedProfit}
        />
      </motion.div>
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <TradingViewWidget 
          data={aggregatedVolumeData} 
          title="Transaction Volume (Historical)" 
          height={400}
          type="area"
          color="#2962FF"
        />
        <TradingViewWidget 
          data={aggregatedProfitData} 
          title="Net Profit (Historical)" 
          height={400}
          type="line"
          color="#00E676"
        />
      </motion.div>
      
      <motion.div 
        className="bg-gray-900 rounded-lg border border-gray-800 p-6 hover:shadow-lg hover:shadow-blue-900/20 transition-all duration-300 overflow-x-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Top Merchants</h2>
          <div className="px-2 py-1 bg-blue-600/20 rounded-md border border-blue-800 text-blue-400 text-xs font-medium">
            Updated {new Date().toLocaleDateString()}
          </div>
        </div>
        <div className="w-full min-w-[400px]">
          <MerchantTable merchants={topMerchants || []} />
        </div>
      </motion.div>
    </motion.div>
  )
}