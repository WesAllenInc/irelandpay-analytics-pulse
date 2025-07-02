'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";

interface MerchantData {
  merchantName: string;
  volume: number;
  agentBps: number;
  residualEarned: number;
  forecastedVolume: number;
  forecastedResidual: number;
}

interface AgentMerchantTableProps {
  merchants: MerchantData[];
}

const AgentMerchantTable: React.FC<AgentMerchantTableProps> = React.memo(({ merchants }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter merchants based on search term - memoized to prevent recalculation on every render
  const filteredMerchants = useMemo(() => {
    return merchants.filter(merchant => 
      merchant.merchantName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [merchants, searchTerm]);

  // Export to CSV - memoized callback to prevent recreation on every render
  const exportToCSV = useCallback(() => {
    // Headers for CSV
    const headers = [
      'Merchant Name',
      'Processing Volume',
      'Agent BPS', 
      'Residual Earned',
      'Forecasted Volume',
      'Forecasted Residual'
    ];
    
    // Format data rows
    const dataRows = filteredMerchants.map(merchant => [
      merchant.merchantName,
      merchant.volume.toString(),
      merchant.agentBps.toString(),
      merchant.residualEarned.toString(),
      merchant.forecastedVolume.toString(),
      merchant.forecastedResidual.toString()
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
    link.setAttribute('download', `merchant-report-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredMerchants]);

  // Format currency - memoized to prevent recreation on every render
  const formatCurrency = useCallback((value: number) => {
    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search merchants..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search merchants"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 w-full sm:w-auto"
          onClick={exportToCSV}
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Merchant</TableHead>
              <TableHead className="text-right min-w-[120px]">Processing Volume</TableHead>
              <TableHead className="text-right min-w-[100px]">Agent BPS</TableHead>
              <TableHead className="text-right min-w-[120px]">Residual Earned</TableHead>
              <TableHead className="text-right min-w-[120px]">Forecast Volume</TableHead>
              <TableHead className="text-right min-w-[120px]">Forecast Residual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMerchants.length > 0 ? (
              filteredMerchants.map((merchant, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium whitespace-nowrap">{merchant.merchantName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(merchant.volume)}</TableCell>
                  <TableCell className="text-right">{merchant.agentBps.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(merchant.residualEarned)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(merchant.forecastedVolume)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(merchant.forecastedResidual)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No merchants found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default AgentMerchantTable;
