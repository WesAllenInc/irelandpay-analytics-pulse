'use client';

import React from 'react';

export type Timeframe = 'Monthly' | 'Quarterly' | 'Yearly' | 'Lifetime';

interface TimeframeSelectorProps {
  selectedTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selectedTimeframe,
  onTimeframeChange,
}) => {
  const timeframes: Timeframe[] = ['Monthly', 'Quarterly', 'Yearly', 'Lifetime'];

  return (
    <div className="flex items-center space-x-2 mb-6">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Timeframe:
      </span>
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {timeframes.map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => onTimeframeChange(timeframe)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              selectedTimeframe === timeframe
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {timeframe}
          </button>
        ))}
      </div>
    </div>
  );
}; 