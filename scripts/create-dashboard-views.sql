-- Create views and materialized views to support the dashboard queries
-- This SQL bridges the gap between our actual tables (merchants, residual_payouts, merchant_metrics)
-- and what the dashboard components are expecting

-- Create merchant_data view to provide total volume and transactions
CREATE OR REPLACE VIEW merchant_data AS
SELECT 
  to_char(payout_month, 'YYYY-MM-DD') as month,
  SUM(total_volume) as total_volume,
  SUM(total_transactions) as total_txns
FROM residual_payouts
GROUP BY payout_month;

-- Create master_data_mv materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS master_data_mv AS
SELECT
  m.mid as merchant_id,
  m.name,
  r.payout_month as volume_month,
  r.total_volume as merchant_volume,
  r.net_profit
FROM merchants m
JOIN residual_payouts r ON m.mid = r.mid;

-- Create merchant_volume view for daily volume data
CREATE OR REPLACE VIEW merchant_volume AS
WITH daily_data AS (
  SELECT
    payout_month as volume_date,
    total_volume / EXTRACT(DAY FROM (DATE_TRUNC('MONTH', payout_month) + INTERVAL '1 MONTH - 1 day')) as daily_volume
  FROM residual_payouts
)
SELECT 
  volume_date,
  SUM(daily_volume) as daily_volume
FROM daily_data
GROUP BY volume_date;

-- Create estimated_net_profit view
CREATE OR REPLACE VIEW estimated_net_profit AS
SELECT
  m.mid as merchant_id,
  m.name,
  COALESCE(r.total_volume / NULLIF(r.total_transactions, 0), 0) as bps_last_month,
  COALESCE(mm.projected_volume, r.total_volume) as projected_volume_this_month,
  COALESCE(mm.projected_profit, r.net_profit) as estimated_profit
FROM merchants m
LEFT JOIN residual_payouts r ON m.mid = r.mid
LEFT JOIN merchant_metrics mm ON m.mid = mm.mid
WHERE r.payout_month = (SELECT MAX(payout_month) FROM residual_payouts);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW master_data_mv;
