-- Fix Database Views for Build Compatibility
-- This migration creates the missing views that the application code expects

-- 1. Create merchant_data view with proper structure to match code expectations
DROP VIEW IF EXISTS public.merchant_data CASCADE;
CREATE VIEW public.merchant_data AS
SELECT 
  m.merchant_id as merchant_id,
  m.dba_name as name,
  'ireland_pay_crm' as datasource,
  COALESCE(SUM(r.sales_amount), 0) as total_volume,
  COALESCE(SUM(r.transactions), 0) as total_txns,
  COALESCE(SUM(r.net_profit), 0) as net_profit,
  COALESCE(AVG(r.bps), 0) as bps,
  r.payout_month as month,
  m.created_at,
  m.updated_at
FROM merchants m
LEFT JOIN residual_payouts r ON m.merchant_id = r.mid
GROUP BY m.merchant_id, m.dba_name, r.payout_month, m.created_at, m.updated_at;

-- 2. Create residual_data view to match code expectations
DROP VIEW IF EXISTS public.residual_data CASCADE;
CREATE VIEW public.residual_data AS
SELECT 
  r.mid,
  r.payout_month,
  r.transactions,
  r.sales_amount,
  r.income,
  r.expenses,
  r.net_profit,
  r.bps,
  r.commission_pct as agent_pct,
  r.agent_net,
  r.payout_month as volume_month,
  r.created_at as date_loaded
FROM residual_payouts r;

-- 3. Update master_data view to avoid infinite recursion
DROP VIEW IF EXISTS public.master_data CASCADE;
CREATE VIEW public.master_data AS
SELECT
  m.merchant_id as merchant_id,
  m.dba_name as name,
  r.payout_month as volume_month,
  r.sales_amount as merchant_volume,
  r.net_profit,
  r.transactions as total_txns,
  CASE 
    WHEN r.sales_amount > 0 THEN (r.net_profit / r.sales_amount) * 100
    ELSE 0 
  END as profit_margin,
  EXTRACT(YEAR FROM r.payout_month) as year,
  EXTRACT(MONTH FROM r.payout_month) as month_num
FROM merchants m
JOIN residual_payouts r ON m.merchant_id = r.mid;

-- 4. Create merchant_volume view
DROP VIEW IF EXISTS public.merchant_volume CASCADE;
CREATE VIEW public.merchant_volume AS
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

-- 5. Create estimated_net_profit view
DROP VIEW IF EXISTS public.estimated_net_profit CASCADE;
CREATE VIEW public.estimated_net_profit AS
SELECT
  m.merchant_id as merchant_id,
  m.dba_name as name,
  COALESCE(r.bps, 0) as bps_last_month,
  r.sales_amount as projected_volume_this_month,
  r.net_profit as estimated_profit
FROM merchants m
LEFT JOIN residual_payouts r ON m.merchant_id = r.mid
WHERE r.payout_month = (SELECT MAX(payout_month) FROM residual_payouts);

-- Grant appropriate permissions on views to authenticated users
GRANT SELECT ON public.master_data TO authenticated;
GRANT SELECT ON public.merchant_data TO authenticated;
GRANT SELECT ON public.residual_data TO authenticated;
GRANT SELECT ON public.merchant_volume TO authenticated;
GRANT SELECT ON public.estimated_net_profit TO authenticated;

-- Create indexes for better performance
-- merchants now keyed by id and merchant_id; create appropriate index
CREATE INDEX IF NOT EXISTS idx_merchants_merchant_id ON public.merchants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_residual_payouts_mid ON public.residual_payouts(mid);
CREATE INDEX IF NOT EXISTS idx_residual_payouts_payout_month ON public.residual_payouts(payout_month); 