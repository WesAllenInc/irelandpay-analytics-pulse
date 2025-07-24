import { NextResponse } from 'next/server';

// Simulated Iris CRM API data for one month
const generateDemoData = (year: number, month: number) => {
  const merchants = [
    { id: 'M001', name: 'Tech Solutions Inc', volume: 2500000, profit: 25000, bps: 100 },
    { id: 'M002', name: 'Retail Plus LLC', volume: 1800000, profit: 18000, bps: 100 },
    { id: 'M003', name: 'Digital Payments Co', volume: 3200000, profit: 32000, bps: 100 },
    { id: 'M004', name: 'E-Commerce Express', volume: 1500000, profit: 15000, bps: 100 },
    { id: 'M005', name: 'Mobile Solutions', volume: 2800000, profit: 28000, bps: 100 },
    { id: 'M006', name: 'Cloud Services Ltd', volume: 2100000, profit: 21000, bps: 100 },
    { id: 'M007', name: 'Payment Gateway Pro', volume: 1900000, profit: 19000, bps: 100 },
    { id: 'M008', name: 'FinTech Innovations', volume: 3500000, profit: 35000, bps: 100 },
    { id: 'M009', name: 'Secure Transactions', volume: 1200000, profit: 12000, bps: 100 },
    { id: 'M010', name: 'Digital Banking Solutions', volume: 4000000, profit: 40000, bps: 100 },
  ];

  // Generate daily transaction data for the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyData = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    merchants.forEach(merchant => {
      // Add some daily variation
      const dailyVolume = merchant.volume / daysInMonth * (0.8 + Math.random() * 0.4);
      const dailyProfit = dailyVolume * (merchant.bps / 10000);
      
      dailyData.push({
        date,
        merchant_id: merchant.id,
        merchant_name: merchant.name,
        volume: Math.round(dailyVolume),
        profit: Math.round(dailyProfit),
        bps: merchant.bps,
        transactions: Math.floor(Math.random() * 100) + 50
      });
    });
  }

  // Generate monthly summary
  const monthlySummary = merchants.map(merchant => {
    const merchantDailyData = dailyData.filter(d => d.merchant_id === merchant.id);
    const totalVolume = merchantDailyData.reduce((sum, d) => sum + d.volume, 0);
    const totalProfit = merchantDailyData.reduce((sum, d) => sum + d.profit, 0);
    const avgBps = merchant.bps;

    return {
      merchant_id: merchant.id,
      name: merchant.name,
      total_volume: totalVolume,
      net_profit: totalProfit,
      bps: avgBps,
      transaction_count: merchantDailyData.reduce((sum, d) => sum + d.transactions, 0)
    };
  });

  return {
    merchants: monthlySummary,
    daily_data: dailyData,
    summary: {
      total_merchants: merchants.length,
      total_volume: monthlySummary.reduce((sum, m) => sum + m.total_volume, 0),
      total_profit: monthlySummary.reduce((sum, m) => sum + m.net_profit, 0),
      avg_bps: monthlySummary.reduce((sum, m) => sum + m.bps, 0) / merchants.length,
      period: `${year}-${month.toString().padStart(2, '0')}`
    }
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || new Date().getMonth().toString());

  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const data = generateDemoData(year, month);

    return NextResponse.json({
      success: true,
      message: 'Iris CRM API test data generated successfully',
      data,
      metadata: {
        source: 'simulated_iris_crm_api',
        year,
        month,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to generate test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 