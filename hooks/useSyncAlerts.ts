"use client"

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import useInterval from '@/hooks/useInterval'
import { useToast } from '@/components/ui/use-toast'

export interface SyncAlert {
  id: string
  alert_type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  details: any
  status: 'active' | 'acknowledged' | 'resolved'
  created_at: string
  updated_at: string
  resolved_at: string | null
  acknowledged_by: string | null
  acknowledged_at: string | null
}

export interface AlertsResult {
  alerts: SyncAlert[]
  criticalCount: number
  errorCount: number
  warningCount: number
  infoCount: number
  totalCount: number
  isLoading: boolean
  error: Error | null
  acknowledgeAlert: (alertId: string) => Promise<boolean>
  resolveAlert: (alertId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export interface AlertSubscription {
  id: string
  alert_types: string[]
  min_severity: 'info' | 'warning' | 'error' | 'critical'
  email_notifications: boolean
  in_app_notifications: boolean
}

/**
 * Hook to fetch and manage sync alerts
 * @param refreshInterval - Interval in milliseconds to refresh data (default: 30 seconds)
 * @param showToasts - Whether to show toast notifications for new alerts (default: true)
 */
export function useSyncAlerts(
  refreshInterval: number = 30 * 1000,
  showToasts: boolean = true
): AlertsResult {
  const [alerts, setAlerts] = useState<SyncAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();

  const fetchAlerts = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch active alerts using the RPC function
      const { data: alertData, error: alertError } = await supabase
        .rpc('get_active_alerts', { 
          p_limit: 100,
          p_offset: 0,
          p_min_severity: 'info'
        });

      if (alertError) throw new Error(`Error fetching alerts: ${alertError.message}`);

      if (alertData) {
        // Check for new alerts to show toast notifications
        if (lastFetchTime && showToasts) {
          const newAlerts = alertData.filter(
            alert => new Date(alert.created_at) > lastFetchTime
          );

          // Show toast for new critical and error alerts
          newAlerts
            .filter(alert => ['critical', 'error'].includes(alert.severity))
            .forEach(alert => {
              toast({
                title: alert.title,
                description: alert.message,
                variant: alert.severity === 'critical' ? 'destructive' : 'default',
                duration: 10000,
              });
            });
        }

        setAlerts(alertData);
      }
      
      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Error in useSyncAlerts:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching alerts'));
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('acknowledge_alert', { 
          p_alert_id: alertId,
          p_user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw new Error(`Error acknowledging alert: ${error.message}`);

      if (data) {
        // Refresh the alerts list
        await fetchAlerts();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      return false;
    }
  };

  const resolveAlert = async (alertId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('resolve_alert', { p_alert_id: alertId });

      if (error) throw new Error(`Error resolving alert: ${error.message}`);

      if (data) {
        // Refresh the alerts list
        await fetchAlerts();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error resolving alert:', err);
      return false;
    }
  };

  // Calculate counts
  const criticalCount = alerts.filter(alert => alert.severity === 'critical').length;
  const errorCount = alerts.filter(alert => alert.severity === 'error').length;
  const warningCount = alerts.filter(alert => alert.severity === 'warning').length;
  const infoCount = alerts.filter(alert => alert.severity === 'info').length;
  const totalCount = alerts.length;

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up refresh interval
  useInterval(() => {
    fetchAlerts();
  }, refreshInterval);

  return {
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
    refresh: fetchAlerts
  };
}

/**
 * Hook to manage alert subscription preferences for the current user
 */
export function useAlertSubscription() {
  const [subscription, setSubscription] = useState<AlertSubscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const supabase = createSupabaseBrowserClient();

  const fetchSubscription = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch the user's alert subscription
      const { data, error: fetchError } = await supabase
        .from('alert_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "no rows returned" error
        throw new Error(`Error fetching subscription: ${fetchError.message}`);
      }

      setSubscription(data);
    } catch (err) {
      console.error('Error in useAlertSubscription:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching subscription'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubscription = async (
    alertTypes: string[] = ['sync_failure', 'rate_limit', 'data_validation'],
    minSeverity: 'info' | 'warning' | 'error' | 'critical' = 'warning',
    emailNotifications: boolean = true,
    inAppNotifications: boolean = true
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .rpc('set_alert_subscription', {
          p_user_id: user.id,
          p_alert_types: alertTypes,
          p_min_severity: minSeverity,
          p_email_notifications: emailNotifications,
          p_in_app_notifications: inAppNotifications
        });

      if (error) throw new Error(`Error updating subscription: ${error.message}`);

      // Refresh the subscription data
      await fetchSubscription();
      return true;
    } catch (err) {
      console.error('Error updating alert subscription:', err);
      setError(err instanceof Error ? err : new Error('Unknown error updating subscription'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    subscription,
    isLoading,
    error,
    updateSubscription
  };
}
