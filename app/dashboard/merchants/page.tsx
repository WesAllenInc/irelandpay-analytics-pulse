'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FeyTable, Column } from '@/components/ui/FeyTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface Merchant {
  mid: string;
  name: string;
  status: string;
  volume: string;
  residual: string;
}

const MerchantSummaryPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');

  const merchants: Merchant[] = [
    { mid: '123456', name: 'Merchant A', status: 'Active', volume: '$25,000', residual: '$500' },
    { mid: '789012', name: 'Merchant B', status: 'Inactive', volume: '$30,000', residual: '$600' },
  ];

  const columns: Column<Merchant>[] = [
    {
      key: 'mid',
      label: 'MID',
      render: (row) => (
        <span className="font-mono text-xs text-foreground-subtle">{row.mid}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <Link
          href={`/dashboard/merchants/${row.mid}`}
          className="hover:underline hover:text-gruvbox-yellow"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'default' : 'secondary'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'volume',
      label: 'Monthly Volume',
      render: (row) => row.volume,
    },
    {
      key: 'residual',
      label: 'Monthly Residual',
      render: (row) => row.residual,
    },
  ];

  return (
    <div className="p-6 grid gap-6">
      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Merchant Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="status-select" className="text-sm font-medium text-foreground-muted">
                Merchant Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px] bg-card border-card-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-card-border">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => console.log('Filter applied')} 
              className="mt-6"
              variant="default"
            >
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Merchant Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <FeyTable 
            columns={columns} 
            data={merchants} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantSummaryPage;
