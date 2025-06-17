'use client';

import React from 'react'
import { KPICard } from '@/components/ui/KPICard'
import { DollarSign, CreditCard, Users, TrendingUp } from 'lucide-react'

interface MetricsCardsProps {
  metrics: {
    totalVolume: number;
    volumeChange: number;
    totalTransactions: number;
    transactionsChange: number;
    activeMerchants: number;
    avgTransactionValue: number;
  };
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)

  const formatNumber = (value: number): string =>
    new Intl.NumberFormat('en-US').format(value)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Total Volume"
        value={formatCurrency(metrics.totalVolume)}
        change={`${metrics.volumeChange > 0 ? '+' : ''}${metrics.volumeChange.toFixed(1)}%`}
        trend={metrics.volumeChange >= 0 ? 'up' : 'down'}
        sparklineData={[]}
        icon={<DollarSign className="w-5 h-5" />}
        className="shadow-card hover:shadow-elevated transition-all duration-200"
      />
      <KPICard
        title="Transactions"
        value={formatNumber(metrics.totalTransactions)}
        change={`${metrics.transactionsChange > 0 ? '+' : ''}${metrics.transactionsChange.toFixed(1)}%`}
        trend={metrics.transactionsChange >= 0 ? 'up' : 'down'}
        sparklineData={[]}
        icon={<CreditCard className="w-5 h-5" />}
        className="shadow-card hover:shadow-elevated transition-all duration-200"
      />
      <KPICard
        title="Active Merchants"
        value={formatNumber(metrics.activeMerchants)}
        change="0%"
        trend="up"
        sparklineData={[]}
        icon={<Users className="w-5 h-5" />}
        className="shadow-card hover:shadow-elevated transition-all duration-200"
      />
      <KPICard
        title="Avg Transaction"
        value={formatCurrency(metrics.avgTransactionValue)}
        change="0%"
        trend="up"
        sparklineData={[]}
        icon={<TrendingUp className="w-5 h-5" />}
        className="shadow-card hover:shadow-elevated transition-all duration-200"
      />
    </div>
  )
}