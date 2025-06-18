'use client';

import React, { useState } from 'react';
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

const AgentMerchantTable: React.FC<AgentMerchantTableProps> = ({ merchants }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter merchants based on search term
  const filteredMerchants = merchants.filter(merchant => 
    merchant.merchantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export to CSV
  const exportToCSV = () => {
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
            placeholder="Search merchants..."
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
          <span>Export</span>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Merchant</TableHead>
              <TableHead className="text-right">Processing Volume</TableHead>
              <TableHead className="text-right">Agent BPS</TableHead>
              <TableHead className="text-right">Residual Earned</TableHead>
              <TableHead className="text-right">Forecast Volume</TableHead>
              <TableHead className="text-right">Forecast Residual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMerchants.length > 0 ? (
              filteredMerchants.map((merchant, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{merchant.merchantName}</TableCell>
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
};

export default AgentMerchantTable;
