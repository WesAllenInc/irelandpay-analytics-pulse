import React, { useState } from 'react';
import { SyncAlert, useSyncAlerts } from '@/hooks/useSyncAlerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, AlertCircle, Info, RefreshCcw, Bell, BellOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface SyncAlertsProps {
  className?: string;
  maxHeight?: string;
  refreshInterval?: number;
  showToasts?: boolean;
}

export function SyncAlerts({ 
  className, 
  maxHeight = '400px',
  refreshInterval = 30000,
  showToasts = true
}: SyncAlertsProps) {
  const [selectedAlert, setSelectedAlert] = useState<SyncAlert | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const { 
    alerts, 
    criticalCount, 
    errorCount,
    warningCount,
    infoCount,
    totalCount,
    isLoading, 
    error,
    acknowledgeAlert,
    resolveAlert,
    refresh
  } = useSyncAlerts(refreshInterval, showToasts);

  // Handle acknowledging the selected alert
  const handleAcknowledge = async () => {
    if (selectedAlert) {
      await acknowledgeAlert(selectedAlert.id);
      setSelectedAlert(null);
    }
  };

  // Handle resolving the selected alert
  const handleResolve = async () => {
    if (selectedAlert) {
      await resolveAlert(selectedAlert.id);
      setSelectedAlert(null);
    }
  };

  // Filter alerts based on the active tab
  const filteredAlerts = alerts.filter(alert => {
    switch (activeTab) {
      case 'critical':
        return alert.severity === 'critical';
      case 'error':
        return alert.severity === 'error';
      case 'warning':
        return alert.severity === 'warning';
      case 'info':
        return alert.severity === 'info';
      default:
        return true; // 'all' tab
    }
  });

  // Get appropriate icon and color for alert severity
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-amber-500">Warning</Badge>;
      case 'info':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Info</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'sync_failure':
        return 'Sync Failure';
      case 'rate_limit':
        return 'Rate Limit';
      case 'data_validation':
        return 'Data Validation';
      case 'sync_retry_limit':
        return 'Sync Retry Limit';
      default:
        return alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Sync Alerts</span>
          </CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Sync Alerts</span>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <CardTitle>Sync Alerts</CardTitle>
              {totalCount > 0 && (
                <Badge variant="outline" className="ml-2 bg-red-100 text-red-800 hover:bg-red-100">
                  {totalCount}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
          <CardDescription>
            System alerts and notifications for sync operations
          </CardDescription>
        </CardHeader>

        <div>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6">
              <TabsList className="grid grid-cols-5 mb-2">
                <TabsTrigger value="all" className="text-xs">
                  All
                  {totalCount > 0 && <span className="ml-1 text-xs">({totalCount})</span>}
                </TabsTrigger>
                <TabsTrigger value="critical" className="text-xs">
                  Critical
                  {criticalCount > 0 && <span className="ml-1 text-xs">({criticalCount})</span>}
                </TabsTrigger>
                <TabsTrigger value="error" className="text-xs">
                  Error
                  {errorCount > 0 && <span className="ml-1 text-xs">({errorCount})</span>}
                </TabsTrigger>
                <TabsTrigger value="warning" className="text-xs">
                  Warning
                  {warningCount > 0 && <span className="ml-1 text-xs">({warningCount})</span>}
                </TabsTrigger>
                <TabsTrigger value="info" className="text-xs">
                  Info
                  {infoCount > 0 && <span className="ml-1 text-xs">({infoCount})</span>}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="m-0">
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] max-h-[400px] pr-4" style={{ maxHeight }}>
                  {filteredAlerts.length > 0 ? (
                    <div className="space-y-3 p-6">
                      {filteredAlerts.map((alert) => (
                        <div 
                          key={alert.id} 
                          className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <div>{getAlertIcon(alert.severity)}</div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{alert.title}</p>
                              <div className="flex items-center gap-2">
                                {getSeverityBadge(alert.severity)}
                                <Badge variant="outline">{getAlertTypeLabel(alert.alert_type)}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] p-6">
                      <BellOff className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground font-medium">No alerts found</p>
                      <p className="text-sm text-muted-foreground/70">
                        {totalCount > 0 
                          ? 'Try selecting a different category' 
                          : 'System is operating normally'}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </TabsContent>
          </Tabs>
        </div>
        
        {totalCount === 0 && (
          <CardFooter className="pt-0 pb-6 px-6">
            <div className="w-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm text-green-600">All systems operational</span>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getAlertIcon(selectedAlert.severity)}
              {selectedAlert?.title}
            </DialogTitle>
            <div className="flex gap-2 mt-2">
              {selectedAlert && getSeverityBadge(selectedAlert.severity)}
              {selectedAlert && (
                <Badge variant="outline">
                  {getAlertTypeLabel(selectedAlert.alert_type)}
                </Badge>
              )}
            </div>
            <DialogDescription className="pt-2">
              {selectedAlert?.message}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedAlert?.details && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Details</h4>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[150px]">
                  {JSON.stringify(selectedAlert.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>
                  {selectedAlert && new Date(selectedAlert.created_at).toLocaleString()}
                </span>
              </div>
              {selectedAlert?.acknowledged_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acknowledged:</span>
                  <span>
                    {new Date(selectedAlert.acknowledged_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            {selectedAlert?.status === 'active' && (
              <>
                <Button onClick={handleAcknowledge}>
                  Acknowledge
                </Button>
                <Button variant="outline" onClick={handleResolve}>
                  Resolve
                </Button>
              </>
            )}
            {selectedAlert?.status === 'acknowledged' && (
              <Button onClick={handleResolve}>
                Resolve
              </Button>
            )}
            {selectedAlert?.status === 'resolved' && (
              <Button disabled>
                Resolved
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
