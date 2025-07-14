// Using Next.js and React components instead
'use client';

import { useState } from 'react';

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const reportData = [
    { date: '2025-05-01', merchant: 'Merchant A', volume: '$22,000', residual: '$480' },
    { date: '2025-05-01', merchant: 'Merchant B', volume: '$33,000', residual: '$710' },
  ];

  const tableColumns = [
    { label: 'Date', accessor: 'date' },
    { label: 'Merchant', accessor: 'merchant' },
    { label: 'Volume', accessor: 'volume' },
    { label: 'Residual', accessor: 'residual' },
  ];

  const handleExport = () => {
    console.log('Export logic goes here');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          {/* Simple date range input as placeholder */}
          <div className="flex gap-2">
            <div className="flex flex-col">
              <label htmlFor="start-date" className="text-sm mb-1">Start Date</label>
              <input 
                id="start-date"
                type="date" 
                className="px-4 py-2 border rounded"
                placeholder="Start date"
                title="Start date"
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})} 
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="end-date" className="text-sm mb-1">End Date</label>
              <input 
                id="end-date"
                type="date" 
                className="px-4 py-2 border rounded"
                placeholder="End date"
                title="End date"
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})} 
              />
            </div>
          </div>
          <div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded mr-2">Export CSV</button>
            <button className="bg-gray-500 text-white px-4 py-2 rounded">Print</button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Monthly Reports</h2>
            <span>Generated on {new Date().toLocaleDateString()}</span>
          </div>
          
          {/* Simple table replacement */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  {tableColumns.map((col) => (
                    <th key={col.accessor} className="py-2 px-4 border-b border-gray-200 bg-gray-100 text-left text-sm font-semibold">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx}>
                    {tableColumns.map((col) => (
                      <td key={`${idx}-${col.accessor}`} className="py-2 px-4 border-b border-gray-200">
                        {row[col.accessor as keyof typeof row]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
