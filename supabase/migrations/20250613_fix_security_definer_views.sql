-- Fix SECURITY DEFINER Views
-- These views will be recreated without SECURITY DEFINER property

-- 1. Drop and recreate master_data view (if it exists as a view, not materialized view)
DROP VIEW IF EXISTS public.master_data CASCADE;
CREATE VIEW public.master_data AS
SELECT
  m.mid as merchant_id,
  m.merchant_dba as name,
  r.payout_month as volume_month,
  r.sales_amount as merchant_volume,
  r.net_profit
FROM merchants m
JOIN residual_payouts r ON m.mid = r.mid;

-- 2. Drop and recreate merchant_data view with proper structure
DROP VIEW IF EXISTS public.merchant_data CASCADE;
CREATE VIEW public.merchant_data AS
SELECT 
  m.mid,
  m.merchant_dba,
  m.datasource,
  COALESCE(SUM(r.transactions), 0) as total_txns,
  COALESCE(SUM(r.sales_amount), 0) as total_volume,
  r.payout_month as month,
  m.created_at,
  m.updated_at
FROM merchants m
LEFT JOIN residual_payouts r ON m.mid = r.mid
GROUP BY m.mid, m.merchant_dba, m.datasource, r.payout_month, m.created_at, m.updated_at;

-- 3. Create residual_data view to match code expectations
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

-- 4. Drop and recreate merchant_volume view
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

-- 5. Drop and recreate estimated_net_profit view
DROP VIEW IF EXISTS public.estimated_net_profit CASCADE;
CREATE VIEW public.estimated_net_profit AS
SELECT
  m.mid as merchant_id,
  m.merchant_dba as name,
  COALESCE(r.bps, 0) as bps_last_month,
  r.sales_amount as projected_volume_this_month,
  r.net_profit as estimated_profit
FROM merchants m
LEFT JOIN residual_payouts r ON m.mid = r.mid
WHERE r.payout_month = (SELECT MAX(payout_month) FROM residual_payouts);

-- Enable RLS on residual_payouts table
ALTER TABLE public.residual_payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for residual_payouts (if they don't exist)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to select from residual_payouts" ON public.residual_payouts;
DROP POLICY IF EXISTS "Allow authenticated users to insert into residual_payouts" ON public.residual_payouts;
DROP POLICY IF EXISTS "Allow authenticated users to update residual_payouts" ON public.residual_payouts;
DROP POLICY IF EXISTS "Allow authenticated users to delete from residual_payouts" ON public.residual_payouts;

-- Create new policies
CREATE POLICY "Allow authenticated users to select from residual_payouts"
  ON public.residual_payouts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert into residual_payouts"
  ON public.residual_payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update residual_payouts"
  ON public.residual_payouts
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Allow authenticated users to delete from residual_payouts"
  ON public.residual_payouts
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

-- Grant appropriate permissions on views to authenticated users
GRANT SELECT ON public.master_data TO authenticated;
GRANT SELECT ON public.merchant_data TO authenticated;
GRANT SELECT ON public.residual_data TO authenticated;
GRANT SELECT ON public.merchant_volume TO authenticated;
GRANT SELECT ON public.estimated_net_profit TO authenticated;
