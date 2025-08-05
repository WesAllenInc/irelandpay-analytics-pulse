'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface SyncHistoryItem {
  id: string;
  timestamp: Date;
  status: 'completed' | 'failed' | 'in_progress';
  duration: number;
  merchantsProcessed: number;
  merchantsFailed: number;
  residualsProcessed: number;
  residualsFailed: number;
  error?: string;
}

interface SyncHistoryProps {
  history?: SyncHistoryItem[];
}

export function SyncHistory({ history = [] }: SyncHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  // Mock data for demonstration
  const mockHistory: SyncHistoryItem[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'completed',
      duration: 45,
      merchantsProcessed: 150,
      merchantsFailed: 2,
      residualsProcessed: 500,
      residualsFailed: 5
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
      status: 'failed',
      duration: 12,
      merchantsProcessed: 45,
      merchantsFailed: 15,
      residualsProcessed: 120,
      residualsFailed: 45,
      error: 'API timeout - connection lost'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
      status: 'completed',
      duration: 38,
      merchantsProcessed: 148,
      merchantsFailed: 1,
      residualsProcessed: 495,
      residualsFailed: 3
    }
  ];

  const displayHistory = showAll ? mockHistory : mockHistory.slice(0, 3);

  const getStatusIcon = (status: SyncHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: SyncHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const calculateSuccessRate = (processed: number, failed: number) => {
    const total = processed + failed;
    if (total === 0) return 100;
    return Math.round((processed / total) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Sync History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sync history available</p>
            <p className="text-sm">Start your first sync to see history here</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(item.duration)}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">Merchants</p>
                      <p className="text-lg font-bold text-blue-600">
                        {item.merchantsProcessed}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calculateSuccessRate(item.merchantsProcessed, item.merchantsFailed)}% success
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium">Residuals</p>
                      <p className="text-lg font-bold text-green-600">
                        {item.residualsProcessed}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calculateSuccessRate(item.residualsProcessed, item.residualsFailed)}% success
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium">Failed</p>
                      <p className="text-lg font-bold text-red-600">
                        {item.merchantsFailed + item.residualsFailed}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total failures
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatDuration(item.duration)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total time
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {item.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Error:</strong> {item.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Show More/Less Button */}
            {mockHistory.length > 3 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll ? 'Show Less' : `Show ${mockHistory.length - 3} More`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 