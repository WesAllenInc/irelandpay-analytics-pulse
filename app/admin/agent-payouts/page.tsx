'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminAgentTable from '@/components/admin/AdminAgentTable';
import AgentDetailView from '@/components/admin/AgentDetailView';
import BulkPayoutExport from '@/components/admin/BulkPayoutExport';
import BatchPayoutApproval from '@/components/admin/BatchPayoutApproval';
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

  // Define fetchAgentData outside useEffect to make it accessible throughout the component
  const fetchAgentData = async () => {
      setIsLoading(true);
      
      // Use the materialized view to get all agent performance metrics in a single query
      const { data: performanceData, error: performanceError } = await supabase
        .from('agent_performance_metrics')
        .select('*')
        .like('processing_month', `${selectedMonth}%`);
      
      if (performanceError) {
        console.error('Error fetching agent performance data:', performanceError);
        setIsLoading(false);
        return;
      }
      
      // Check when the materialized view was last refreshed
      const { data: refreshData } = await supabase
        .from('materialized_view_refreshes')
        .select('last_refreshed')
        .eq('view_name', 'agent_performance_metrics')
        .single();
      
      const lastRefreshed = refreshData?.last_refreshed || null;
      const refreshThreshold = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      // If data is stale, trigger a refresh
      if (!lastRefreshed || (new Date().getTime() - new Date(lastRefreshed).getTime() > refreshThreshold)) {
        try {
          // Call RPC function to refresh views
          await supabase.rpc('refresh_performance_views');
          console.log('Materialized views refreshed');
        } catch (err: unknown) {
          console.error('Failed to refresh materialized views:', err);
        }
      }
      
      const [year, month] = selectedMonth.split('-');
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const dayOfMonth = Math.min(new Date().getDate(), daysInMonth);
      const forecastMultiplier = daysInMonth / dayOfMonth;
      
      // Map the data to our component's expected format
      const agentSummaries: AgentSummary[] = performanceData?.map(agent => {
        const totalVolume = agent.total_volume || 0;
        const totalResidual = agent.total_final_residual || 0;
        
        return {
          id: agent.id,
          name: agent.agent_name,
          merchantCount: agent.merchant_count || 0,
          totalVolume,
          totalResidual,
          forecastedVolume: totalVolume * forecastMultiplier,
          forecastedResidual: totalResidual * forecastMultiplier
        };
      }) || [];
      
      setAgents(agentSummaries);
      setIsLoading(false);
  };
  
  useEffect(() => {
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
            <div className="flex items-center">
              <label htmlFor="month" className="mr-2 text-sm font-medium">Month:</label>
              <select 
                id="month-select"
                className="px-2 py-1 border rounded mr-2"
                value={selectedMonth.split('-')[1]}
                onChange={(e) => {
                  const year = selectedMonth.split('-')[0];
                  setSelectedMonth(`${year}-${e.target.value}`);
                }}
                aria-label="Select month"
                title="Select month"
              >
                {Array.from({length: 12}, (_, i) => {
                  const month = (i + 1).toString().padStart(2, '0');
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return (
                    <option key={month} value={month}>{monthNames[i]}</option>
                  );
                })}
              </select>
              <select
                id="year-select"
                className="px-2 py-1 border rounded"
                value={selectedMonth.split('-')[0]}
                onChange={(e) => {
                  const month = selectedMonth.split('-')[1];
                  setSelectedMonth(`${e.target.value}-${month}`);
                }}
                aria-label="Select year"
                title="Select year"
              >
                {Array.from({length: 5}, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
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
        <>
          {/* Bulk Export Component */}
          <div className="mb-8">
            <BulkPayoutExport 
              month={selectedMonth}
              agents={agents}
            />
          </div>
          
          {/* Batch Approval Component */}
          <div className="mb-8">
            <BatchPayoutApproval
              month={selectedMonth}
              agents={agents}
              onPayoutsApproved={() => fetchAgentData()}
            />
          </div>
          
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
        </>
      )}
    </div>
  );
}
