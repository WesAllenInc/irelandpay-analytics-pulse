'use client';

import React, { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowUpDown, Download, Search } from "lucide-react";

interface AgentPerformance {
  id: string;
  name: string;
  merchantCount: number;
  totalVolume: number;
  netResidual: number;
}

export default function LeaderboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [sortBy, setSortBy] = useState<'name' | 'merchantCount' | 'totalVolume' | 'netResidual'>('totalVolume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchLeaderboardData() {
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
        // Call RPC function to refresh views
        try {
          await supabase.rpc('refresh_performance_views');
          console.log('Materialized views refreshed');
        } catch (err: unknown) {
          console.error('Failed to refresh materialized views:', err instanceof Error ? err.message : String(err));
        }
      }
      
      // Map the data to our component's expected format
      const agentPerformanceList: AgentPerformance[] = performanceData?.map(agent => ({
        id: agent.id,
        name: agent.agent_name,
        merchantCount: agent.merchant_count || 0,
        totalVolume: agent.total_volume || 0,
        netResidual: agent.total_net_residual || 0
      })) || [];
      
      setAgents(agentPerformanceList);
      setIsLoading(false);
    }
    
    void fetchLeaderboardData();
  }, [selectedMonth, supabase]);

  // Filter agents based on search term
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort agents
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a[sortBy] > b[sortBy] ? 1 : -1;
    } else {
      return a[sortBy] < b[sortBy] ? 1 : -1;
    }
  });

  // Format for display
  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Handle sort change
  const handleSortChange = (column: 'name' | 'merchantCount' | 'totalVolume' | 'netResidual') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    // Headers for CSV
    const headers = [
      'Agent Name',
      'Merchant Count',
      'Total Volume',
      'Net Residual'
    ];
    
    // Format data rows
    const dataRows = sortedAgents.map(agent => [
      agent.name,
      agent.merchantCount.toString(),
      agent.totalVolume.toString(),
      agent.netResidual.toString()
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
    link.setAttribute('download', `agent-leaderboard-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading leaderboard data...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Agent Leaderboard</h1>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search agents..."
            className="pl-8 max-w-sm"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); }}
          />
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div>
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Month
            </label>
            <div className="flex items-center space-x-2">
              <select
                id="month-select"
                value={selectedMonth.split('-')[1] || ''}
                onChange={(e) => {
                  const year = selectedMonth.split('-')[0];
                  setSelectedMonth(`${year}-${e.target.value}`);
                }}
                className="border rounded p-2"
              >
                {[
                  { value: '01', label: 'January' },
                  { value: '02', label: 'February' },
                  { value: '03', label: 'March' },
                  { value: '04', label: 'April' },
                  { value: '05', label: 'May' },
                  { value: '06', label: 'June' },
                  { value: '07', label: 'July' },
                  { value: '08', label: 'August' },
                  { value: '09', label: 'September' },
                  { value: '10', label: 'October' },
                  { value: '11', label: 'November' },
                  { value: '12', label: 'December' }
                ].map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <select
                value={selectedMonth.split('-')[0] || ''}
                onChange={(e) => {
                  const month = selectedMonth.split('-')[1];
                  setSelectedMonth(`${e.target.value}-${month}`);
                }}
                className="border rounded p-2"
                aria-label="Select year"
              >
                {[
                  new Date().getFullYear(),
                  new Date().getFullYear() - 1,
                  new Date().getFullYear() - 2
                ].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance - {format(new Date(selectedMonth), 'MMMM yyyy')}</CardTitle>
          <CardDescription>
            Sortable performance metrics for all agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => { handleSortChange('name'); }}
                      className="flex items-center gap-1 font-medium"
                    >
                      Agent 
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => { handleSortChange('merchantCount'); }}
                      className="flex items-center gap-1 font-medium ml-auto"
                    >
                      Merchants 
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => { handleSortChange('totalVolume'); }}
                      className="flex items-center gap-1 font-medium ml-auto"
                    >
                      Total Volume 
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => { handleSortChange('netResidual'); }}
                      className="flex items-center gap-1 font-medium ml-auto"
                    >
                      Net Residual 
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAgents.length > 0 ? (
                  sortedAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-right">{agent.merchantCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(agent.totalVolume)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(agent.netResidual)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No agents found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
