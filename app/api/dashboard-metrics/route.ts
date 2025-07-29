import { NextRequest, NextResponse } from 'next/server';
import { 
  getRawVolumeSum, 
  getDailyTotals, 
  getEstimatedVolume, 
  getEstimatedProfit, 
  getPortfolioBPSAvg, 
  getAgentPayoutAvg 
} from '@/lib/queries/dashboardMetrics';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getMerchantSummary } from '@/lib/queries/merchantData';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'Monthly';

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let daysInPeriod: number;

    // Calculate date range based on timeframe
    switch (timeframe) {
      case 'Monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        daysInPeriod = endDate.getDate();
        break;
      case 'Quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        break;
      case 'Yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        daysInPeriod = 365;
        break;
      case 'Lifetime':
        startDate = new Date(2020, 0, 1); // Assuming data starts from 2020
        endDate = now;
        daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        daysInPeriod = endDate.getDate();
    }

    // Fetch all metrics
    const [
      rawVolumeSum,
      dailyTotals,
      estimatedVolume,
      estimatedProfit,
      portfolioBPSAvg,
      agentPayoutAvg,
      merchantStats
    ] = await Promise.all([
      getRawVolumeSum(startDate, endDate),
      getDailyTotals(daysInPeriod),
      getEstimatedVolume(daysInPeriod),
      getEstimatedProfit(daysInPeriod),
      getPortfolioBPSAvg(),
      getAgentPayoutAvg(),
      getMerchantSummary()
    ]);

    // Prepare KPI data
    const kpis = [
      {
        label: 'Total Estimated Volume',
        value: estimatedVolume,
        unit: '$' as const,
        highlight: timeframe === 'Monthly'
      },
      {
        label: 'Total Estimated Profit',
        value: estimatedProfit,
        unit: '$' as const,
        highlight: timeframe === 'Monthly'
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
    ];

    // Prepare chart data
    const volumeData = dailyTotals.map(item => ({
      x: item.day,
      y: item.totalVolume
    }));

    const profitData = dailyTotals.map(item => ({
      x: item.day,
      y: (item.totalVolume * (portfolioBPSAvg / 10000)) // Estimate profit based on BPS
    }));

    // For different timeframes, create appropriate data
    let monthlyVolumeData = [];
    let monthlyProfitData = [];

    if (timeframe === 'Monthly') {
      // Use daily data for monthly view
      monthlyVolumeData = volumeData;
      monthlyProfitData = profitData;
    } else {
      // For other timeframes, create monthly aggregated data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyVolumeData = months.map((month, index) => ({
        x: month,
        y: Math.random() * 2000000 + 1000000 // Demo data for now
      }));
      monthlyProfitData = months.map((month, index) => ({
        x: month,
        y: Math.random() * 20000 + 10000 // Demo data for now
      }));
    }

    return NextResponse.json({
      kpis,
      volumeData: monthlyVolumeData,
      profitData: monthlyProfitData,
      dailyData: volumeData,
      merchantStats
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
} 