import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

// Types
export interface AgentCommissionData {
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

interface UseAgentDashboardResult {
  isLoading: boolean;
  agentData: AgentCommissionData | null;
  error: Error | null;
}

/**
 * Custom hook to fetch and process agent dashboard data
 * @param selectedMonth The selected month in YYYY-MM format
 * @returns The loading state, agent data, and any error
 */
export function useAgentDashboard(selectedMonth: string): UseAgentDashboardResult {
  const [isLoading, setIsLoading] = useState(true);
  const [agentData, setAgentData] = useState<AgentCommissionData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchAgentData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get current user info
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Get agent details
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (agentError || !agentData) {
          throw new Error(agentError?.message || 'Agent data not found');
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
        
        if (merchantError) {
          console.error('Error fetching merchant data:', merchantError);
          throw new Error(merchantError.message || 'Failed to fetch merchant data');
        }

        if (!merchants) {
          throw new Error('No merchants found for this agent');
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
          // We'll continue even with volume trend errors
        }
        
        // Process data for display
        const currentMonthVolumes = merchants.flatMap(m => 
          m.merchant_processing_volumes
            ?.filter(v => v.processing_month?.startsWith(selectedMonth))
            .map(v => ({ merchantId: m.id, volume: v.gross_volume || 0 })) || []
        );
        
        const currentMonthResiduals = merchants.flatMap(m => 
          m.residuals
            ?.filter(r => r.processing_month?.startsWith(selectedMonth))
            .map(r => ({ 
              merchantId: m.id, 
              agentBps: r.agent_bps || 0,
              residual: r.final_residual || 0
            })) || []
        );

        // Calculate MTD metrics
        const mtdVolume = currentMonthVolumes.reduce((sum, item) => sum + item.volume, 0);
        const mtdResidual = currentMonthResiduals.reduce((sum, item) => sum + item.residual, 0);
        
        // Calculate forecasted values
        // Assuming we're forecasting based on the current day of month
        const currentDay = new Date().getDate();
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const monthProgress = currentDay / daysInMonth;
        const remainingDays = (1 - monthProgress);
        
        // Simple linear forecast
        const forecastMultiplier = monthProgress > 0 ? 1 / monthProgress : 1;
        const forecastedVolume = mtdVolume * forecastMultiplier;
        const forecastedResidual = mtdResidual * forecastMultiplier;
        
        // Format merchant data for table display
        const merchantTableData = merchants.map(merchant => {
          const volume = currentMonthVolumes
            .filter(v => v.merchantId === merchant.id)
            .reduce((sum, v) => sum + v.volume, 0);
          
          const residualData = currentMonthResiduals
            .filter(r => r.merchantId === merchant.id)
            .reduce(
              (acc, r) => ({ 
                agentBps: r.agentBps, 
                residual: acc.residual + r.residual 
              }), 
              { agentBps: 0, residual: 0 }
            );
          
          return {
            merchantName: merchant.dba_name,
            volume,
            agentBps: residualData.agentBps,
            residualEarned: residualData.residual,
            forecastedVolume: volume * forecastMultiplier,
            forecastedResidual: residualData.residual * forecastMultiplier
          };
        });
        
        // Format volume trend data for chart
        const volumeTrendData = volumeTrend 
          ? Array.from(
              new Set((volumeTrend as any[])?.map(v => v.processing_month.substring(0, 7)))
            ).map(month => {
              const monthVolumes = (volumeTrend as any[])
                ?.filter(v => v.processing_month.startsWith(month)) || [];
              
              const totalVolume = monthVolumes.reduce(
                (sum, v) => sum + (v.gross_volume || 0), 0
              );
              
              // Estimate residuals based on average BPS
              const avgBps = currentMonthResiduals.length > 0
                ? currentMonthResiduals.reduce((sum, r) => sum + r.agentBps, 0) / 
                  currentMonthResiduals.length
                : 0;
              
              const estimatedResidual = totalVolume * (avgBps / 100);
              
              return {
                month: month,
                volume: totalVolume,
                residual: estimatedResidual
              };
            })
          : [];
        
        // Set the processed data
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
      } catch (err: any) {
        console.error('Error in fetchAgentData:', err);
        setError(err instanceof Error ? err : new Error(err?.message || 'Unknown error'));
        setAgentData(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAgentData();
  }, [selectedMonth, supabase]);

  return { isLoading, agentData, error };
}
