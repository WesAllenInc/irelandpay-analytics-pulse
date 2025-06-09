import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MerchantTable } from '@/components/dashboard/merchant-table'
import { TrendingUpIcon, TrendingDownIcon, AlertCircleIcon, FilterIcon } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { TradingViewWidget } from '@/components/charts/trading-view-widget-final'

export default async function MerchantsPage() {
  // Get current date and date from 3 months ago
  const currentDate = new Date()
  const threeMonthsAgo = format(subMonths(currentDate, 3), 'yyyy-MM-dd')
  
  // Initialize Supabase client
  const supabase = await createClient()
  
  // Fetch merchants data
  const { data: merchants, error } = await supabase
    .from('merchants')
    .select('*')
    .order('merchant_dba', { ascending: true })
  
  if (error) {
    console.error('Error fetching merchants:', error)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-semibold">Error loading merchants</h2>
          <p className="mt-2 text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  // Define types for our data structures
  interface MetricsData {
    month: string;
    total_volume: number;
    total_txns: number;
  }

  interface ResidualData {
    payout_month: string;
    total_profit: number;
  }
  
  // Perform raw SQL query for aggregated metrics
  const { data: metricsRaw } = await supabase
    .from('merchant_metrics')
    .select('month, volume, transaction_count')
    .gte('month', threeMonthsAgo)
    .order('month')
  
  // Fetch residual data for analytics
  const { data: residualsRaw } = await supabase
    .from('residual_payouts')
    .select('payout_month, net_profit')
    .gte('payout_month', threeMonthsAgo)
    .order('payout_month')
    
  // Aggregate the metrics data by month
  const metrics: MetricsData[] = [];
  if (metricsRaw?.length) {
    const metricsByMonth: Record<string, MetricsData> = {};
    
    metricsRaw.forEach(row => {
      const month = row.month;
      if (!metricsByMonth[month]) {
        metricsByMonth[month] = { month, total_volume: 0, total_txns: 0 };
      }
      
      metricsByMonth[month].total_volume += row.volume || 0;
      metricsByMonth[month].total_txns += row.transaction_count || 0;
    });
    
    // Convert to array and sort by month
    Object.values(metricsByMonth).forEach(monthData => {
      metrics.push(monthData);
    });
    metrics.sort((a, b) => a.month.localeCompare(b.month));
  }
  
  // Aggregate the residual data by month
  const residuals: ResidualData[] = [];
  if (residualsRaw?.length) {
    const residualsByMonth: Record<string, ResidualData> = {};
    
    residualsRaw.forEach(row => {
      const month = row.payout_month;
      if (!residualsByMonth[month]) {
        residualsByMonth[month] = { payout_month: month, total_profit: 0 };
      }
      
      residualsByMonth[month].total_profit += row.net_profit || 0;
    });
    
    // Convert to array and sort by month
    Object.values(residualsByMonth).forEach(monthData => {
      residuals.push(monthData);
    });
    residuals.sort((a, b) => a.payout_month.localeCompare(b.payout_month));
  }
  
  // Format data for charts
  const volumeData = metrics.map(item => ({
    time: item.month,
    value: item.total_volume
  })) || []
  
  const txnsData = metrics.map(item => ({
    time: item.month,
    value: item.total_txns
  })) || []
  
  const profitData = residuals.map(item => ({
    time: item.payout_month,
    value: item.total_profit
  })) || []

  // Calculate summary metrics
  const currentMonthVolume = metrics && metrics.length > 0 ? 
    metrics[metrics.length - 1].total_volume : 0
    
  const previousMonthVolume = metrics && metrics.length > 1 ? 
    metrics[metrics.length - 2].total_volume : 0
    
  const volumeChange = previousMonthVolume > 0 ? 
    ((currentMonthVolume - previousMonthVolume) / previousMonthVolume) * 100 : 0
    
  const currentMonthProfit = residuals && residuals.length > 0 ? 
    residuals[residuals.length - 1].total_profit : 0
    
  const previousMonthProfit = residuals && residuals.length > 1 ? 
    residuals[residuals.length - 2].total_profit : 0
    
  const profitChange = previousMonthProfit > 0 ? 
    ((currentMonthProfit - previousMonthProfit) / previousMonthProfit) * 100 : 0

  // Format numbers for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Merchants</h1>
          <p className="text-muted-foreground">
            View and manage your merchant portfolio and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePickerWithRange 
            className="w-auto" 
            placeholder="Filter by date range"
          />
          <Button variant="outline" size="icon">
            <FilterIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchants?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Volume
            </CardTitle>
            <div className={`flex items-center gap-1 text-xs ${volumeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {volumeChange >= 0 ? <TrendingUpIcon className="h-4 w-4" /> : <TrendingDownIcon className="h-4 w-4" />}
              <span>{formatPercentage(Math.abs(volumeChange))}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMonthVolume)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Profit
            </CardTitle>
            <div className={`flex items-center gap-1 text-xs ${profitChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {profitChange >= 0 ? <TrendingUpIcon className="h-4 w-4" /> : <TrendingDownIcon className="h-4 w-4" />}
              <span>{formatPercentage(Math.abs(profitChange))}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMonthProfit)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonthVolume > 0 ? 
                formatPercentage((currentMonthProfit / currentMonthVolume)) : 
                '0%'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Merchant Table</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="space-y-4">
          <MerchantTable merchants={merchants || []} />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume Trend</CardTitle>
                <CardDescription>Last 3 months of merchant transaction volume</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <TradingViewWidget 
                  data={volumeData} 
                  title="Transaction Volume"
                  type="area"
                  color="#2962FF"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Profit Trend</CardTitle>
                <CardDescription>Last 3 months of merchant profit</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <TradingViewWidget 
                  data={profitData} 
                  title="Net Profit"
                  type="line"
                  color="#00C853"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
