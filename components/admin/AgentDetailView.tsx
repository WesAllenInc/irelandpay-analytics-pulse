'use client';

import React, { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import AgentVolumeChart from '@/components/agent/AgentVolumeChart';
import AgentPayoutApproval from './AgentPayoutApproval';

interface AgentDetailViewProps {
  agentId: string;
  month: string;
}

interface MerchantDetail {
  id: string;
  name: string;
  merchantId: string;
  processor: string;
  volume: number;
  agentBps: number;
  residual: number;
}

interface AgentDetail {
  id: string;
  name: string;
  email: string;
  merchants: MerchantDetail[];
  mtdVolume: number;
  mtdResidual: number;
  forecastVolume: number;
  forecastResidual: number;
  volumeTrend: {
    month: string;
    volume: number;
    residual: number;
  }[];
}

const AgentDetailView: React.FC<AgentDetailViewProps> = ({ agentId, month }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [agentDetails, setAgentDetails] = useState<AgentDetail | null>(null);
  const supabase = createSupabaseBrowserClient();

  // Define fetchAgentDetails outside useEffect to make it accessible throughout the component
  const fetchAgentDetails = async () => {
      setIsLoading(true);

      // Get agent information
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agentData) {
        console.error('Error fetching agent details:', agentError);
        setIsLoading(false);
        return;
      }

      // Get all merchants for this agent with processing volumes and residuals
      const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select(`
          id,
          merchant_id,
          dba_name,
          processor
        `)
        .eq('agent_id', agentId);
      
      if (merchantError || !merchants) {
        console.error('Error fetching merchant details:', merchantError);
        setIsLoading(false);
        return;
      }

      // Get volume data for all merchants of this agent for the selected month
      const merchantIds = merchants.map(m => m.id);
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;

      const { data: volumeData, error: volumeError } = await supabase
        .from('merchant_processing_volumes')
        .select('merchant_id, gross_volume, processing_month')
        .in('merchant_id', merchantIds)
        .like('processing_month', `${month}%`);
      
      if (volumeError) {
        console.error('Error fetching volume data:', volumeError);
      }

      // Get residual data for all merchants of this agent for the selected month
      const { data: residualData, error: residualError } = await supabase
        .from('residuals')
        .select('merchant_id, final_residual, agent_bps, processing_month')
        .in('merchant_id', merchantIds)
        .like('processing_month', `${month}%`);
      
      if (residualError) {
        console.error('Error fetching residual data:', residualError);
      }

      // Get trend data for the last 4 months
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
      const fourMonthsAgoStr = fourMonthsAgo.toISOString().substring(0, 7);
      
      const { data: trendData, error: trendError } = await supabase
        .from('merchant_processing_volumes')
        .select(`
          processing_month,
          gross_volume,
          merchant_id
        `)
        .in('merchant_id', merchantIds)
        .gte('processing_month', fourMonthsAgoStr);
      
      if (trendError) {
        console.error('Error fetching trend data:', trendError);
      }

      const { data: trendResidualData, error: trendResidualError } = await supabase
        .from('residuals')
        .select(`
          processing_month,
          final_residual,
          merchant_id
        `)
        .in('merchant_id', merchantIds)
        .gte('processing_month', fourMonthsAgoStr);

      if (trendResidualError) {
        console.error('Error fetching residual trend data:', trendResidualError);
      }

      // Process merchant details with volume and residual data
      const merchantDetails: MerchantDetail[] = merchants.map(merchant => {
        const volume = volumeData?.find(v => v.merchant_id === merchant.id)?.gross_volume || 0;
        const residualInfo = residualData?.find(r => r.merchant_id === merchant.id);
        
        return {
          id: merchant.id,
          name: merchant.dba_name,
          merchantId: merchant.merchant_id,
          processor: merchant.processor || 'Unknown',
          volume,
          agentBps: residualInfo?.agent_bps || 0,
          residual: residualInfo?.final_residual || 0
        };
      });

      // Calculate MTD metrics
      const mtdVolume = merchantDetails.reduce((sum, item) => sum + item.volume, 0);
      const mtdResidual = merchantDetails.reduce((sum, item) => sum + item.residual, 0);
      
      // Calculate forecasted values
      const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const dayOfMonth = Math.min(new Date().getDate(), daysInMonth);
      const forecastMultiplier = daysInMonth / dayOfMonth;
      const forecastVolume = mtdVolume * forecastMultiplier;
      const forecastResidual = mtdResidual * forecastMultiplier;

      // Process trend data by month
      const volumeTrendByMonth: Record<string, { volume: number, residual: number }> = {};
      
      if (trendData) {
        trendData.forEach(item => {
          const monthKey = item.processing_month.substring(0, 7);
          if (!volumeTrendByMonth[monthKey]) {
            volumeTrendByMonth[monthKey] = { volume: 0, residual: 0 };
          }
          volumeTrendByMonth[monthKey].volume += item.gross_volume || 0;
        });
      }
      
      if (trendResidualData) {
        trendResidualData.forEach(item => {
          const monthKey = item.processing_month.substring(0, 7);
          if (!volumeTrendByMonth[monthKey]) {
            volumeTrendByMonth[monthKey] = { volume: 0, residual: 0 };
          }
          volumeTrendByMonth[monthKey].residual += item.final_residual || 0;
        });
      }
      
      const volumeTrend = Object.entries(volumeTrendByMonth).map(([month, data]) => ({
        month,
        volume: data.volume,
        residual: data.residual
      })).sort((a, b) => a.month.localeCompare(b.month));

      setAgentDetails({
        id: agentId,
        name: agentData.agent_name,
        email: agentData.email || 'No email',
        merchants: merchantDetails,
        mtdVolume,
        mtdResidual,
        forecastVolume,
        forecastResidual,
        volumeTrend
      });
      
      setIsLoading(false);
    };
  
  useEffect(() => {
    fetchAgentDetails();
  }, [month, supabase, agentId, fetchAgentDetails]);

  const exportToCSV = () => {
    if (!agentDetails) return;
    
    // Headers
    const headers = [
      'Merchant Name',
      'Merchant ID',
      'Processor',
      'Volume',
      'Agent BPS',
      'Residual',
    ];
    
    // Data
    const dataRows = agentDetails.merchants.map(merchant => [
      merchant.name,
      merchant.merchantId,
      merchant.processor,
      merchant.volume.toString(),
      merchant.agentBps.toString(),
      merchant.residual.toString()
    ]);
    
    // Add a summary row
    dataRows.push([
      'TOTAL',
      '',
      '',
      agentDetails.mtdVolume.toString(),
      '',
      agentDetails.mtdResidual.toString()
    ]);
    
    // Combine and download
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${agentDetails.name.replace(/\s+/g, '-')}-merchants-${month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format currency values
  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-64">Loading agent details...</div>;
  }
  
  if (!agentDetails) {
    return <div className="p-4 border rounded bg-red-50 text-red-800">
      Failed to load agent details
    </div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{agentDetails.name}</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Merchant Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentDetails.merchants.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MTD Processing Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(agentDetails.mtdVolume)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: {formatCurrency(agentDetails.forecastVolume)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MTD Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(agentDetails.mtdResidual)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: {formatCurrency(agentDetails.forecastResidual)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={exportToCSV}
            >
              <Download className="h-4 w-4" />
              <span>Export Merchant Details</span>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Payout Approval Section */}
      <div className="mb-8">
        <AgentPayoutApproval
          agentId={agentDetails.id}
          agentName={agentDetails.name}
          month={month}
          totalResidual={agentDetails.mtdResidual}
          onPayoutApproved={() => {
            // Refresh agent data when payout is approved
            setIsLoading(true);
            fetchAgentDetails();
          }}
        />
      </div>
      
      <Tabs defaultValue="merchants" className="mb-8">
        <TabsList>
          <TabsTrigger value="merchants">Merchant Details</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="merchants" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Portfolio</CardTitle>
              <CardDescription>
                All merchants assigned to {agentDetails.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Merchant</TableHead>
                    <TableHead>Merchant ID</TableHead>
                    <TableHead>Processor</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Agent BPS</TableHead>
                    <TableHead className="text-right">Residual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentDetails.merchants.map((merchant) => (
                    <TableRow key={merchant.id}>
                      <TableCell className="font-medium">{merchant.name}</TableCell>
                      <TableCell>{merchant.merchantId}</TableCell>
                      <TableCell>{merchant.processor}</TableCell>
                      <TableCell className="text-right">{formatCurrency(merchant.volume)}</TableCell>
                      <TableCell className="text-right">{merchant.agentBps.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(merchant.residual)}</TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Summary row */}
                  <TableRow className="font-bold bg-gray-50">
                    <TableCell colSpan={3}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(agentDetails.mtdVolume)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">{formatCurrency(agentDetails.mtdResidual)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Volume and residual trends over the last 4 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {agentDetails.volumeTrend.length > 0 ? (
                  <AgentVolumeChart data={agentDetails.volumeTrend} />
                ) : (
                  <div className="flex items-center justify-center h-full border rounded p-8">
                    <p className="text-gray-500">No trend data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentDetailView;
