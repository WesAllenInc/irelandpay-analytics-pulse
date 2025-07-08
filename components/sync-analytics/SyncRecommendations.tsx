import React from 'react';
import { SyncPerformanceAnalysis } from '@/hooks/useSyncAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Database, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SyncRecommendationsProps {
  performanceAnalysis: SyncPerformanceAnalysis | null;
}

export function SyncRecommendations({ 
  performanceAnalysis 
}: SyncRecommendationsProps) {
  if (!performanceAnalysis) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No recommendations available</p>
      </div>
    );
  }

  const hasRecommendations = performanceAnalysis.recommendations && 
                             performanceAnalysis.recommendations.length > 0;

  // Generate automatic recommendations based on data metrics
  const automaticRecommendations = [];
  
  // Check if the average sync time is concerning
  if (performanceAnalysis.average_sync_time_seconds > 300) {
    automaticRecommendations.push({
      title: "Long Sync Time",
      description: "Syncs are taking longer than 5 minutes on average. Consider implementing incremental sync or optimizing database indexes.",
      priority: "high"
    });
  }

  // Check merchant count for scale considerations
  if (performanceAnalysis.merchants_count > 10000) {
    automaticRecommendations.push({
      title: "Large Dataset",
      description: "Your merchant dataset is large (10,000+ records). Consider implementing data partitioning or archiving older data.",
      priority: "medium"
    });
  }
  
  // Check residuals count for scale considerations
  if (performanceAnalysis.residuals_count > 100000) {
    automaticRecommendations.push({
      title: "Large Residuals Dataset",
      description: "Your residuals dataset is large (100,000+ records). Consider partitioning by date or implementing data retention policies.",
      priority: "medium"
    });
  }
  
  // Recommend monitoring if dataset is growing
  if (performanceAnalysis.merchants_count > 5000 || performanceAnalysis.residuals_count > 50000) {
    automaticRecommendations.push({
      title: "Implement Metrics Tracking",
      description: "With your dataset size, it's recommended to set up regular performance monitoring and alerts for sync failures.",
      priority: "low"
    });
  }

  // Map priority to appropriate badge variant
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High Priority</Badge>;
      case "medium":
        return <Badge variant="default">Medium Priority</Badge>;
      default:
        return <Badge variant="outline">Low Priority</Badge>;
    }
  };
  
  // Format last sync time
  const lastSyncTime = performanceAnalysis.last_sync_completed_at
    ? new Date(performanceAnalysis.last_sync_completed_at).toLocaleString()
    : 'No recent sync';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-md">System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Data Volume</span>
              </div>
              <ul className="list-disc list-inside text-sm ml-6 space-y-1">
                <li>
                  <span className="text-muted-foreground">Merchants:</span>{' '}
                  <span className="font-medium">{performanceAnalysis.merchants_count.toLocaleString()}</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Residuals:</span>{' '}
                  <span className="font-medium">{performanceAnalysis.residuals_count.toLocaleString()}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Sync Timing</span>
              </div>
              <ul className="list-disc list-inside text-sm ml-6 space-y-1">
                <li>
                  <span className="text-muted-foreground">Average Duration:</span>{' '}
                  <span className="font-medium">
                    {formatDuration(performanceAnalysis.average_sync_time_seconds)}
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground">Last Completed:</span>{' '}
                  <span className="font-medium">{lastSyncTime}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database-generated recommendations */}
      {hasRecommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Database Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceAnalysis.recommendations.map((recommendation, index) => (
              <Alert key={index} variant="outline" className="bg-amber-50 border-amber-200">
                <AlertDescription>{recommendation}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* System-generated recommendations */}
      {automaticRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              System Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {automaticRecommendations.map((recommendation, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{recommendation.title}</span>
                  {getPriorityBadge(recommendation.priority)}
                </div>
                <p className="text-sm text-muted-foreground">{recommendation.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Display if no recommendations are available */}
      {!hasRecommendations && automaticRecommendations.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
              <h3 className="font-medium text-lg">No Recommendations</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your sync system appears to be running optimally.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to format duration in a human-readable way
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} minutes`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}
