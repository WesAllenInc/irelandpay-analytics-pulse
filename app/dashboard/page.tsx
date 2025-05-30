import React from 'react';
import MetricsCards from '@/components/dashboard/metrics-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradingViewWidget from '@/components/charts/trading-view-widget';

// Sample data for the dashboard
const dashboardData = {
  totalTransactions: {
    value: '€24,589.82',
    change: 12.5
  },
  activeMerchants: {
    value: 128,
    change: 4.2
  },
  avgTransactionValue: {
    value: '€156.32',
    change: 2.3
  },
  conversionRate: {
    value: '68.7%',
    change: -1.2
  }
};

// Sample chart data
const transactionVolumeData = [
  { time: '2025-05-01', value: 12450 },
  { time: '2025-05-02', value: 14250 },
  { time: '2025-05-03', value: 13980 },
  { time: '2025-05-04', value: 15670 },
  { time: '2025-05-05', value: 16780 },
  { time: '2025-05-06', value: 18900 },
  { time: '2025-05-07', value: 17650 },
  { time: '2025-05-08', value: 19340 },
  { time: '2025-05-09', value: 20120 },
  { time: '2025-05-10', value: 21560 },
  { time: '2025-05-11', value: 22340 },
  { time: '2025-05-12', value: 23670 },
  { time: '2025-05-13', value: 24590 },
  { time: '2025-05-14', value: 23450 },
  { time: '2025-05-15', value: 24780 },
];

const revenueData = [
  { time: '2025-05-01', value: 3245 },
  { time: '2025-05-02', value: 3890 },
  { time: '2025-05-03', value: 3560 },
  { time: '2025-05-04', value: 4230 },
  { time: '2025-05-05', value: 4780 },
  { time: '2025-05-06', value: 5120 },
  { time: '2025-05-07', value: 4980 },
  { time: '2025-05-08', value: 5340 },
  { time: '2025-05-09', value: 5670 },
  { time: '2025-05-10', value: 6120 },
  { time: '2025-05-11', value: 6450 },
  { time: '2025-05-12', value: 6780 },
  { time: '2025-05-13', value: 7230 },
  { time: '2025-05-14', value: 6980 },
  { time: '2025-05-15', value: 7450 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Metrics Cards */}
      <MetricsCards data={dashboardData} />
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingViewWidget 
              data={transactionVolumeData} 
              colors={{
                lineColor: '#2563eb',
                areaTopColor: 'rgba(37, 99, 235, 0.2)',
                areaBottomColor: 'rgba(37, 99, 235, 0.0)'
              }}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingViewWidget 
              data={revenueData} 
              colors={{
                lineColor: '#16a34a',
                areaTopColor: 'rgba(22, 163, 74, 0.2)',
                areaBottomColor: 'rgba(22, 163, 74, 0.0)'
              }}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Merchant</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Sample data - will be replaced with real data */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Doyle-Gallagher Ltd</td>
                  <td className="px-6 py-4 whitespace-nowrap">May 30, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap">€245.80</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">O'Brien Pub</td>
                  <td className="px-6 py-4 whitespace-nowrap">May 30, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap">€124.50</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Murphy's Bakery</td>
                  <td className="px-6 py-4 whitespace-nowrap">May 29, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap">€87.35</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Dublin Tech Solutions</td>
                  <td className="px-6 py-4 whitespace-nowrap">May 29, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap">€1,250.00</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Galway Gifts</td>
                  <td className="px-6 py-4 whitespace-nowrap">May 28, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap">€65.20</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}