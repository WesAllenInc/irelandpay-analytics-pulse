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

-- 2. Drop and recreate merchant_data view
DROP VIEW IF EXISTS public.merchant_data CASCADE;
CREATE VIEW public.merchant_data AS
SELECT 
  to_char(payout_month, 'YYYY-MM-DD') as month,
  SUM(sales_amount) as total_volume,
  SUM(transactions) as total_txns
FROM residual_payouts
GROUP BY payout_month;

-- 3. Drop and recreate merchant_volume view
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

-- 4. Drop and recreate estimated_net_profit view
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
GRANT SELECT ON public.merchant_volume TO authenticated;
GRANT SELECT ON public.estimated_net_profit TO authenticated;
