'use client';

import React, { useState } from 'react';
import { createSupabaseBrowserClient } from '@lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from 'date-fns';

interface BulkPayoutExportProps {
  month: string;
  agents: Array<{
    id: string;
    name: string;
    totalResidual: number;
    forecastedResidual: number;
    merchantCount: number;
  }>;
}

const BulkPayoutExport: React.FC<BulkPayoutExportProps> = ({ month, agents }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailedExport, setIsDetailedExport] = useState(false);
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  
  // Format date for display
  const formattedMonth = format(new Date(`${month}-01`), 'MMMM yyyy');
  
  // Export summary to CSV
  const exportSummaryToCSV = async () => {
    setIsLoading(true);
    
    try {
      // Headers for CSV
      const headers = [
        'Agent Name',
        'Merchant Count',
        'Total Residual',
        'Forecasted Residual',
        'Status',
        'Approved Date',
        'Paid Date'
      ];
      
      // Get payout statuses
      const payoutMonth = `${month}-01`;
      const { data: payoutData, error: payoutError } = await supabase
        .from('agent_payout_history')
        .select('*')
        .eq('payout_month', payoutMonth);
      
      if (payoutError) {
        throw new Error(`Failed to fetch payout data: ${payoutError.message}`);
      }
      
      // Format data rows
      const dataRows = agents.map(agent => {
        const payout = payoutData?.find(p => p.agent_id === agent.id);
        
        return [
          agent.name,
          agent.merchantCount.toString(),
          agent.totalResidual.toFixed(2),
          agent.forecastedResidual.toFixed(2),
          payout?.status || 'pending',
          payout?.approved_at ? format(new Date(payout.approved_at), 'yyyy-MM-dd') : '',
          payout?.paid_at ? format(new Date(payout.paid_at), 'yyyy-MM-dd') : ''
        ];
      });
      
      // Add total row
      const totalResidual = agents.reduce((sum, agent) => sum + agent.totalResidual, 0);
      const totalForecast = agents.reduce((sum, agent) => sum + agent.forecastedResidual, 0);
      const totalMerchants = agents.reduce((sum, agent) => sum + agent.merchantCount, 0);
      
      dataRows.push([
        'TOTAL',
        totalMerchants.toString(),
        totalResidual.toFixed(2),
        totalForecast.toFixed(2),
        '',
        '',
        ''
      ]);
      
      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.join(','))
      ].join('\n');
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `agent-payouts-summary-${month}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Successfully exported ${agents.length} agent payout summaries`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export payout data",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };
  
  // Export detailed data to CSV
  const exportDetailedToCSV = async () => {
    setIsLoading(true);
    
    try {
      // Get all merchant data for these agents
      const agentIds = agents.map(a => a.id);
      
      // Get merchants for all agents
      const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select('id, merchant_id, dba_name, processor, agent_id')
        .in('agent_id', agentIds);
      
      if (merchantError) {
        throw new Error(`Failed to fetch merchant data: ${merchantError.message}`);
      }
      
      // Get volume data for the selected month
      const merchantIds = merchants.map(m => m.id);
      const { data: volumeData, error: volumeError } = await supabase
        .from('merchant_processing_volumes')
        .select('merchant_id, gross_volume, processing_month')
        .in('merchant_id', merchantIds)
        .like('processing_month', `${month}%`);
      
      if (volumeError) {
        throw new Error(`Failed to fetch volume data: ${volumeError.message}`);
      }
      
      // Get residual data for the selected month
      const { data: residualData, error: residualError } = await supabase
        .from('residuals')
        .select('merchant_id, final_residual, agent_bps, processing_month')
        .in('merchant_id', merchantIds)
        .like('processing_month', `${month}%`);
      
      if (residualError) {
        throw new Error(`Failed to fetch residual data: ${residualError.message}`);
      }
      
      // Headers for CSV
      const headers = [
        'Agent Name',
        'Merchant Name',
        'Merchant ID',
        'Processor',
        'Processing Volume',
        'Agent BPS',
        'Residual Amount'
      ];
      
      // Format data rows
      const dataRows: string[][] = [];
      
      agents.forEach(agent => {
        const agentMerchants = merchants.filter(m => m.agent_id === agent.id);
        
        agentMerchants.forEach(merchant => {
          const volume = volumeData?.find(v => v.merchant_id === merchant.id)?.gross_volume || 0;
          const residual = residualData?.find(r => r.merchant_id === merchant.id);
          
          dataRows.push([
            agent.name,
            merchant.dba_name,
            merchant.merchant_id,
            merchant.processor || '',
            volume.toFixed(2),
            (residual?.agent_bps || 0).toFixed(2),
            (residual?.final_residual || 0).toFixed(2)
          ]);
        });
        
        // Add agent subtotal
        const agentVolume = agentMerchants.reduce((sum, merchant) => {
          const volume = volumeData?.find(v => v.merchant_id === merchant.id)?.gross_volume || 0;
          return sum + volume;
        }, 0);
        
        const agentResidual = agentMerchants.reduce((sum, merchant) => {
          const residual = residualData?.find(r => r.merchant_id === merchant.id)?.final_residual || 0;
          return sum + residual;
        }, 0);
        
        dataRows.push([
          `${agent.name} SUBTOTAL`,
          '',
          '',
          '',
          agentVolume.toFixed(2),
          '',
          agentResidual.toFixed(2)
        ]);
        
        // Add a blank row between agents
        dataRows.push(['', '', '', '', '', '', '']);
      });
      
      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.join(','))
      ].join('\n');
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `agent-payouts-detailed-${month}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Detailed Export Successful",
        description: `Successfully exported detailed payout data for ${agents.length} agents`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export detailed payout data",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Commission Data</CardTitle>
        <CardDescription>
          Export agent commission data for {formattedMonth}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            onClick={exportSummaryToCSV}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Summary
          </Button>
          
          <Button
            variant="outline"
            onClick={exportDetailedToCSV}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Export Detailed Report
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          The summary export includes agent totals and payout status. The detailed report includes merchant-level data.
        </p>
      </CardContent>
    </Card>
  );
};

export default BulkPayoutExport;
