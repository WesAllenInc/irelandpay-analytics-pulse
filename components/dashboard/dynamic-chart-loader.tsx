"use client";

import { default as dynamicImport } from 'next/dynamic';

// Dynamically import heavy chart components with loading fallbacks
export const TradingViewWidget = dynamicImport(
  () => import('@/components/charts/trading-view-widget-final').then(mod => ({ default: mod.TradingViewWidget })),
  { ssr: false, loading: () => <div className="h-80 w-full animate-pulse bg-muted rounded-lg"></div> }
);

export const TotalSalesChart = dynamicImport(
  () => import('@/components/charts/total-sales-chart-lite').then(mod => ({ default: mod.TotalSalesChartLite })),
  { ssr: false, loading: () => <div className="h-80 w-full animate-pulse bg-muted rounded-lg"></div> }
);

export const EstimatedProfitChart = dynamicImport(
  () => import('@/components/charts/estimated-profit-chart').then(mod => ({ default: mod.EstimatedProfitChart })),
  { ssr: false, loading: () => <div className="h-80 w-full animate-pulse bg-muted rounded-lg"></div> }
);
