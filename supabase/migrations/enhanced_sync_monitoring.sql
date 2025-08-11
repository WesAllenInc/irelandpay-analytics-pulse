-- Enhanced Sync Monitoring Tables
-- This migration adds comprehensive sync monitoring capabilities

-- Create sync jobs table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL CHECK (sync_type IN ('initial', 'daily', 'manual')),
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  triggered_by text NOT NULL CHECK (triggered_by IN ('schedule', 'manual', 'api')),
  triggered_by_user_id uuid REFERENCES auth.users(id),
  progress jsonb DEFAULT '{}',
  results jsonb DEFAULT '{}',
  error_details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create sync progress table for real-time updates
CREATE TABLE IF NOT EXISTS sync_progress (
  sync_id uuid PRIMARY KEY REFERENCES sync_jobs(id) ON DELETE CASCADE,
  phase text NOT NULL,
  progress numeric(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message text,
  details jsonb DEFAULT '{}',
  last_update timestamp with time zone DEFAULT now()
);

-- Create failed items table for recovery
CREATE TABLE IF NOT EXISTS sync_failed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid REFERENCES sync_jobs(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('merchant', 'transaction', 'residual')),
  item_id text NOT NULL,
  error_details jsonb NOT NULL,
  retry_count integer DEFAULT 0,
  last_retry_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_type ON sync_jobs(sync_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_triggered_by ON sync_jobs(triggered_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_progress_phase ON sync_progress(phase);
CREATE INDEX IF NOT EXISTS idx_sync_failed_items_unresolved ON sync_failed_items(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_failed_items_type ON sync_failed_items(item_type, created_at DESC);

-- Enable RLS
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_failed_items ENABLE ROW LEVEL SECURITY;

-- Only admins can view sync data
CREATE POLICY "Admins can view sync jobs" ON sync_jobs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert sync jobs" ON sync_jobs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update sync jobs" ON sync_jobs
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view sync progress" ON sync_progress
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert sync progress" ON sync_progress
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update sync progress" ON sync_progress
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view sync failed items" ON sync_failed_items
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert sync failed items" ON sync_failed_items
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update sync failed items" ON sync_failed_items
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Functions for sync management

-- Function to get sync statistics
CREATE OR REPLACE FUNCTION get_sync_stats(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalSyncs', COUNT(*),
    'successfulSyncs', COUNT(*) FILTER (WHERE status = 'completed'),
    'failedSyncs', COUNT(*) FILTER (WHERE status = 'failed'),
    'averageDuration', AVG(
      EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
    ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL),
    'lastSyncTime', MAX(started_at),
    'successRate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
      END
  ) INTO result
  FROM sync_jobs
  WHERE created_at >= NOW() - INTERVAL '1 day' * days_back;
  
  RETURN result;
END;
$$;

-- Function to get sync performance trends
CREATE OR REPLACE FUNCTION get_sync_performance_trends()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH daily_stats AS (
    SELECT 
      DATE(started_at) as sync_date,
      COUNT(*) as total_syncs,
      COUNT(*) FILTER (WHERE status = 'completed') as successful_syncs,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) FILTER (WHERE status = 'completed') as avg_duration
    FROM sync_jobs
    WHERE started_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(started_at)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', sync_date,
      'totalSyncs', total_syncs,
      'successfulSyncs', successful_syncs,
      'successRate', 
        CASE 
          WHEN total_syncs > 0 THEN 
            ROUND((successful_syncs::numeric / total_syncs::numeric) * 100, 2)
          ELSE 0 
        END,
      'avgDuration', COALESCE(avg_duration, 0)
    )
  ) INTO result
  FROM daily_stats
  ORDER BY sync_date;
  
  RETURN result;
END;
$$;

-- Function to get failed items summary
CREATE OR REPLACE FUNCTION get_failed_items_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'totalFailed', COUNT(*),
    'recovered', COUNT(*) FILTER (WHERE resolved_at IS NOT NULL),
    'pending', COUNT(*) FILTER (WHERE resolved_at IS NULL AND retry_count < 3),
    'permanent', COUNT(*) FILTER (WHERE resolved_at IS NULL AND retry_count >= 3),
    'byType', jsonb_object_agg(
      item_type, 
      COUNT(*) FILTER (WHERE resolved_at IS NULL)
    )
  ) INTO result
  FROM sync_failed_items
  WHERE created_at >= NOW() - INTERVAL '7 days';
  
  RETURN result;
END;
$$;

-- Function to clean up old sync data
CREATE OR REPLACE FUNCTION cleanup_old_sync_data(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete old sync jobs
  DELETE FROM sync_jobs 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete old failed items
  DELETE FROM sync_failed_items 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  RETURN deleted_count;
END;
$$;

-- Create a view for sync dashboard
CREATE OR REPLACE VIEW sync_dashboard_view AS
SELECT 
  sj.id,
  sj.sync_type,
  sj.status,
  sj.started_at,
  sj.completed_at,
  sj.triggered_by,
  sj.results,
  sj.error_details,
  sp.phase,
  sp.progress,
  sp.message,
  sp.details as progress_details,
  CASE 
    WHEN sj.status = 'completed' THEN 
      EXTRACT(EPOCH FROM (sj.completed_at - sj.started_at)) * 1000
    ELSE NULL 
  END as duration_ms
FROM sync_jobs sj
LEFT JOIN sync_progress sp ON sj.id = sp.sync_id
ORDER BY sj.started_at DESC;

-- Grant permissions
GRANT SELECT ON sync_dashboard_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_sync_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sync_performance_trends() TO authenticated;
GRANT EXECUTE ON FUNCTION get_failed_items_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sync_data(integer) TO authenticated; 