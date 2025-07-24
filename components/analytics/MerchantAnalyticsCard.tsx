import React from 'react';

interface MerchantAnalyticsCardProps {
  title: string;
  value: number | string;
  change: number; // percentage, can be negative
  unit?: string;
}

export const MerchantAnalyticsCard: React.FC<MerchantAnalyticsCardProps> = ({ title, value, change, unit }) => {
  const isPositive = change >= 0;
  return (
    <div className="p-4 rounded-xl shadow bg-white dark:bg-gray-900 flex flex-col items-start min-w-[180px]">
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</div>
      <div className="flex items-end gap-2 mb-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {unit}{typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      <div className="flex items-center text-xs font-semibold">
        <span className={isPositive ? 'text-green-600' : 'text-red-500'}>
          {isPositive ? (
            <svg className="inline w-4 h-4 mr-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          ) : (
            <svg className="inline w-4 h-4 mr-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          )}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}; 