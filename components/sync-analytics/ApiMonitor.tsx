import React from 'react';
import { useApiUsageMonitor, ApiRateLimit, ApiUsageStats } from '@/hooks/useApiUsageMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCcw, AlertCircle, Activity, Timer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiMonitorProps {
  className?: string;
  refreshInterval?: number;
}

export function ApiMonitor({ className, refreshInterval = 300000 }: ApiMonitorProps) {
  const { 
    rateLimits, 
    usageStats, 
    isLoading, 
    error,
    refresh
  } = useApiUsageMonitor(refreshInterval);

  // Group rate limits by service
  const groupedLimits: Record<string, ApiRateLimit[]> = {};
  
  if (rateLimits?.length) {
    rateLimits.forEach(limit => {
      if (!groupedLimits[limit.service]) {
        groupedLimits[limit.service] = [];
      }
      groupedLimits[limit.service].push(limit);
    });
  }

  // Format service name for display
  const formatServiceName = (service: string): string => {
    return service
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>API Usage Monitor</span>
            <Button variant="ghost" size="icon">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>Loading API usage data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>API Usage Monitor</span>
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasRateLimits = Object.keys(groupedLimits).length > 0;
  const services = Object.keys(groupedLimits);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <CardTitle>API Usage Monitor</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh} title="Refresh data">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Monitor API usage and rate limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly API Usage Overview */}
        {usageStats && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Monthly API Usage</h3>
              <span className="text-sm text-muted-foreground">
                {usageStats.monthly_usage.toLocaleString()} / {usageStats.monthly_limit.toLocaleString()} calls
              </span>
            </div>
            <Progress 
              value={usageStats.percentage_used} 
              className="h-2"
              indicatorColor={
                usageStats.percentage_used > 90 ? 'bg-red-500' :
                usageStats.percentage_used > 75 ? 'bg-amber-500' :
                'bg-blue-500'
              }
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Daily: {usageStats.daily_usage.toLocaleString()} calls</span>
              <span>{usageStats.percentage_used.toFixed(1)}% used</span>
            </div>
          </div>
        )}

        {/* Rate Limit Details */}
        {hasRateLimits ? (
          <Tabs defaultValue={services[0]}>
            <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${services.length}, 1fr)` }}>
              {services.map(service => (
                <TabsTrigger key={service} value={service}>
                  {formatServiceName(service)}
                </TabsTrigger>
              ))}
            </TabsList>

            {services.map(service => (
              <TabsContent key={service} value={service} className="space-y-4">
                <div className="space-y-4 mt-2">
                  {groupedLimits[service].map((limit, index) => (
                    <div key={`${limit.service}-${limit.endpoint}-${index}`} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">{limit.endpoint}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {limit.remaining} / {limit.limit}
                          </span>
                          {limit.reset_at && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Timer className="h-3 w-3 mr-1" />
                              {new Date(limit.reset_at).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <Progress 
                        value={(1 - limit.remaining / limit.limit) * 100} 
                        className="h-2"
                        indicatorColor={
                          limit.remaining / limit.limit < 0.1 ? 'bg-red-500' :
                          limit.remaining / limit.limit < 0.25 ? 'bg-amber-500' :
                          'bg-blue-500'
                        }
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No rate limit data available</p>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
              Rate limit information will appear here after API calls are made
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
