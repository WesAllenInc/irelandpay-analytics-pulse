'use client';

import { useState, useEffect } from 'react';
import { adminServiceClient, AuditLogEntry } from '@/lib/auth/admin-service-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Download, 
  Filter, 
  Search,
  Eye,
  Calendar,
  User,
  Activity
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: 'all',
    dateRange: 'last7days',
    resourceType: 'all',
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await adminServiceClient.getAuditLogs(100, 0, {
        action: filters.action !== 'all' ? filters.action : undefined,
        resourceType: filters.resourceType !== 'all' ? filters.resourceType : undefined
      });
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const csvContent = generateCSV(logs);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const generateCSV = (logs: AuditLogEntry[]) => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent'];
    const rows = logs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.admin?.email || 'Unknown',
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.ip_address || '',
      log.user_agent || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const viewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
  };

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'bg-blue-100 text-blue-800';
    if (action.includes('sync')) return 'bg-green-100 text-green-800';
    if (action.includes('transfer')) return 'bg-purple-100 text-purple-800';
    if (action.includes('denied')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const filteredLogs = logs.filter(log => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchTerm) ||
        log.resource_type.toLowerCase().includes(searchTerm) ||
        log.admin?.email?.toLowerCase().includes(searchTerm) ||
        log.ip_address?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Admin Activity Log</CardTitle>
            <CardDescription>
              Monitor and audit all administrative actions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-8 w-64"
            />
          </div>

          <Select
            value={filters.action}
            onValueChange={(value) => setFilters({ ...filters, action: value })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="admin.login">Admin Login</SelectItem>
              <SelectItem value="sync.manual.trigger">Manual Sync</SelectItem>
              <SelectItem value="sync.settings.update">Settings Update</SelectItem>
              <SelectItem value="admin.role.transfer">Role Transfer</SelectItem>
              <SelectItem value="admin.access.denied">Access Denied</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.resourceType}
            onValueChange={(value) => setFilters({ ...filters, resourceType: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="sync">Sync</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last24hours">Last 24 Hours</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse text-muted-foreground">Loading audit logs...</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {format(new Date(log.created_at), 'MMM d, h:mm:ss a')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{log.admin?.email || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <div className="text-sm">{log.resource_type}</div>
                        {log.resource_id && (
                          <div className="text-xs text-muted-foreground">
                            ID: {log.resource_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {log.ip_address || 'Unknown'}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Audit Log Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Action</label>
                              <p className="text-sm text-muted-foreground">{log.action}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Resource Type</label>
                              <p className="text-sm text-muted-foreground">{log.resource_type}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Admin</label>
                              <p className="text-sm text-muted-foreground">{log.admin?.email || 'Unknown'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">IP Address</label>
                              <p className="text-sm text-muted-foreground">{log.ip_address || 'Unknown'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Timestamp</label>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(log.created_at), 'PPP p')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">User Agent</label>
                              <p className="text-sm text-muted-foreground truncate">
                                {log.user_agent || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div>
                              <label className="text-sm font-medium">Additional Details</label>
                              <pre className="text-sm bg-muted p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {filteredLogs.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
} 