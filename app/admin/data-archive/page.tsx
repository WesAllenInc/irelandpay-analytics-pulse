import { Metadata } from 'next';
import { HistoricalDataViewer } from '@/components/data/HistoricalDataViewer';
import { ArchiveStatsDashboard } from '@/components/admin/ArchiveStatsDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Archive, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data Archive Management | IrelandPay Analytics',
  description: 'Comprehensive data archive management and historical data analysis for IrelandPay merchant data.',
};

export default function DataArchivePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Archive Management</h1>
          <p className="text-muted-foreground">
            Manage historical data retention and analyze merchant performance over time
          </p>
        </div>
      </div>

      <Tabs defaultValue="viewer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Data Viewer
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Archive Stats
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archive Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer" className="space-y-6">
          <HistoricalDataViewer />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <ArchiveStatsDashboard />
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Data Retention Policy</CardTitle>
                <CardDescription>
                  How we handle historical data storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Retention Period</h4>
                  <p className="text-sm text-muted-foreground">
                    All merchant data is retained indefinitely starting from April 2024. 
                    This ensures complete historical analysis capabilities.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Storage Strategy</h4>
                  <p className="text-sm text-muted-foreground">
                    Data is partitioned by month for optimal query performance. 
                    Each partition contains data for a specific month, allowing 
                    efficient retrieval of historical information.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Data Types</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Merchant transaction volumes</li>
                    <li>• Processing fees and revenue</li>
                    <li>• Transaction counts and averages</li>
                    <li>• Monthly performance metrics</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Optimization</CardTitle>
                <CardDescription>
                  How we maintain fast query performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Partitioning</h4>
                  <p className="text-sm text-muted-foreground">
                    Monthly partitions enable partition pruning, where only 
                    relevant partitions are scanned during queries. This 
                    dramatically improves query performance.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indexing</h4>
                  <p className="text-sm text-muted-foreground">
                    Strategic indexes on merchant_id, month, and other 
                    frequently queried columns ensure fast data retrieval.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Materialized Views</h4>
                  <p className="text-sm text-muted-foreground">
                    Pre-computed aggregations for common query patterns, 
                    automatically refreshed to maintain data freshness.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Maintenance</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Automatic partition creation</li>
                    <li>• Regular table analysis</li>
                    <li>• Index optimization</li>
                    <li>• Storage monitoring</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Export & Compliance</CardTitle>
                <CardDescription>
                  Export capabilities and compliance features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Export Formats</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• CSV format for spreadsheet analysis</li>
                    <li>• JSON format for API integration</li>
                    <li>• Date range filtering</li>
                    <li>• Merchant-specific exports</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Data Integrity</h4>
                  <p className="text-sm text-muted-foreground">
                    All exports include data validation and checksums to 
                    ensure data integrity during transfer and storage.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Audit Trail</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete audit trail of all data access and exports, 
                    including user identification and timestamp information.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monitoring & Alerts</CardTitle>
                <CardDescription>
                  Proactive monitoring and alerting system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Storage Monitoring</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Real-time storage usage tracking</li>
                    <li>• Growth rate monitoring</li>
                    <li>• Partition health checks</li>
                    <li>• Performance degradation alerts</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Automated Maintenance</h4>
                  <p className="text-sm text-muted-foreground">
                    Scheduled maintenance tasks run automatically to ensure 
                    optimal performance and data integrity.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Alert Thresholds</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Storage growth &gt; 50% in a month</li>
                    <li>• Query performance degradation</li>
                    <li>• Partition analysis overdue</li>
                    <li>• Data integrity issues</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 