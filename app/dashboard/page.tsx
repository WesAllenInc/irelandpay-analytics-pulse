import { createSupabaseServerClient } from '@/lib/supabase'

// Import dynamic components from client component loader
import { TradingViewWidget, TotalSalesChart, EstimatedProfitChart } from '@/components/dashboard/dynamic-chart-loader'

import { MerchantAnalyticsCard } from '@/components/analytics/MerchantAnalyticsCard';
import { MerchantTable } from '@/components/analytics/MerchantTable';
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
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Import DashboardWrapper for animations
import { DashboardAnimationWrapper, DashboardHeader, DashboardSection } from '../../components/dashboard/dashboard-animation-wrapper'

// Tell Next.js to always fetch fresh data for this page
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  // Get current month range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  // Fetch all merchant data for the month
  const { data: merchantRows } = await supabase
    .from('merchant_data')
    .select('merchant_id, name, total_volume, net_profit, bps')
    .gte('month', monthStart)
    .lte('month', monthEnd);

  // Aggregate by merchant_id
  const merchantMap = new Map<string, { name: string; volume: number; profit: number; bpsSum: number; bpsCount: number }>();
  (merchantRows || []).forEach((row: any) => {
    if (!merchantMap.has(row.merchant_id)) {
      merchantMap.set(row.merchant_id, {
        name: row.name,
        volume: 0,
        profit: 0,
        bpsSum: 0,
        bpsCount: 0,
      });
    }
    const entry = merchantMap.get(row.merchant_id)!;
    entry.volume += Number(row.total_volume || 0);
    entry.profit += Number(row.net_profit || 0);
    if (row.bps !== undefined && row.bps !== null) {
      entry.bpsSum += Number(row.bps);
      entry.bpsCount += 1;
    }
  });
  const merchants = Array.from(merchantMap.entries()).map(([merchantId, entry]) => ({
    name: entry.name,
    volume: entry.volume,
    profit: entry.profit,
    bps: entry.bpsCount > 0 ? entry.bpsSum / entry.bpsCount : 0,
    merchantId,
  }));

  // Sort by volume descending
  merchants.sort((a, b) => b.volume - a.volume);

  // Calculate KPIs
  const totalVolume = merchants.reduce((sum, m) => sum + m.volume, 0);
  const totalProfit = merchants.reduce((sum, m) => sum + m.profit, 0);
  const avgBps = merchants.length > 0 ? merchants.reduce((sum, m) => sum + m.bps, 0) / merchants.length : 0;

  return (
    <DashboardAnimationWrapper>
      <DashboardHeader>
        <div className="flex items-center gap-2 group">  
          <h1 className="text-2xl font-medium tracking-tight text-foreground">Analytics Dashboard</h1>
          <span className="inline-flex transition-all duration-300 group-hover:rotate-12">
            <Sparkles className="h-5 w-5 text-accent-blue opacity-80 group-hover:opacity-100" />
          </span>
          <Badge variant="outline" className="ml-2 bg-card border-card-border text-foreground text-xs px-2.5 py-0.5">
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Badge>
        </div>
        <RealtimeIndicator />
      </DashboardHeader>

      <DashboardSection delay={0.3}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MerchantAnalyticsCard title="Total Volume (MTD)" value={totalVolume} change={0} unit="$" />
          <MerchantAnalyticsCard title="Total Profit (MTD)" value={totalProfit} change={0} unit="$" />
          <MerchantAnalyticsCard title="Avg BPS" value={avgBps} change={0} unit={''} />
        </div>
      </DashboardSection>

      <DashboardSection delay={0.4}>
        <MerchantTable merchants={merchants} />
      </DashboardSection>
    </DashboardAnimationWrapper>
  );
}