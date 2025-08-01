'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Calendar, 
  HardDrive, 
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ArchiveManager, RetentionStats, PartitionHealth } from '@/lib/archive/archive-manager';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ArchiveStatsDashboard() {
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [partitionHealth, setPartitionHealth] = useState<PartitionHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const archiveManager = new ArchiveManager();
      const [statsData, healthData] = await Promise.all([
        archiveManager.getRetentionStats(),
        archiveManager.getPartitionHealth()
      ]);
      
      setStats(statsData);
      setPartitionHealth(healthData);
    } catch (error: any) {
      toast.error('Failed to load archive statistics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
    toast.success('Archive statistics refreshed');
  };

  const getHealthStatus = (healthy: boolean) => {
    return healthy ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Healthy
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Needs Optimization
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading archive statistics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Archive Statistics</h2>
          <p className="text-muted-foreground">
            Monitor data retention, storage usage, and partition health
          </p>
        </div>
        <Button onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Records"
            value={stats.totalRecords.toLocaleString()}
            description="Across all partitions"
            icon={Database}
          />
          <StatCard
            title="Data Retention"
            value={stats.oldestRecord ? 
              formatDistanceToNow(new Date(stats.oldestRecord), { addSuffix: false }) : 
              'N/A'
            }
            description="Oldest record"
            icon={Calendar}
          />
          <StatCard
            title="Storage Used"
            value={stats.totalSize}
            description="Total database size"
            icon={HardDrive}
          />
          <StatCard
            title="Partitions"
            value={stats.partitionCount.toString()}
            description="Monthly partitions"
            icon={Layers}
          />
        </div>
      )}

      {/* Partition Health Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partition Health</CardTitle>
          <CardDescription>
            Monitor partition performance and storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partitionHealth.length === 0 ? (
            <Alert>
              <AlertDescription>
                No partition health data available. This may indicate that the partitioned tables haven't been created yet.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last Analyzed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partitionHealth.map((partition) => (
                  <TableRow key={partition.name}>
                    <TableCell>
                      <div className="font-medium">
                        {format(new Date(partition.month), 'MMM yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {partition.name}
                      </div>
                    </TableCell>
                    <TableCell>{partition.recordCount.toLocaleString()}</TableCell>
                    <TableCell>{partition.size}</TableCell>
                    <TableCell>
                      {partition.lastAnalyzed ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(partition.lastAnalyzed), { 
                              addSuffix: true 
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getHealthStatus(partition.healthy)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Storage Growth Chart */}
      {stats?.sizeByMonth && stats.sizeByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Growth Trend</CardTitle>
            <CardDescription>
              Monthly storage usage over the last 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StorageGrowthChart data={stats.sizeByMonth} />
          </CardContent>
        </Card>
      )}

      {/* Data Retention Summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Data Retention Summary</CardTitle>
            <CardDescription>
              Overview of data retention policies and storage efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Retention Period</h4>
                <p className="text-sm text-muted-foreground">
                  Data is retained indefinitely starting from April 2024. 
                  The system uses monthly partitioning for efficient storage and query performance.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Storage Efficiency</h4>
                <p className="text-sm text-muted-foreground">
                  {stats.partitionCount} partitions with an average of {
                    Math.round(stats.totalRecords / stats.partitionCount).toLocaleString()
                  } records per partition.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StorageGrowthChart({ data }: { data: Array<{ month: string; size: string; recordCount: number }> }) {
  // Simple bar chart implementation
  const maxRecords = Math.max(...data.map(d => d.recordCount));
  
  return (
    <div className="space-y-4">
      <div className="h-48 flex items-end justify-between space-x-1">
        {data.map((item, index) => {
          const height = (item.recordCount / maxRecords) * 100;
          return (
            <div key={index} className="flex-1 bg-primary/20 rounded-t">
              <div 
                className="bg-primary rounded-t transition-all duration-300"
                style={{ height: `${height}%` }}
                title={`${item.month}: ${item.recordCount.toLocaleString()} records`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {data.map((item, index) => (
          <span key={index} className="text-center">
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
} 