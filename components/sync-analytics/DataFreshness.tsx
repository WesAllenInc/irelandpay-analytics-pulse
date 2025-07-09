import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDataFreshness, DataFreshnessInfo } from '@/hooks/useDataFreshness';
import { Skeleton } from '@/components/ui/skeleton';
import { ClockIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const getFreshnessLevel = (minutes: number): 'fresh' | 'warning' | 'stale' => {
  if (minutes < 60) return 'fresh'; // Less than 1 hour
  if (minutes < 360) return 'warning'; // Less than 6 hours
  return 'stale'; // More than 6 hours
};

const formatTimeAgo = (date: string | null): string => {
  if (!date) return 'Never';
  
  const now = new Date();
  const syncDate = new Date(date);
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
};

interface FreshnessItemProps {
  title: string;
  lastSync: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const FreshnessItem: React.FC<FreshnessItemProps> = ({ 
  title, 
  lastSync,
  onRefresh,
  isRefreshing = false
}) => {
  const formattedTime = formatTimeAgo(lastSync);
  const minutes = lastSync ? 
    Math.floor((new Date().getTime() - new Date(lastSync).getTime()) / 60000) : 
    Number.MAX_SAFE_INTEGER;
  const level = getFreshnessLevel(minutes);
  
  const badgeVariants = {
    fresh: 'bg-green-100 text-green-800 hover:bg-green-100',
    warning: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    stale: 'bg-red-100 text-red-800 hover:bg-red-100',
  };
  
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <ClockIcon className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {formattedTime}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn(badgeVariants[level])}>
          {level === 'fresh' ? 'Fresh' : level === 'warning' ? 'Aging' : 'Stale'}
        </Badge>
        {onRefresh && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8" 
            onClick={onRefresh} 
            disabled={isRefreshing}
          >
            <RefreshCwIcon className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        )}
      </div>
    </div>
  );
};

export const DataFreshness: React.FC = () => {
  const { freshness, isLoading, triggerSync } = useDataFreshness();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Data Freshness</CardTitle>
        <CardDescription>
          Last sync times for different data types
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : freshness.length === 0 ? (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertDescription>
              No sync data available yet. Trigger a sync to update data.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-1">
            {freshness.map((item: DataFreshnessInfo) => (
              <FreshnessItem
                key={item.data_type}
                title={item.data_type}
                lastSync={item.last_sync_at}
                onRefresh={() => triggerSync(item.data_type)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataFreshness;
