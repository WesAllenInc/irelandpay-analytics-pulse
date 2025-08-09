import { createSupabaseServerClient } from '@/lib/supabase/server';  
import { cookies } from 'next/headers';
import { ValidationIssuesList } from '@/components/data-validation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Get report details from Supabase
async function getReport(reportId: string) {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('validation_report_summaries')
    .select('*')
    .eq('id', reportId)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data;
}

// Server component to render the page
// Next.js 15 with proper params handling
import { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
}

// Define proper metadata for dynamic routes
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Data Validation Report ${resolvedParams.id}`,
  }
}

export default async function ReportDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const report = await getReport(resolvedParams.id);
  
  if (!report) {
    notFound();
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case 'completed': return 'success';
      case 'running': return 'default';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin/data-validation">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Validation Report</h1>
        </div>
        <Badge variant={getStatusBadgeVariant(report.status) as any}>
          {report.status}
        </Badge>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <div className="text-sm text-muted-foreground">Data Type</div>
          <div className="text-2xl font-bold">{report.report_type}</div>
          {report.report_scope && (
            <div className="text-sm text-muted-foreground">{report.report_scope}</div>
          )}
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <div className="text-sm text-muted-foreground">Records Checked</div>
          <div className="text-2xl font-bold">{report.total_records}</div>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <div className="text-sm text-muted-foreground">Records with Issues</div>
          <div className="text-2xl font-bold text-amber-500">{report.records_with_issues}</div>
          <div className="text-sm text-muted-foreground">
            {report.total_records > 0
              ? `${((report.records_with_issues / report.total_records) * 100).toFixed(1)}%`
              : '0%'}
          </div>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <div className="text-sm text-muted-foreground">Validation Time</div>
          <div className="text-2xl font-bold">
            {report.execution_time_ms
              ? `${(report.execution_time_ms / 1000).toFixed(2)}s`
              : 'N/A'}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(report.validation_timestamp)}
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 md:col-span-1">
          <h3 className="font-medium mb-2">Issue Severity</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Critical</span>
              <Badge variant="destructive">{report.critical_issues || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">High</span>
              <Badge variant="destructive">{report.high_issues || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Medium</span>
              <Badge variant="warning">{report.medium_issues || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Low</span>
              <Badge variant="secondary">{report.low_issues || 0}</Badge>
            </div>
          </div>
          
          <h3 className="font-medium mt-4 mb-2">Resolution Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Open</span>
              <Badge variant="outline">{report.open_issues || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Resolved</span>
              <Badge variant="success">{report.resolved_issues || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Ignored</span>
              <Badge variant="secondary">{report.ignored_issues || 0}</Badge>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-3">
          <ValidationIssuesList reportId={resolvedParams.id} />
        </div>
      </div>
    </div>
  );
}
