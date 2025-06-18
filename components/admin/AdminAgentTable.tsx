'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, Eye } from "lucide-react";

interface AgentSummary {
  id: string;
  name: string;
  merchantCount: number;
  totalVolume: number;
  totalResidual: number;
  forecastedVolume: number;
  forecastedResidual: number;
}

interface AdminAgentTableProps {
  agents: AgentSummary[];
  onViewDetails: (agentId: string) => void;
}

const AdminAgentTable: React.FC<AdminAgentTableProps> = ({ agents, onViewDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter agents based on search term
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export to CSV
  const exportToCSV = () => {
    // Headers for CSV
    const headers = [
      'Agent Name',
      'Merchant Count',
      'Processing Volume',
      'Total Residual', 
      'Forecasted Volume',
      'Forecasted Residual'
    ];
    
    // Format data rows
    const dataRows = filteredAgents.map(agent => [
      agent.name,
      agent.merchantCount.toString(),
      agent.totalVolume.toString(),
      agent.totalResidual.toString(),
      agent.forecastedVolume.toString(),
      agent.forecastedResidual.toString()
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
    link.setAttribute('download', `agent-payouts-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search agents..."
            className="pl-8 max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto flex items-center gap-1"
          onClick={exportToCSV}
        >
          <Download className="h-4 w-4" />
          <span>Export Payout Summary</span>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Agent</TableHead>
              <TableHead className="text-right">Merchant Count</TableHead>
              <TableHead className="text-right">Processing Volume</TableHead>
              <TableHead className="text-right">Residual Payout</TableHead>
              <TableHead className="text-right">Forecast Volume</TableHead>
              <TableHead className="text-right">Forecast Payout</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell className="text-right">{agent.merchantCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(agent.totalVolume)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(agent.totalResidual)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(agent.forecastedVolume)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(agent.forecastedResidual)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => onViewDetails(agent.id)}
                    >
                      <Eye className="h-4 w-4" />
                      <span>Details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No agents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminAgentTable;
