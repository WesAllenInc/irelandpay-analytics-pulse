import { MerchantTable } from '@/components/analytics/MerchantTable';
import { MerchantChart } from '@/components/analytics/MerchantChart';
import { DashboardKPI, type KPI } from '@/components/analytics/DashboardKPI';
import { DashboardContent } from '@/components/analytics/DashboardContent';
import { 
  getRawVolumeSum, 
  getDailyTotals, 
  getEstimatedVolume, 
  getEstimatedProfit, 
  getPortfolioBPSAvg, 
  getAgentPayoutAvg 
} from '@/lib/queries/dashboardMetrics';
import { getMerchantSummary } from '@/lib/queries/merchantData';

// Demo data for when Supabase is not available
const demoMerchantStats = [
  { merchant_id: 'demo-1', name: 'Demo Merchant 1', total_volume: 1250000, net_profit: 12500, bps: 100 },
  { merchant_id: 'demo-2', name: 'Demo Merchant 2', total_volume: 890000, net_profit: 8900, bps: 100 },
  { merchant_id: 'demo-3', name: 'Demo Merchant 3', total_volume: 2100000, net_profit: 21000, bps: 100 },
  { merchant_id: 'demo-4', name: 'Demo Merchant 4', total_volume: 750000, net_profit: 7500, bps: 100 },
  { merchant_id: 'demo-5', name: 'Demo Merchant 5', total_volume: 1800000, net_profit: 18000, bps: 100 },
];

// Demo chart data
const demoVolumeData = Array.from({ length: 30 }, (_, i) => ({
  x: i + 1,
  y: Math.random() * 2000000 + 1000000
}));

const demoProfitData = Array.from({ length: 30 }, (_, i) => ({
  x: i + 1,
  y: Math.random() * 20000 + 10000
}));

const demoDailyData = Array.from({ length: 30 }, (_, i) => ({
  x: i + 1,
  y: Math.random() * 100000 + 50000
}));

export default async function DashboardPage() {
  let merchantStats = demoMerchantStats;
  let estimatedVolume = 2500000;
  let estimatedProfit = 25000;
  let portfolioBPSAvg = 100;
  let agentPayoutAvg = 15;

  try {
    // Fetch initial data for monthly view
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const [
      volume,
      profit,
      bpsAvg,
      payoutAvg,
      merchantData
    ] = await Promise.all([
      getEstimatedVolume(daysInMonth),
      getEstimatedProfit(daysInMonth),
      getPortfolioBPSAvg(),
      getAgentPayoutAvg(),
      getMerchantSummary()
    ]);

    estimatedVolume = volume;
    estimatedProfit = profit;
    portfolioBPSAvg = bpsAvg;
    agentPayoutAvg = payoutAvg;
    merchantStats = merchantData;
  } catch (error) {
    console.log('Using demo data - Supabase not available');
  }

  // Prepare initial data for the dashboard
  const initialData = {
    kpis: [
      {
        label: 'Total Estimated Volume',
        value: estimatedVolume,
        unit: '$' as const,
        highlight: true
      },
      {
        label: 'Total Estimated Profit',
        value: estimatedProfit,
        unit: '$' as const,
        highlight: true
      },
      {
        label: 'Portfolio BPS Avg',
        value: portfolioBPSAvg,
        unit: '%' as const,
        highlight: false
      },
      {
        label: 'Agent Payout Average',
        value: agentPayoutAvg,
        unit: '%' as const,
        highlight: false
      }
    ],
    volumeData: demoVolumeData,
    profitData: demoProfitData,
    dailyData: demoDailyData,
    merchantStats
  };

  return <DashboardContent initialData={initialData} />;
}