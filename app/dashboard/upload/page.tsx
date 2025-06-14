"use client";

import { useState } from 'react';
import Chart from 'react-apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DateRange } from "react-day-picker";

const ResidualsPage = () => {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
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
    { accessorKey: 'mid', header: 'MID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'volume', header: 'Volume' },
    { accessorKey: 'residual', header: 'Residual' },
  ];

  return (
    <div className="p-6 grid gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <DateRangePicker 
              value={dateRange}
              onChange={(date) => date !== undefined ? setDateRange(date) : setDateRange({ from: undefined, to: undefined })}
              className="w-full md:w-auto" 
              placeholder="Select date range"
            />
            <div className="w-full md:w-auto">
              <Select value={selectedMID} onValueChange={setSelectedMID}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by MID" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="123456">123456</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => console.log('Apply filters')}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Monthly Residual Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart options={chartOptions} series={chartSeries} type="line" height={300} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Merchant Residual Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={tableColumns} data={tableData} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidualsPage;
