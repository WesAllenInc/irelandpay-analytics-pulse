'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentVolumeChart from '@/components/agent/AgentVolumeChart';
import AgentMerchantTable from '@/components/agent/AgentMerchantTable';
import { format } from 'date-fns';

interface AgentCommissionData {
  agentName: string;
  merchantCount: number;
  mtdVolume: number;
  mtdResidual: number;
  forecastedVolume: number;
  forecastedResidual: number;
  merchants: {
    merchantName: string;
    volume: number;
    agentBps: number;
    residualEarned: number;
    forecastedVolume: number;
    forecastedResidual: number;
  }[];
  volumeTrend: {
    month: string;
    volume: number;
    residual: number;
  }[];
}

export default function AgentDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState<AgentCommissionData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchAgentData() {
      setIsLoading(true);
      
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get agent details
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (agentError || !agentData) {
        console.error('Error fetching agent data:', agentError);
        setIsLoading(false);
        return;
      }

      const agentId = agentData.id;
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      
      // Get all merchants for this agent
      const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select(`
          id,
          merchant_id,
          dba_name,
          processor,
          merchant_processing_volumes(gross_volume, processing_month),
          residuals(net_residual, final_residual, agent_bps, processing_month)
        `)
        .eq('agent_id', agentId);
      
      if (merchantError || !merchants) {
        console.error('Error fetching merchant data:', merchantError);
        setIsLoading(false);
        return;
      }

      // Get volume trend for last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const { data: volumeTrend, error: volumeError } = await supabase
        .from('merchant_processing_volumes')
        .select(`
          processing_month,
          gross_volume,
          merchant:merchant_id(agent_id)
        `)
        .gte('processing_month', format(threeMonthsAgo, 'yyyy-MM-dd'))
        .eq('merchant.agent_id', agentId);
      
      if (volumeError) {
        console.error('Error fetching volume trend:', volumeError);
      }
      
      // Process data for display
      const currentMonthVolumes = merchants.flatMap(m => 
        m.merchant_processing_volumes
          .filter(v => v.processing_month.startsWith(selectedMonth))
          .map(v => ({ merchantId: m.id, volume: v.gross_volume || 0 }))
      );
      
      const currentMonthResiduals = merchants.flatMap(m => 
        m.residuals
          .filter(r => r.processing_month.startsWith(selectedMonth))
          .map(r => ({ 
            merchantId: m.id, 
            agentBps: r.agent_bps || 0,
            residual: r.final_residual || 0
          }))
      );

      // Calculate MTD metrics
      const mtdVolume = currentMonthVolumes.reduce((sum, item) => sum + item.volume, 0);
      const mtdResidual = currentMonthResiduals.reduce((sum, item) => sum + item.residual, 0);
      
      // Calculate forecasted values
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const dayOfMonth = Math.min(new Date().getDate(), daysInMonth);
      const forecastMultiplier = daysInMonth / dayOfMonth;
      const forecastedVolume = mtdVolume * forecastMultiplier;
      const forecastedResidual = mtdResidual * forecastMultiplier;
      
      // Format merchant table data
      const merchantTableData = merchants.map(merchant => {
        const volume = currentMonthVolumes.find(v => v.merchantId === merchant.id)?.volume || 0;
        const residualData = currentMonthResiduals.find(r => r.merchantId === merchant.id);
        const agentBps = residualData?.agentBps || 0;
        const residualEarned = (volume * agentBps) / 10000;
        const forecastedVolume = volume * forecastMultiplier;
        const forecastedResidual = residualEarned * forecastMultiplier;
        
        return {
          merchantName: merchant.dba_name,
          volume,
          agentBps,
          residualEarned,
          forecastedVolume,
          forecastedResidual
        };
      });
      
      // Format volume trend data
      const volumeTrendByMonth: Record<string, { volume: number, residual: number }> = {};
      
      if (volumeTrend) {
        volumeTrend.forEach(item => {
          const monthKey = item.processing_month.substring(0, 7);
          if (!volumeTrendByMonth[monthKey]) {
            volumeTrendByMonth[monthKey] = { volume: 0, residual: 0 };
          }
          volumeTrendByMonth[monthKey].volume += item.gross_volume || 0;
        });
      }
      
      const volumeTrendData = Object.entries(volumeTrendByMonth).map(([month, data]) => ({
        month,
        volume: data.volume,
        residual: data.residual
      })).sort((a, b) => a.month.localeCompare(b.month));

      setAgentData({
        agentName: agentData.agent_name,
        merchantCount: merchants.length,
        mtdVolume,
        mtdResidual,
        forecastedVolume,
        forecastedResidual,
        merchants: merchantTableData,
        volumeTrend: volumeTrendData
      });
      
      setIsLoading(false);
    }
    
    fetchAgentData();
  }, [selectedMonth, supabase]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading agent data...</div>;
  }
  
  if (!agentData) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">No Agent Data Found</h2>
        <p className="text-gray-500">Please contact an administrator for assistance.</p>
      </div>
    </div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agent Name</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentData.agentName}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentData.merchantCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MTD Processing Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${agentData.mtdVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: ${agentData.forecastedVolume.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MTD Residual Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${agentData.mtdResidual.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: ${agentData.forecastedResidual.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="merchants" className="mb-8">
        <TabsList>
          <TabsTrigger value="merchants">Merchant Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Volume Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="merchants" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Breakdown</CardTitle>
              <CardDescription>
                Performance details for all merchants in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentMerchantTable merchants={agentData.merchants} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Volume Trends</CardTitle>
              <CardDescription>
                Volume and residual trends over the last 3 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <AgentVolumeChart data={agentData.volumeTrend} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
