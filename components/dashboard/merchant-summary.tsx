'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function MerchantSummary() {
  const [loading, setLoading] = useState(true);
  const [merchantData, setMerchantData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMerchantData() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Query the master_data_mv materialized view
        const { data, error } = await supabase
          .from('master_data_mv')
          .select('*')
          .limit(10);
        
        if (error) {
          throw error;
        }
        
        setMerchantData(data || []);
      } catch (err: any) {
        console.error('Error fetching merchant data:', err);
        setError(err.message || 'Failed to fetch merchant data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchMerchantData();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Merchant Summary</CardTitle>
        <CardDescription>
          Overview of merchant performance data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading merchant data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : merchantData.length === 0 ? (
          <div className="text-center py-4">
            <p>No merchant data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {merchantData.map((merchant) => (
                  <tr key={merchant.mid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{merchant.merchant_dba}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{merchant.datasource}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${merchant.merchant_volume.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{merchant.total_txns}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {merchant.net_profit ? `$${merchant.net_profit.toFixed(2)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {!loading && !error && `Showing ${merchantData.length} merchants`}
        </div>
      </CardFooter>
    </Card>
  );
}
