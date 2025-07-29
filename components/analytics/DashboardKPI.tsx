'use client';

import React from 'react';

export type KPI = {
  label: string;
  value: number;
  unit?: '$' | '%' | '';
  highlight?: boolean; // for the "current month" highlight
};

interface DashboardKPIProps {
  kpis: KPI[];
}

export const DashboardKPI: React.FC<DashboardKPIProps> = ({ kpis }) => {
  const formatValue = (value: number, unit: '$' | '%' | '' = '') => {
    if (unit === '$') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } else if (unit === '%') {
      return `${value.toFixed(2)}%`;
    } else {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className={`p-4 rounded-xl shadow-lg transition-all duration-200 ${
            kpi.highlight
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-300 dark:border-blue-600'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {kpi.label}
          </div>
          <div className={`text-2xl font-bold ${
            kpi.highlight 
              ? 'text-blue-700 dark:text-blue-300' 
              : 'text-gray-900 dark:text-white'
          }`}>
            {formatValue(kpi.value, kpi.unit)}
          </div>
          {kpi.highlight && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
              Current Period
            </div>
          )}
        </div>
      ))}
    </div>
  );
}; 