'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, 
  Table2, 
  Download, 
  Loader2, 
  Calendar,
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { ArchiveManager, HistoricalQueryParams } from '@/lib/archive/archive-manager';

interface HistoricalData {
  id: string;
  merchant_id: string;
  merchant_name: string;
  month: string;
  total_transactions: number;
  total_volume: number;
  avg_ticket: number;
  net_revenue: number;
}

interface DataSummary {
  totalVolume: number;
  totalTransactions: number;
  avgTicket: number;
  totalRevenue: number;
  recordCount: number;
}

export function HistoricalDataViewer() {
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 6).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [data, setData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [summary, setSummary] = useState<DataSummary | null>(null);

  const loadHistoricalData = async () => {
    setLoading(true);
    
    try {
      const archiveManager = new ArchiveManager();
      const params: HistoricalQueryParams = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        merchantId: selectedMerchant || undefined,
        metrics: ['merchant_id', 'merchant_name', 'month', 'total_volume', 'total_transactions', 'avg_ticket', 'net_revenue']
      };

      const result = await archiveManager.queryHistoricalData(params);
      setData(result);

      // Calculate summary
      const summaryData: DataSummary = {
        totalVolume: result.reduce((sum: number, item: HistoricalData) => sum + (item.total_volume || 0), 0),
        totalTransactions: result.reduce((sum: number, item: HistoricalData) => sum + (item.total_transactions || 0), 0),
        avgTicket: result.length > 0 ? result.reduce((sum: number, item: HistoricalData) => sum + (item.avg_ticket || 0), 0) / result.length : 0,
        totalRevenue: result.reduce((sum: number, item: HistoricalData) => sum + (item.net_revenue || 0), 0),
        recordCount: result.length
      };
      setSummary(summaryData);

    } catch (error: any) {
      toast.error('Failed to load historical data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const csvContent = generateCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historical_data_${dateRange.start}_to_${dateRange.end}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const generateCSV = (data: HistoricalData[]): string => {
    const headers = ['Merchant ID', 'Merchant Name', 'Month', 'Total Volume', 'Total Transactions', 'Avg Ticket', 'Net Revenue'];
    const rows = data.map(item => [
      item.merchant_id,
      item.merchant_name,
      item.month,
      item.total_volume,
      item.total_transactions,
      item.avg_ticket,
      item.net_revenue
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      loadHistoricalData();
    }
  }, [dateRange, selectedMerchant]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Historical Data Analysis</CardTitle>
            <CardDescription>
              Analyze merchant data from April 2024 to present
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value)}
            >
              <ToggleGroupItem value="chart">
                <LineChart className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table">
                <Table2 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="outline"
              onClick={exportData}
              disabled={data.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label>Date Range</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <Label htmlFor="start-date" className="sr-only">Start Date</Label>
                <input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  min="2024-04-01"
                  max={dateRange.end}
                  aria-label="Start date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <span className="flex items-center text-muted-foreground">to</span>
              <div className="flex-1">
                <Label htmlFor="end-date" className="sr-only">End Date</Label>
                <input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  min={dateRange.start}
                  max={new Date().toISOString().split('T')[0]}
                  aria-label="End date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Label>Merchant (Optional)</Label>
            <input
              type="text"
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              placeholder="Enter merchant ID or leave empty for all"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
            />
          </div>

          <div className="flex items-end">
            <Button 
              onClick={loadHistoricalData}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Data Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Volume</p>
                    <p className="text-2xl font-bold">
                      ${summary.totalVolume.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Transactions</p>
                    <p className="text-2xl font-bold">
                      {summary.totalTransactions.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Avg Ticket</p>
                    <p className="text-2xl font-bold">
                      ${summary.avgTicket.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Records</p>
                    <p className="text-2xl font-bold">
                      {summary.recordCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Display */}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading historical data...</span>
          </div>
        ) : data.length === 0 ? (
          <Alert>
            <AlertDescription>
              No data found for the selected criteria. Try adjusting the date range or merchant filter.
            </AlertDescription>
          </Alert>
        ) : viewMode === 'chart' ? (
          <HistoricalDataChart data={data} />
        ) : (
          <HistoricalDataTable data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function HistoricalDataChart({ data }: { data: HistoricalData[] }) {
  // Simple chart implementation - in a real app, you'd use a charting library like Recharts
  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-between space-x-1">
          {data.slice(0, 12).map((item, index) => {
            const maxVolume = Math.max(...data.map(d => d.total_volume));
            const height = (item.total_volume / maxVolume) * 100;
            return (
              <div key={index} className="flex-1 bg-primary/20 rounded-t">
                <div 
                  className="bg-primary rounded-t transition-all duration-300"
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          {data.slice(0, 12).map((item, index) => (
            <span key={index} className="text-center">
              {format(new Date(item.month), 'MMM')}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoricalDataTable({ data }: { data: HistoricalData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Transactions</TableHead>
              <TableHead>Avg Ticket</TableHead>
              <TableHead>Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.merchant_name}</div>
                    <div className="text-sm text-muted-foreground">{item.merchant_id}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {format(new Date(item.month), 'MMM yyyy')}
                  </Badge>
                </TableCell>
                <TableCell>${item.total_volume?.toLocaleString()}</TableCell>
                <TableCell>{item.total_transactions?.toLocaleString()}</TableCell>
                <TableCell>${item.avg_ticket?.toFixed(2)}</TableCell>
                <TableCell>${item.net_revenue?.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 