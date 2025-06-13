import {
  Card,
  Title,
  Button,
  TablePro,
  DateRangePicker,
} from '@reactbits/core';
import { useState } from 'react';

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState({ from: null, to: null });

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
    <div className="p-6 grid gap-6">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full md:w-auto" />
          <Button onClick={handleExport}>Export Report</Button>
        </div>
      </Card>
      <Card>
        <Title level={3}>Residual Report Summary</Title>
        <TablePro columns={tableColumns} data={reportData} />
      </Card>
    </div>
  );
};

export default ReportsPage;
