import {
  Card,
  Title,
  TablePro,
  Select,
  Button,
} from '@reactbits/core';
import { useState } from 'react';

const MerchantSummaryPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');

  const merchants = [
    { mid: '123456', name: 'Merchant A', status: 'Active', volume: '$25,000', residual: '$500' },
    { mid: '789012', name: 'Merchant B', status: 'Inactive', volume: '$30,000', residual: '$600' },
  ];

  const tableColumns = [
    { label: 'MID', accessor: 'mid' },
    { label: 'Name', accessor: 'name' },
    { label: 'Status', accessor: 'status' },
    { label: 'Monthly Volume', accessor: 'volume' },
    { label: 'Monthly Residual', accessor: 'residual' },
  ];

  return (
    <div className="p-6 grid gap-6">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Select
            label="Merchant Status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
          <Button onClick={() => console.log('Filter applied')}>Filter</Button>
        </div>
      </Card>
      <Card>
        <Title level={3}>Merchant Overview</Title>
        <TablePro columns={tableColumns} data={merchants} />
      </Card>
    </div>
  );
};

export default MerchantSummaryPage;
