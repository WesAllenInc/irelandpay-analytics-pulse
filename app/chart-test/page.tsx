'use client';

import { MerchantChart } from '@/components/analytics/MerchantChart';

const testData = [
  { x: 'Jan', y: 100 },
  { x: 'Feb', y: 200 },
  { x: 'Mar', y: 150 },
  { x: 'Apr', y: 300 },
  { x: 'May', y: 250 },
];

export default function ChartTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Chart Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MerchantChart
          title="Test Line Chart"
          data={testData}
          type="line"
        />
        
        <MerchantChart
          title="Test Bar Chart"
          data={testData}
          type="bar"
        />
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
        <p>If you can see this text but no charts, there might be a Recharts issue.</p>
        <p>Data being passed: {JSON.stringify(testData)}</p>
      </div>
    </div>
  );
}
