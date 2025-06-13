import {
  Card,
  DateRangePicker,
  Select,
  Button,
  TablePro,
  Title,
} from 'react-bits';
import { useState } from 'react';
import Chart from 'react-apexcharts';

const ResidualsPage = () => {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedMID, setSelectedMID] = useState('all');

  const chartOptions = {
    chart: { id: 'residual-line' },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'] },
  };

  const chartSeries = [
    { name: 'Residuals', data: [4500, 5200, 4800, 6100, 7000] },
  ];

  const tableData = [
    { mid: '123456', name: 'Merchant A', volume: '$25,000', residual: '$500' },
    { mid: '789012', name: 'Merchant B', volume: '$30,000', residual: '$600' },
  ];

  const tableColumns = [
    { label: 'MID', accessor: 'mid' },
    { label: 'Name', accessor: 'name' },
    { label: 'Volume', accessor: 'volume' },
    { label: 'Residual', accessor: 'residual' },
  ];

  return (
    <div className="p-6 grid gap-6">
      <Card>
        <div className="flex flex-wrap gap-4 items-center">
          <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full md:w-auto" />
          <Select
            label="Filter by MID"
            value={selectedMID}
            onChange={setSelectedMID}
            options={[{ label: 'All', value: 'all' }, { label: '123456', value: '123456' }]}
          />
          <Button onClick={() => console.log('Apply filters')}>Apply Filters</Button>
        </div>
      </Card>
      <Card>
        <Title level={3}>Monthly Residual Trends</Title>
        <Chart options={chartOptions} series={chartSeries} type="line" height={300} />
      </Card>
      <Card>
        <Title level={3}>Merchant Residual Breakdown</Title>
        <TablePro columns={tableColumns} data={tableData} />
      </Card>
    </div>
  );
};

export default ResidualsPage;
