
-- Create merchant_data view to provide total volume and transactions
-- First check if it exists as a table and drop it if needed
DROP TABLE IF EXISTS merchant_data;
DROP VIEW IF EXISTS merchant_data;
CREATE VIEW merchant_data AS
SELECT 
  to_char(payout_month, 'YYYY-MM-DD') as month,
  SUM(sales_amount) as total_volume,
  SUM(transactions) as total_txns
FROM residual_payouts
GROUP BY payout_month;

-- Create master_data_mv materialized view
DROP TABLE IF EXISTS master_data_mv;
DROP MATERIALIZED VIEW IF EXISTS master_data_mv;
CREATE MATERIALIZED VIEW master_data_mv AS
SELECT
  m.mid as merchant_id,
  m.merchant_dba as name,
  r.payout_month as volume_month,
  r.sales_amount as merchant_volume,
  r.net_profit
FROM merchants m
JOIN residual_payouts r ON m.mid = r.mid;

-- Create merchant_volume view for daily volume data
DROP TABLE IF EXISTS merchant_volume;
DROP VIEW IF EXISTS merchant_volume;
CREATE VIEW merchant_volume AS
WITH daily_data AS (
  SELECT
    payout_month as volume_date,
    sales_amount / EXTRACT(DAY FROM (DATE_TRUNC('MONTH', payout_month) + INTERVAL '1 MONTH - 1 day')) as daily_volume
  FROM residual_payouts
)
SELECT 
  volume_date,
  SUM(daily_volume) as daily_volume
FROM daily_data
GROUP BY volume_date;

-- Create estimated_net_profit view
DROP TABLE IF EXISTS estimated_net_profit;
DROP VIEW IF EXISTS estimated_net_profit;
CREATE VIEW estimated_net_profit AS
SELECT
  m.mid as merchant_id,
  m.merchant_dba as name,
  COALESCE(r.bps, 0) as bps_last_month,
  r.sales_amount as projected_volume_this_month,
  r.net_profit as estimated_profit
FROM merchants m
LEFT JOIN residual_payouts r ON m.mid = r.mid
WHERE r.payout_month = (SELECT MAX(payout_month) FROM residual_payouts);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW master_data_mv;
