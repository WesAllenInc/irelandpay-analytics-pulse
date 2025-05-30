"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, CreditCard, Users, TrendingUp, BarChart } from 'lucide-react';

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

interface DashboardMetrics {
  totalVolume: number;
  volumeChange: number;
  totalTransactions: number;
  transactionsChange: number;
  activeMerchants: number;
  avgTransactionValue: number;
}

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Volume"
        value={formatCurrency(metrics.totalVolume)}
        change={metrics.volumeChange}
        changeLabel="from last month"
        icon={<BarChart className="h-5 w-5 text-primary" />}
      />
      
      <MetricCard
        title="Total Transactions"
        value={metrics.totalTransactions.toLocaleString()}
        change={metrics.transactionsChange}
        changeLabel="from last month"
        icon={<CreditCard className="h-5 w-5 text-primary" />}
      />
      
      <MetricCard
        title="Active Merchants"
        value={metrics.activeMerchants.toLocaleString()}
        change={0} // No change data provided for active merchants
        changeLabel="total count"
        icon={<Users className="h-5 w-5 text-primary" />}
      />
      
      <MetricCard
        title="Avg. Transaction Value"
        value={formatCurrency(metrics.avgTransactionValue)}
        change={0} // No change data provided for avg transaction value
        changeLabel="per transaction"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
      />
    </div>
  );
}