-- Create materialized view for agent performance metrics
-- This view will aggregate data needed for the leaderboard page

CREATE MATERIALIZED VIEW IF NOT EXISTS agent_performance_metrics AS
WITH agent_merchant_counts AS (
  SELECT 
    agent_id,
    COUNT(*) as merchant_count
  FROM merchants
  GROUP BY agent_id
),
agent_volume_data AS (
  SELECT 
    m.agent_id,
    mpv.processing_month,
    SUM(mpv.gross_volume) as total_volume
  FROM merchant_processing_volumes mpv
  JOIN merchants m ON mpv.merchant_id = m.id
  GROUP BY m.agent_id, mpv.processing_month
),
agent_residual_data AS (
  SELECT 
    m.agent_id,
    r.processing_month,
    SUM(r.net_residual) as total_net_residual,
    SUM(r.final_residual) as total_final_residual
  FROM residuals r
  JOIN merchants m ON r.merchant_id = m.id
  GROUP BY m.agent_id, r.processing_month
)
SELECT 
  a.id,
  a.agent_name,
  amc.merchant_count,
  avd.processing_month,
  avd.total_volume,
  ard.total_net_residual,
  ard.total_final_residual
FROM agents a
LEFT JOIN agent_merchant_counts amc ON a.id = amc.agent_id
LEFT JOIN agent_volume_data avd ON a.id = avd.agent_id
LEFT JOIN agent_residual_data ard ON a.id = ard.agent_id AND avd.processing_month = ard.processing_month
WHERE avd.processing_month IS NOT NULL;

-- Create index on the materialized view for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_month_agent 
ON agent_performance_metrics(processing_month, id);

-- Create materialized view for detailed merchant performance by agent
-- This view will be used for drill-down views in the admin page

CREATE MATERIALIZED VIEW IF NOT EXISTS merchant_performance_by_agent AS
SELECT 
  m.id as merchant_id,
  m.merchant_name,
  m.agent_id,
  a.agent_name,
  mpv.processing_month,
  mpv.gross_volume,
  r.net_residual,
  r.final_residual,
  r.agent_bps,
  m.status
FROM merchants m
JOIN agents a ON m.agent_id = a.id
LEFT JOIN merchant_processing_volumes mpv ON m.id = mpv.merchant_id
LEFT JOIN residuals r ON m.id = r.merchant_id AND mpv.processing_month = r.processing_month
WHERE mpv.processing_month IS NOT NULL;

-- Create index on the merchant performance view
CREATE INDEX IF NOT EXISTS idx_merchant_performance_agent_month 
ON merchant_performance_by_agent(agent_id, processing_month);

-- Create function to refresh materialized views after sync operations
CREATE OR REPLACE FUNCTION refresh_performance_views() 
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY merchant_performance_by_agent;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically refresh views after data sync
CREATE OR REPLACE FUNCTION trigger_refresh_views() 
RETURNS trigger AS $$
BEGIN
  -- Run the refresh asynchronously to prevent blocking the transaction
  PERFORM pg_notify('refresh_performance_views', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on merchant_processing_volumes table
DROP TRIGGER IF EXISTS refresh_views_trigger_mpv ON merchant_processing_volumes;
CREATE TRIGGER refresh_views_trigger_mpv
AFTER INSERT OR UPDATE OR DELETE ON merchant_processing_volumes
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_views();

-- Create trigger on residuals table
DROP TRIGGER IF EXISTS refresh_views_trigger_residuals ON residuals;
CREATE TRIGGER refresh_views_trigger_residuals
AFTER INSERT OR UPDATE OR DELETE ON residuals
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_views();

-- Create a way to track last refresh time
CREATE TABLE IF NOT EXISTS materialized_view_refreshes (
  view_name TEXT PRIMARY KEY,
  last_refreshed TIMESTAMP WITH TIME ZONE
);

INSERT INTO materialized_view_refreshes (view_name, last_refreshed)
VALUES 
  ('agent_performance_metrics', NOW()),
  ('merchant_performance_by_agent', NOW())
ON CONFLICT (view_name) DO UPDATE 
SET last_refreshed = NOW();

-- Create function to update refresh timestamp
CREATE OR REPLACE FUNCTION update_materialized_view_refresh_time(view_name TEXT) 
RETURNS void AS $$
BEGIN
  INSERT INTO materialized_view_refreshes (view_name, last_refreshed)
  VALUES (view_name, NOW())
  ON CONFLICT (view_name) DO UPDATE 
  SET last_refreshed = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to handle asynchronous refresh via listen/notify
CREATE OR REPLACE FUNCTION handle_refresh_notification() 
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_performance_views();
  PERFORM update_materialized_view_refresh_time('agent_performance_metrics');
  PERFORM update_materialized_view_refresh_time('merchant_performance_by_agent');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger
DROP EVENT TRIGGER IF EXISTS refresh_views_event;
CREATE EVENT TRIGGER refresh_views_event 
ON ddl_command_end
WHEN tag IN ('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE')
EXECUTE FUNCTION handle_refresh_notification();
