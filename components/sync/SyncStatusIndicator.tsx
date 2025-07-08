import { useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSyncStatus, SyncStatus } from "@/hooks/useSyncStatus";
import { ClockIcon, CheckIcon, AlertTriangleIcon, RefreshCwIcon, StopCircleIcon, PlayIcon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

/**
 * Formats a date string as a relative time (e.g., "2 minutes ago")
 */
const formatRelativeTime = (dateStr: string) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch (e) {
    return 'Unknown time';
  }
};

/**
 * Get the appropriate icon and color based on sync status
 */
const getStatusBadge = (status: SyncStatus['status']) => {
  switch (status) {
    case 'pending':
      return { icon: <ClockIcon className="h-4 w-4 mr-1" />, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
    case 'running':
      return { icon: <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />, color: 'bg-blue-100 text-blue-800', label: 'Running' };
    case 'completed':
      return { icon: <CheckIcon className="h-4 w-4 mr-1" />, color: 'bg-green-100 text-green-800', label: 'Completed' };
    case 'failed':
      return { icon: <AlertTriangleIcon className="h-4 w-4 mr-1" />, color: 'bg-red-100 text-red-800', label: 'Failed' };
    default:
      return { icon: <ClockIcon className="h-4 w-4 mr-1" />, color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
  }
};

/**
 * Calculate detailed progress information
 */
const calculateProgressDetails = (sync: SyncStatus) => {
  const details = sync.details || {};
  
  // Calculate individual progress parts
  const merchantsProgress = details.merchants_total 
    ? Math.round((details.merchants_processed || 0) / details.merchants_total * 100) 
    : 0;
    
  const residualsProgress = details.residuals_total 
    ? Math.round((details.residuals_processed || 0) / details.residuals_total * 100) 
    : 0;
  
  // Use the provided progress if available, otherwise calculate it
  const progress = sync.progress ?? Math.round((merchantsProgress + residualsProgress) / 2);
  
  return {
    progress,
    merchantsProgress,
    residualsProgress,
    merchantsTotal: details.merchants_total || 0,
    merchantsProcessed: details.merchants_processed || 0,
    merchantsFailed: details.merchants_failed || 0,
    residualsTotal: details.residuals_total || 0,
    residualsProcessed: details.residuals_processed || 0,
    residualsFailed: details.residuals_failed || 0,
  };
};

interface SyncStatusIndicatorProps {
  compact?: boolean;
  showControls?: boolean;
  className?: string;
}

export function SyncStatusIndicator({ 
  compact = false,
  showControls = true,
  className = ''
}: SyncStatusIndicatorProps) {
  const { 
    currentSync, 
    isLoading, 
    error, 
    startSync, 
    cancelSync, 
    syncHistory 
  } = useSyncStatus();
  
  // Refresh component every 10 seconds to update relative times
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update relative times
      // This is a small component so re-rendering is efficient
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (isLoading) {
    return (
      <Card className={`${className} shadow-sm`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-12">
            <RefreshCwIcon className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={`${className} shadow-sm border-red-200`}>
        <CardContent className="p-4">
          <div className="flex items-center text-red-500 gap-2">
            <AlertTriangleIcon className="h-5 w-5" />
            <span className="text-sm">Error loading sync status</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If no current sync, show last sync info or empty state
  if (!currentSync) {
    const lastSync = syncHistory && syncHistory.length > 0 ? syncHistory[0] : null;
    
    return (
      <Card className={`${className} shadow-sm`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          {lastSync ? (
            <div className="text-sm">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="bg-gray-100">Last Sync</Badge>
                <span className="text-xs text-gray-500">{formatRelativeTime(lastSync.sync_date)}</span>
              </div>
              <div className="flex gap-2 items-center mt-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Merchants:</span> {lastSync.merchants_total}
                </div>
                <div>
                  <span className="font-medium">Residuals:</span> {lastSync.residuals_total}
                </div>
                {lastSync.error_count > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                    {lastSync.error_count} errors
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No sync data available</div>
          )}
        </CardContent>
        {showControls && (
          <CardFooter className="pt-0">
            <Button 
              size="sm" 
              className="gap-1 mt-2" 
              onClick={() => startSync()}
            >
              <PlayIcon className="h-4 w-4" /> 
              Start Sync
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }
  
  // We have an active sync
  const statusBadge = getStatusBadge(currentSync.status);
  const progressInfo = calculateProgressDetails(currentSync);
  const isActive = currentSync.status === 'running' || currentSync.status === 'pending';
  
  if (compact) {
    return (
      <Card className={`${className} shadow-sm ${isActive ? 'border-blue-200' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Badge className={`${statusBadge.color} flex items-center`}>
              {statusBadge.icon}
              <span>{statusBadge.label}</span>
            </Badge>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(currentSync.started_at)}
            </span>
          </div>
          {isActive && (
            <Progress value={progressInfo.progress} className="h-2" />
          )}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`${className} shadow-sm ${isActive ? 'border-blue-200' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Sync Status</CardTitle>
          <Badge className={`${statusBadge.color} flex items-center`}>
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
          </Badge>
        </div>
        <div className="text-xs text-gray-500">
          Started {formatRelativeTime(currentSync.started_at)}
          {currentSync.completed_at && (
            <> • Completed {formatRelativeTime(currentSync.completed_at)}</>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {/* Overall progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Overall Progress</span>
            <span>{progressInfo.progress}%</span>
          </div>
          <Progress value={progressInfo.progress} className="h-2" />
        </div>
        
        {/* Detailed progress */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span>Merchants</span>
              <span>{progressInfo.merchantsProgress}%</span>
            </div>
            <Progress value={progressInfo.merchantsProgress} className="h-1.5" />
            <div className="text-xs mt-1 text-gray-500">
              {progressInfo.merchantsProcessed}/{progressInfo.merchantsTotal}
              {progressInfo.merchantsFailed > 0 && (
                <span className="text-red-500 ml-1">
                  ({progressInfo.merchantsFailed} failed)
                </span>
              )}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span>Residuals</span>
              <span>{progressInfo.residualsProgress}%</span>
            </div>
            <Progress value={progressInfo.residualsProgress} className="h-1.5" />
            <div className="text-xs mt-1 text-gray-500">
              {progressInfo.residualsProcessed}/{progressInfo.residualsTotal}
              {progressInfo.residualsFailed > 0 && (
                <span className="text-red-500 ml-1">
                  ({progressInfo.residualsFailed} failed)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Transaction status if available */}
        {currentSync.details?.transaction_id && (
          <div className="mt-2 text-xs">
            <Badge variant="outline" className="bg-gray-50">
              Transaction: {currentSync.details.transaction_status || 'active'}
            </Badge>
          </div>
        )}
        
        {/* Error message if any */}
        {currentSync.error && (
          <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs">
            {currentSync.error}
          </div>
        )}
      </CardContent>
      
      {showControls && isActive && (
        <CardFooter className="pt-0">
          <Button 
            size="sm" 
            variant="destructive" 
            className="gap-1" 
            onClick={() => cancelSync(currentSync.id)}
          >
            <StopCircleIcon className="h-4 w-4" /> 
            Cancel Sync
          </Button>
        </CardFooter>
      )}
      
      {showControls && !isActive && (
        <CardFooter className="pt-0">
          <Button 
            size="sm" 
            className="gap-1" 
            onClick={() => startSync()}
          >
            <PlayIcon className="h-4 w-4" /> 
            Start New Sync
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
