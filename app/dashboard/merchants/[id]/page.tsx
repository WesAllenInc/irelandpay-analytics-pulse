import { createClient } from '../../../../lib/supabase/server'
import { notFound } from 'next/navigation'
import { format, subMonths, subYears, parseISO, differenceInDays } from 'date-fns'

import { MerchantHeader } from '@/components/merchants/merchant-header'
import { MerchantMetrics } from '@/components/merchants/merchant-metrics'
import { InteractiveChart } from '@/components/charts/interactive-chart'
import { ProfitAnalysis } from '@/components/merchants/profit-analysis'
import { VolumeToProfit } from '@/components/merchants/volume-to-profit'
import { DataFreshness } from '@/components/merchants/data-freshness'
import { ComparisonToggle } from '@/components/merchants/comparison-toggle'
import { MerchantStateInitializer } from '@/components/merchants/merchant-state-initializer'

// Define proper type for Next.js 15 dynamic route params
type Props = {
  params: Promise<{ id: string }>
}

// Add metadata generation for consistency
export async function generateMetadata({ params }: Props): Promise<{ title: string }> {
  const resolvedParams = await params;
  return {
    title: `Merchant: ${resolvedParams.id}`,
  }
}

export default async function MerchantDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const supabase = await createClient()
  
  // Fetch merchant data
  const { data: merchant } = await supabase
    .from('master_data_mv')
    .select('*')
    .eq('mid', resolvedParams.id)
    .order('volume_month', { ascending: false })
    .limit(1)
    .single()
  
  if (!merchant) {
    notFound()
  }

  // Get current date for calculations
  const currentDate = new Date()
  
  // Calculate date ranges for different time periods
  const oneYearAgo = format(subYears(currentDate, 1), 'yyyy-MM-dd')
  const twoYearsAgo = format(subYears(currentDate, 2), 'yyyy-MM-dd')
  
  // Fetch historical volume data (2 years)
  const { data: volumeData } = await supabase
    .from('merchant_data')
    .select('month, total_volume, total_txns')
    .eq('mid', resolvedParams.id)
    .gte('month', twoYearsAgo)
    .order('month')
  
  // Fetch historical profit data (2 years)
  const { data: profitData } = await supabase
    .from('residual_data')
    .select('payout_month, net_profit')
    .eq('mid', resolvedParams.id)
    .gte('payout_month', twoYearsAgo)
    .order('payout_month')
  
  // Fetch master data for combined analysis
  const { data: masterData } = await supabase
    .from('master_data_mv')
    .select('*')
    .eq('mid', resolvedParams.id)
    .order('volume_month')
  
  // Format data for charts
  const volumeChartData = volumeData?.map(item => ({
    time: item.month!,
    value: item.total_volume,
    transactions: item.total_txns
  })) || []
  
  const profitChartData = profitData?.map(item => ({
    time: item.payout_month!,
    value: item.net_profit
  })) || []
  
  // Calculate basis points data (profit / volume * 10000)
  const bpsData = (masterData?.map(item => {
    // Find matching volume data for the same month
    const volumeItem = volumeData?.find(v => v.month === item.volume_month)
    
    if (item.net_profit && volumeItem && volumeItem.total_volume > 0) {
      return {
        time: item.volume_month!,
        value: (item.net_profit / volumeItem.total_volume) * 10000 // Convert to basis points
      }
    }
    return null
  }).filter(Boolean) || []) as { time: any; value: number }[]
  
  // Calculate profit per transaction
  const profitPerTxnData = (masterData?.map(item => {
    if (item.net_profit && item.total_txns > 0) {
      return {
        time: item.volume_month!,
        value: item.net_profit / item.total_txns
      }
    }
    return null
  }).filter(Boolean) || []) as { time: any; value: number }[]
  
  // Calculate correlation data for scatter plot
  const correlationData = (masterData?.map(item => {
    if (item.net_profit && item.merchant_volume) {
      return {
        x: item.merchant_volume,
        y: item.profit_margin || 0,
        time: item.volume_month!
      }
    }
    return null
  }).filter(Boolean) || []) as { x: any; y: any; time: any }[]
  
  // Calculate moving averages
  const calculateMovingAverage = (data: any[], period: number) => {
    return data.map((item, index) => {
      // Not enough previous data points for moving average
      if (index < period - 1) return null
      
      // Calculate sum of previous n periods
      let sum = 0
      for (let i = 0; i < period; i++) {
        sum += data[index - i].value
      }
      
      return {
        time: item.time,
        value: sum / period
      }
    }).filter(Boolean)
  }
  
  const threeMonthMA = calculateMovingAverage(profitChartData, 3) as { time: any; value: number }[]
  const twelveMonthMA = calculateMovingAverage(profitChartData, 12) as { time: any; value: number }[]
  
  // Calculate data freshness
  const lastVolumeUpdate = volumeData && volumeData.length > 0 
    ? parseISO(volumeData[volumeData.length - 1].month!) 
    : null
    
  const lastProfitUpdate = profitData && profitData.length > 0 
    ? parseISO(profitData[profitData.length - 1].payout_month!) 
    : null
    
  const volumeDataAge = lastVolumeUpdate 
    ? differenceInDays(currentDate, lastVolumeUpdate) 
    : null
    
  const profitDataAge = lastProfitUpdate 
    ? differenceInDays(currentDate, lastProfitUpdate) 
    : null
    
  const isProfitDataStale = !!(profitDataAge && profitDataAge > 35)
  
  // Prepare metrics for display
  const currentMonthVolume = volumeData && volumeData.length > 0 
    ? volumeData[volumeData.length - 1].total_volume 
    : 0
    
  const previousMonthVolume = volumeData && volumeData.length > 1 
    ? volumeData[volumeData.length - 2].total_volume 
    : 0
    
  const volumeMoMChange = previousMonthVolume > 0 
    ? ((currentMonthVolume - previousMonthVolume) / previousMonthVolume) * 100 
    : 0
    
  const currentMonthProfit = profitData && profitData.length > 0 
    ? profitData[profitData.length - 1].net_profit 
    : 0
    
  const previousMonthProfit = profitData && profitData.length > 1 
    ? profitData[profitData.length - 2].net_profit 
    : 0
    
  const profitMoMChange = previousMonthProfit > 0 
    ? ((currentMonthProfit - previousMonthProfit) / previousMonthProfit) * 100 
    : 0
    
  const isProfitDecline = profitMoMChange < -10 // Alert if profit drops more than 10%
  
  // Calculate YoY data for comparison
  const lastYearSameMonthVolume = volumeData?.find(item => {
    const itemDate = parseISO(item.month!)
    const lastYearSameMonth = subYears(currentDate, 1)
    return itemDate.getMonth() === lastYearSameMonth.getMonth() && 
           itemDate.getFullYear() === lastYearSameMonth.getFullYear()
  })?.total_volume || 0
  
  const volumeYoYChange = lastYearSameMonthVolume > 0 
    ? ((currentMonthVolume - lastYearSameMonthVolume) / lastYearSameMonthVolume) * 100 
    : 0
    
  const lastYearSameMonthProfit = profitData?.find(item => {
    const itemDate = parseISO(item.payout_month!)
    const lastYearSameMonth = subYears(currentDate, 1)
    return itemDate.getMonth() === lastYearSameMonth.getMonth() && 
           itemDate.getFullYear() === lastYearSameMonth.getFullYear()
  })?.net_profit || 0
  
  const profitYoYChange = lastYearSameMonthProfit > 0 
    ? ((currentMonthProfit - lastYearSameMonthProfit) / lastYearSameMonthProfit) * 100 
    : 0
  
  // Calculate profit efficiency score
  const currentMonthTxns = volumeData && volumeData.length > 0 
    ? volumeData[volumeData.length - 1].total_txns 
    : 0
    
  const profitEfficiencyScore = currentMonthTxns > 0 
    ? currentMonthProfit / currentMonthTxns 
    : 0
  
  // Prepare metrics object for the metrics component
  const metrics = {
    volume: {
      current: currentMonthVolume,
      momChange: volumeMoMChange,
      yoyChange: volumeYoYChange
    },
    profit: {
      current: currentMonthProfit,
      momChange: profitMoMChange,
      yoyChange: profitYoYChange,
      isDecline: isProfitDecline
    },
    transactions: {
      current: currentMonthTxns,
      profitEfficiency: profitEfficiencyScore
    },
    basisPoints: {
      current: currentMonthVolume > 0 ? (currentMonthProfit / currentMonthVolume) * 10000 : 0
    },
    freshness: {
      volumeDataAge,
      profitDataAge,
      isProfitDataStale
    }
  }

  return (
    <div className="space-y-6">
      {/* Initialize client state */}
      <MerchantStateInitializer 
        merchant={merchant}
        volumeData={volumeChartData}
        profitData={profitChartData}
      />
      
      {/* Merchant header with actions */}
      <MerchantHeader 
        merchant={merchant} 
        freshness={{
          volumeDataAge: volumeDataAge || 0,
          profitDataAge: profitDataAge || 0,
          isProfitDataStale: isProfitDataStale || false
        }}
      />
      
      {/* Comparison toggle buttons */}
      <ComparisonToggle />
      
      {/* Metrics cards */}
      <MerchantMetrics metrics={metrics} />
      
      {/* Interactive charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InteractiveChart 
          data={volumeChartData} 
          title="Transaction Volume" 
          type="area"
          color="#2962FF"
          id="volume-chart"
        />
        <InteractiveChart 
          data={profitChartData} 
          title="Net Profit" 
          type="line"
          color="#00E676"
          id="profit-chart"
          additionalSeries={[
            { 
              data: threeMonthMA.filter((d): d is { time: any; value: number } => d !== null), 
              title: '3-Month MA', 
              color: '#FF9800',
              type: 'line'
            },
            { 
              data: twelveMonthMA.filter((d): d is { time: any; value: number } => d !== null), 
              title: '12-Month MA', 
              color: '#E91E63',
              type: 'line'
            }
          ]}
          showAlert={isProfitDecline}
          alertMessage="Profit decline >10% MoM"
        />
      </div>
      
      {/* Profit Analysis Section */}
      <ProfitAnalysis 
        profitData={profitChartData}
        bpsData={bpsData}
        movingAverages={{
          threeMonth: threeMonthMA,
          twelveMonth: twelveMonthMA
        }}
        isProfitDecline={isProfitDecline}
      />
      
      {/* Volume to Profit Correlation */}
      <VolumeToProfit 
        correlationData={correlationData}
        profitPerTxnData={profitPerTxnData}
        dualAxisData={{
          volume: volumeChartData,
          margin: masterData?.map(item => ({
            time: item.volume_month!,
            value: item.profit_margin || 0
          })).filter((d): d is { time: any; value: number } => d !== null) || []
        }}
      />
      
      {/* Data Freshness Indicators */}
      <DataFreshness 
        volumeDataAge={volumeDataAge || 0}
        profitDataAge={profitDataAge || 0}
        isProfitDataStale={isProfitDataStale || false}
        lastVolumeUpdate={lastVolumeUpdate}
        lastProfitUpdate={lastProfitUpdate}
      />
    </div>
  )
}