
'use client';
import React, { useState } from 'react';
import { MerchantSelector } from '@/components/MerchantSelector';
import { VolumeChart } from '@/components/VolumeChart';
import { NetChart } from '@/components/NetChart';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Merchant {
  mid: string;
  merchant_dba: string;
}

const Index = () => {
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [dateRange, setDateRange] = useState({
    from: '2023-01-01',
    to: '2024-12-31'
  });

  const { volumeData, netData, loading, error } = useDashboardData(selectedMerchant, dateRange);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IrelandPay Dashboard</h1>
          <p className="text-gray-600">Merchant & Residual Analytics</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Label htmlFor="merchant-selector" className="block text-sm font-medium mb-2">
                Merchant
              </Label>
              <MerchantSelector
                selectedMerchant={selectedMerchant}
                onMerchantSelect={setSelectedMerchant}
              />
            </div>
            <div className="flex gap-4">
              <div>
                <Label htmlFor="from-date" className="block text-sm font-medium mb-2">
                  From
                </Label>
                <Input
                  id="from-date"
                  type="month"
                  value={dateRange.from.slice(0, 7)}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value + '-01' }))}
                  className="w-40"
                />
              </div>
              <div>
                <Label htmlFor="to-date" className="block text-sm font-medium mb-2">
                  To
                </Label>
                <Input
                  id="to-date"
                  type="month"
                  value={dateRange.to.slice(0, 7)}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value + '-31' }))}
                  className="w-40"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="text-red-600">Error: {error}</div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VolumeChart 
              data={volumeData} 
              title={selectedMerchant ? `Volume - ${selectedMerchant.merchant_dba}` : "Total Volume"}
            />
            <NetChart 
              data={netData} 
              title={selectedMerchant ? `Net Profit - ${selectedMerchant.merchant_dba}` : "Total Net Profit"}
            />
          </div>
        )}

        {/* Summary Stats */}
        {!loading && !error && (volumeData.length > 0 || netData.length > 0) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${volumeData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Volume</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${netData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Net Profit</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {volumeData.length}
                  </div>
                  <div className="text-sm text-gray-600">Months</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedMerchant ? '1' : 'All'}
                  </div>
                  <div className="text-sm text-gray-600">Merchants</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
