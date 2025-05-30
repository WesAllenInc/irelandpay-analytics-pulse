"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon?: React.ReactNode;
}

const MetricCard = ({ title, value, change, changeLabel, icon }: MetricCardProps) => {
  const isPositive = change >= 0;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-semibold mt-2">{value}</h3>
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? (
                  <ArrowUpIcon className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="w-3 h-3 mr-1" />
                )}
                {Math.abs(change)}%
              </span>
              <span className="text-sm text-muted-foreground ml-2">{changeLabel}</span>
            </div>
          </div>
          {icon && (
            <div className="p-2 bg-primary/10 rounded-full">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface MetricsCardsProps {
  data: {
    totalTransactions: {
      value: string;
      change: number;
    };
    activeMerchants: {
      value: number;
      change: number;
    };
    avgTransactionValue: {
      value: string;
      change: number;
    };
    conversionRate: {
      value: string;
      change: number;
    };
  };
}

export default function MetricsCards({ data }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Transactions"
        value={data.totalTransactions.value}
        change={data.totalTransactions.change}
        changeLabel="from last month"
      />
      
      <MetricCard
        title="Active Merchants"
        value={data.activeMerchants.value}
        change={data.activeMerchants.change}
        changeLabel="from last month"
      />
      
      <MetricCard
        title="Avg. Transaction Value"
        value={data.avgTransactionValue.value}
        change={data.avgTransactionValue.change}
        changeLabel="from last month"
      />
      
      <MetricCard
        title="Conversion Rate"
        value={data.conversionRate.value}
        change={data.conversionRate.change}
        changeLabel="from last month"
      />
    </div>
  );
}