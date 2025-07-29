'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Merchant {
  name: string;
  volume: number;
  profit: number;
  bps: number;
  merchantId: string;
  processor: string;
}

interface MerchantTableProps {
  merchants: Merchant[];
  onDateRangeChange?: (from: Date, to: Date) => void;
}

type SortKey = 'name' | 'volume' | 'profit' | 'bps' | 'processor';
type SortDirection = 'asc' | 'desc';

function downloadCSV(data: Merchant[]) {
  const header = ['Name', 'Volume', 'Profit', 'BPS', 'Processor', 'Merchant ID'];
  const rows = data.map(m => [m.name, m.volume, m.profit, m.bps, m.processor, m.merchantId]);
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'merchants.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export const MerchantTable: React.FC<MerchantTableProps> = ({ merchants, onDateRangeChange }) => {
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const sorted = [...merchants].sort((a, b) => {
    if (sortKey === 'name') {
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      return sortDirection === 'asc'
        ? (a[sortKey] as number) - (b[sortKey] as number)
        : (b[sortKey] as number) - (a[sortKey] as number);
    }
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handleDateRangeChange = () => {
    if (dateFrom && dateTo && onDateRangeChange) {
      onDateRangeChange(new Date(dateFrom), new Date(dateTo));
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-base font-semibold text-gray-800 dark:text-white">Merchants</div>
        <div className="flex items-center gap-4">
          {onDateRangeChange && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 text-sm border rounded"
                placeholder="From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 text-sm border rounded"
                placeholder="To"
              />
              <button
                onClick={handleDateRangeChange}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Apply Range
              </button>
            </div>
          )}
          <button
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => downloadCSV(sorted)}
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
            <tr>
              <th className="p-2 cursor-pointer text-left" onClick={() => handleSort('name')}>
                Name {sortKey === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="p-2 cursor-pointer text-right" onClick={() => handleSort('volume')}>
                Volume {sortKey === 'volume' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="p-2 cursor-pointer text-right" onClick={() => handleSort('profit')}>
                Profit {sortKey === 'profit' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="p-2 cursor-pointer text-right" onClick={() => handleSort('bps')}>
                BPS {sortKey === 'bps' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="p-2 cursor-pointer text-left" onClick={() => handleSort('processor')}>
                Processor {sortKey === 'processor' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.merchantId} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <td className="p-2 text-left">
                  <Link href={`/agent/${m.merchantId}`} className="text-blue-600 hover:underline">
                    {m.name}
                  </Link>
                </td>
                <td className="p-2 text-right">{m.volume.toLocaleString()}</td>
                <td className="p-2 text-right">{m.profit.toLocaleString()}</td>
                <td className="p-2 text-right">{m.bps.toFixed(2)}</td>
                <td className="p-2 text-left">{m.processor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 