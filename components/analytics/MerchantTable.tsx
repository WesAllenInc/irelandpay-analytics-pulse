import React, { useState } from 'react';
import Link from 'next/link';

interface Merchant {
  name: string;
  volume: number;
  profit: number;
  bps: number;
  merchantId: string;
}

interface MerchantTableProps {
  merchants: Merchant[];
}

type SortKey = 'name' | 'volume' | 'profit' | 'bps';
type SortDirection = 'asc' | 'desc';

function downloadCSV(data: Merchant[]) {
  const header = ['Name', 'Volume', 'Profit', 'BPS', 'Merchant ID'];
  const rows = data.map(m => [m.name, m.volume, m.profit, m.bps, m.merchantId]);
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'merchants.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export const MerchantTable: React.FC<MerchantTableProps> = ({ merchants }) => {
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow p-4 mt-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-base font-semibold text-gray-800 dark:text-white">Merchants</div>
        <button
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => downloadCSV(sorted)}
        >
          Download CSV
        </button>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 