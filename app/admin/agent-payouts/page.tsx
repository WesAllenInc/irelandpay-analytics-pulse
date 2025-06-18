'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminAgentTable from '@/components/admin/AdminAgentTable';
import AgentDetailView from '@/components/admin/AgentDetailView';
import { format } from 'date-fns';

interface AgentSummary {
  id: string;
  name: string;
  merchantCount: number;
  totalVolume: number;
  totalResidual: number;
  forecastedVolume: number;
  forecastedResidual: number;
}

export default function AdminAgentPayoutsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchAgentData() {
      setIsLoading(true);
      
      // Get all agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*');
      
      if (agentsError || !agentsData) {
        console.error('Error fetching agents data:', agentsError);
        setIsLoading(false);
        return;
      }

      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      
      // Transform agents with additional data
      const agentSummaries: AgentSummary[] = [];
      
      for (const agent of agentsData) {
        // Get merchant count for this agent
        const { count: merchantCount, error: countError } = await supabase
          .from('merchants')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id);
        
        if (countError) {
          console.error(`Error fetching merchant count for agent ${agent.id}:`, countError);
          continue;
        }
        
        // Get volume data for merchants belonging to this agent
        const { data: volumeData, error: volumeError } = await supabase
          .from('merchant_processing_volumes')
          .select(`
            gross_volume,
            processing_month,
            merchant:merchant_id(agent_id)
          `)
          .eq('merchant.agent_id', agent.id)
          .like('processing_month', `${selectedMonth}%`);
        
        if (volumeError) {
          console.error(`Error fetching volume data for agent ${agent.id}:`, volumeError);
          continue;
        }
        
        // Get residual data for merchants belonging to this agent
        const { data: residualData, error: residualError } = await supabase
          .from('residuals')
          .select(`
            final_residual,
            processing_month,
            merchant:merchant_id(agent_id)
          `)
          .eq('merchant.agent_id', agent.id)
          .like('processing_month', `${selectedMonth}%`);
          
        if (residualError) {
          console.error(`Error fetching residual data for agent ${agent.id}:`, residualError);
          continue;
        }
        
        // Calculate metrics
        const totalVolume = volumeData?.reduce((sum, item) => sum + (item.gross_volume || 0), 0) || 0;
        const totalResidual = residualData?.reduce((sum, item) => sum + (item.final_residual || 0), 0) || 0;
        
        // Calculate forecasted values
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const dayOfMonth = Math.min(new Date().getDate(), daysInMonth);
        const forecastMultiplier = daysInMonth / dayOfMonth;
        const forecastedVolume = totalVolume * forecastMultiplier;
        const forecastedResidual = totalResidual * forecastMultiplier;
        
        agentSummaries.push({
          id: agent.id,
          name: agent.agent_name,
          merchantCount: merchantCount || 0,
          totalVolume,
          totalResidual,
          forecastedVolume,
          forecastedResidual
        });
      }
      
      setAgents(agentSummaries);
      setIsLoading(false);
    }
    
    fetchAgentData();
  }, [selectedMonth, supabase]);
  
  // Calculate totals
  const totalMerchants = agents.reduce((sum, agent) => sum + agent.merchantCount, 0);
  const totalVolume = agents.reduce((sum, agent) => sum + agent.totalVolume, 0);
  const totalResidual = agents.reduce((sum, agent) => sum + agent.totalResidual, 0);
  const totalForecastVolume = agents.reduce((sum, agent) => sum + agent.forecastedVolume, 0);
  const totalForecastResidual = agents.reduce((sum, agent) => sum + agent.forecastedResidual, 0);
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading agent data...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Agent Commission & Payouts</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Merchants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMerchants}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MTD Processing Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: ${totalForecastVolume.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MTD Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalResidual.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Forecast: ${totalForecastResidual.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Month</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Agent Tables and Detail Views */}
      {selectedAgent ? (
        <div className="mb-4">
          <button
            onClick={() => setSelectedAgent(null)}
            className="mb-4 text-blue-600 hover:underline flex items-center"
          >
            ← Back to All Agents
          </button>
          <AgentDetailView 
            agentId={selectedAgent} 
            month={selectedMonth} 
          />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Agent Commission Summary</CardTitle>
            <CardDescription>
              Overview of all agents and their commission metrics for {format(new Date(selectedMonth), 'MMMM yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminAgentTable 
              agents={agents} 
              onViewDetails={(agentId) => setSelectedAgent(agentId)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
