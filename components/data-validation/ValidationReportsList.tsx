"use client"

import { useState, useEffect } from 'react';
import { useDataValidation, ValidationReport } from '@/hooks/useDataValidation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReloadIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';

interface ValidationReportsListProps {
  limit?: number;
}

export function ValidationReportsList({ limit = 10 }: ValidationReportsListProps) {
  const { getValidationReports, reports, reportsLoading } = useDataValidation();
  
  useEffect(() => {
    getValidationReports(limit);
  }, [getValidationReports, limit]);

  const handleRefresh = () => {
    getValidationReports(limit);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Status badge color mapping
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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Validation Reports</CardTitle>
          <CardDescription>
            Recent data validation reports comparing API data with database records.
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={reportsLoading}>
          <ReloadIcon className={`h-4 w-4 ${reportsLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {reportsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-16" />
            ))}
          </div>
        ) : reports.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead className="hidden md:table-cell">Run Time</TableHead>
                <TableHead className="hidden md:table-cell">Executed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="font-medium">{report.report_type}</div>
                    {report.report_scope && (
                      <div className="text-xs text-muted-foreground">{report.report_scope}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(report.status) as any}>
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.total_records}</TableCell>
                  <TableCell>
                    {report.records_with_issues > 0 ? (
                      <span className="text-red-500 font-medium">{report.records_with_issues}</span>
                    ) : (
                      <span className="text-green-500">0</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {report.execution_time_ms ? `${(report.execution_time_ms / 1000).toFixed(2)}s` : 'N/A'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(report.validation_timestamp)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/data-validation/${report.id}`}>
                      <Button variant="ghost" size="icon">
                        <ExternalLinkIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No validation reports found.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Link href="/admin/data-validation">
          <Button variant="outline">View All Reports</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
