'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Download, Eye, Mail, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
// import { createSupabaseClient } from '../../../lib/supabase/client';

interface EmailLog {
  id: string;
  message_id?: string;
  to_email: string;
  cc_emails?: string[];
  subject: string;
  category: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  last_error?: string;
  sent_at?: string;
  created_at: string;
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    dateRange: 'last7days'
  });
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      // const supabase = createSupabaseClient();
      
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Apply date range filter
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'last24hours':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      query = query.gte('created_at', startDate.toISOString());

      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading email logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const csvContent = [
        ['Date', 'To', 'Subject', 'Category', 'Status', 'Attempts', 'Error'],
        ...logs.map(log => [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.to_email,
          log.subject,
          log.category,
          log.status,
          log.attempts.toString(),
          log.last_error || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const viewEmailDetails = (log: EmailLog) => {
    setSelectedLog(log);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Mail className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Email Notification Logs</h1>
        </div>
        <Button variant="outline" onClick={exportLogs}>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Activity</CardTitle>
          <CardDescription>
            Monitor email notification delivery and status
          </CardDescription>
          <div className="flex gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) => 
                setFilters({ ...filters, status: value })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) => 
                setFilters({ ...filters, category: value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sync-notification">Sync Notifications</SelectItem>
                <SelectItem value="error-alert">Error Alerts</SelectItem>
                <SelectItem value="report">Reports</SelectItem>
                <SelectItem value="system-alert">System Alerts</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.dateRange}
              onValueChange={(value) => 
                setFilters({ ...filters, dateRange: value })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last24hours">Last 24 Hours</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent At</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No email logs found for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.sent_at 
                        ? format(new Date(log.sent_at), 'MMM d, h:mm a')
                        : format(new Date(log.created_at), 'MMM d, h:mm a')
                      }
                    </TableCell>
                    <TableCell>{log.to_email}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <Badge variant={getStatusBadgeVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewEmailDetails(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Email Details</DialogTitle>
                            <DialogDescription>
                              Detailed information about this email notification
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">Subject</h4>
                              <p className="text-sm text-muted-foreground">{log.subject}</p>
                            </div>
                            <div>
                              <h4 className="font-medium">Recipient</h4>
                              <p className="text-sm text-muted-foreground">{log.to_email}</p>
                            </div>
                            {log.cc_emails && log.cc_emails.length > 0 && (
                              <div>
                                <h4 className="font-medium">CC Recipients</h4>
                                <p className="text-sm text-muted-foreground">
                                  {log.cc_emails.join(', ')}
                                </p>
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">Category</h4>
                              <Badge variant="outline">{log.category}</Badge>
                            </div>
                            <div>
                              <h4 className="font-medium">Status</h4>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(log.status)}
                                <Badge variant={getStatusBadgeVariant(log.status)}>
                                  {log.status}
                                </Badge>
                              </div>
                            </div>
                            {log.attempts > 0 && (
                              <div>
                                <h4 className="font-medium">Attempts</h4>
                                <p className="text-sm text-muted-foreground">{log.attempts}</p>
                              </div>
                            )}
                            {log.last_error && (
                              <div>
                                <h4 className="font-medium">Error</h4>
                                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                  {log.last_error}
                                </p>
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium">Created</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            {log.sent_at && (
                              <div>
                                <h4 className="font-medium">Sent</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(log.sent_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            )}
                            {log.message_id && (
                              <div>
                                <h4 className="font-medium">Message ID</h4>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {log.message_id}
                                </p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 