import React from 'react';
import { useDataFreshness, getFreshnessDescription, getFreshnessColorClass, DataFreshnessInfo } from '@/hooks/useDataFreshness';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface DataFreshnessIndicatorProps {
  tableName?: string; // Optional: filter to specific table
  showHeader?: boolean;
  showCard?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DataFreshnessIndicator({
  tableName,
  showHeader = true,
  showCard = true,
  size = 'md',
  className
}: DataFreshnessIndicatorProps) {
  const { freshness, isLoading, error, refresh } = useDataFreshness();
  
  // Filter data if tableName is provided
  const freshnessData = tableName 
    ? freshness.filter(item => item.data_type === tableName)
    : freshness;
    
  const getFreshnessIcon = (status: string) => {
    switch (status) {
      case 'fresh':
        return <Badge className="bg-green-500">Fresh</Badge>;
      case 'recent':
        return <Badge className="bg-blue-500">Recent</Badge>;
      case 'aging':
        return <Badge className="bg-amber-500">Aging</Badge>;
      case 'stale':
        return <Badge className="bg-red-500">Stale</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };
  
  const getTimeDisplay = (item: DataFreshnessInfo) => {
    try {
      return (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(item.last_sync_at || ''), { addSuffix: true })}</span>
        </div>
      );
    } catch (e) {
      return <span>Unknown</span>;
    }
  };
  
  const renderFreshnessItem = (item: DataFreshnessInfo) => {
    const colorClass = getFreshnessColorClass(item.status);
    
    return (
      <div 
        key={item.data_type}
        className="flex justify-between items-center py-2 border-b last:border-0"
      >
        <div>
          <p className="font-medium capitalize">
            {item.data_type}
          </p>
          <p className={cn("text-xs", colorClass)}>
            {item.last_sync_at ? getFreshnessDescription((Date.now() - new Date(item.last_sync_at).getTime()) / (1000 * 60 * 60)) : 'Never updated'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getFreshnessIcon(item.status)}
          {size !== 'sm' && getTimeDisplay(item)}
        </div>
      </div>
    );
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-4">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-500">Failed to load data freshness information</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => refresh()}
          >
            Try Again
          </Button>
        </div>
      );
    }
    
    if (freshnessData.length === 0) {
      return (
        <p className="text-center text-gray-500 py-4">
          No freshness data available
        </p>
      );
    }
    
    return (
      <div className="space-y-1">
        {freshnessData.map(renderFreshnessItem)}
      </div>
    );
  };
  
  const content = renderContent();
  
  if (!showCard) {
    return content;
  }
  
  return (
    <Card className={cn("w-full", className)}>
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Data Freshness</CardTitle>
              <CardDescription>Last data synchronization status</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refresh()} title="Refresh">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {content}
      </CardContent>
      {size === 'lg' && (
        <CardFooter className="pt-0">
          <p className="text-xs text-gray-500">
            Data freshness is calculated based on the last synchronization time with IRIS CRM
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
