import { useState, useEffect } from 'react';
import { useDataValidation, ValidationIssue } from '@/hooks/useDataValidation';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  XCircle,
} from 'lucide-react';

interface ValidationIssuesListProps {
  reportId: string;
}

export function ValidationIssuesList({ reportId }: ValidationIssuesListProps) {
  const { getValidationIssues, resolveIssue, issues, currentReport, issuesLoading } = useDataValidation();
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'ignored'>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'ignored'>('all');

  useEffect(() => {
    if (reportId) {
      getValidationIssues(reportId);
    }
  }, [reportId, getValidationIssues]);

  // Filter issues based on resolution status
  const filteredIssues = issues.filter(issue => {
    if (filter === 'all') return true;
    return issue.resolution_status === filter;
  });

  const handleViewIssue = (issue: ValidationIssue) => {
    setSelectedIssue(issue);
    setIsDialogOpen(true);
  };

  const handleResolveIssue = async () => {
    if (!selectedIssue) return;
    
    setIsResolving(true);
    
    const success = await resolveIssue(
      selectedIssue.id,
      resolutionStatus,
      resolutionNotes
    );
    
    setIsResolving(false);
    
    if (success) {
      setIsDialogOpen(false);
      setResolutionNotes('');
    }
  };

  // Get icon based on issue severity
  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-amber-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Get badge variant based on issue severity
  const getSeverityBadgeVariant = (severity: string) => {
    switch(severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  // Get badge variant based on resolution status
  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case 'open': return 'outline';
      case 'resolved': return 'success';
      case 'ignored': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Validation Issues</CardTitle>
          <CardDescription>
            Data discrepancies between API and database records
          </CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Issues</SelectItem>
                  <SelectItem value="open">Open Issues</SelectItem>
                  <SelectItem value="resolved">Resolved Issues</SelectItem>
                  <SelectItem value="ignored">Ignored Issues</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => getValidationIssues(reportId)}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {issuesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-16" />
              ))}
            </div>
          ) : filteredIssues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      {getSeverityIcon(issue.issue_severity)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{issue.record_id}</div>
                      <div className="text-xs text-muted-foreground">{issue.record_type}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityBadgeVariant(issue.issue_severity) as any}>
                        {issue.issue_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.field_path || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={getStatusBadgeVariant(issue.resolution_status) as any}>
                        {issue.resolution_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewIssue(issue)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No issues found with the current filter.
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground">
            {currentReport && (
              <>
                Showing issues from {currentReport.report_type} validation 
                {currentReport.report_scope && ` for ${currentReport.report_scope}`}
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Issue Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
            <DialogDescription>
              Data validation issue information and resolution options
            </DialogDescription>
          </DialogHeader>
          
          {selectedIssue && (
            <>
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(selectedIssue.issue_severity)}
                  <Badge variant={getSeverityBadgeVariant(selectedIssue.issue_severity) as any}>
                    {selectedIssue.issue_severity}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(selectedIssue.resolution_status) as any}>
                    {selectedIssue.resolution_status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <p className="text-sm font-medium">Record ID</p>
                    <p className="text-sm">{selectedIssue.record_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Record Type</p>
                    <p className="text-sm">{selectedIssue.record_type}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <p className="text-sm font-medium">Issue Type</p>
                    <p className="text-sm">{selectedIssue.issue_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Field Path</p>
                    <p className="text-sm">{selectedIssue.field_path || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="mb-2">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm">{selectedIssue.description || 'No description available'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">API Value</p>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-32">
                      {JSON.stringify(selectedIssue.api_value, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Database Value</p>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-32">
                      {JSON.stringify(selectedIssue.db_value, null, 2)}
                    </pre>
                  </div>
                </div>
                
                {selectedIssue.resolution_status === 'open' && (
                  <>
                    <div className="mt-4">
                      <p className="text-sm font-medium">Resolution</p>
                      <Select value={resolutionStatus} onValueChange={(value) => setResolutionStatus(value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="ignored">Ignored</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Resolution Notes</p>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionNotes(e.target.value)}
                        placeholder="Add notes about how this issue was resolved or why it was ignored"
                      />
                    </div>
                  </>
                )}
                
                {selectedIssue.resolution_status !== 'open' && selectedIssue.resolution_notes && (
                  <div>
                    <p className="text-sm font-medium">Resolution Notes</p>
                    <p className="text-sm">{selectedIssue.resolution_notes}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                {selectedIssue.resolution_status === 'open' && (
                  <Button 
                    onClick={handleResolveIssue} 
                    disabled={isResolving}
                    className="gap-2"
                  >
                    {isResolving && <span className="animate-spin">⟳</span>}
                    {resolutionStatus === 'resolved' ? 'Mark as Resolved' : 'Ignore Issue'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
