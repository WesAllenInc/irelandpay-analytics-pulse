-- Update database views to work with new Ireland Pay CRM schema
-- This migration creates views that match the new table structure

-- 1. Create merchant_data view with new structure
CREATE OR REPLACE VIEW public.merchant_data AS
SELECT 
  m.merchant_id,
  m.dba_name as name,
  'ireland_pay_crm' as datasource,
  COALESCE(SUM(r.final_residual), 0) as total_volume,
  0 as total_txns, -- Not available in new schema
  COALESCE(SUM(r.net_residual), 0) as net_profit,
  COALESCE(AVG(r.agent_bps), 0) as bps,
  r.processing_month as month,
  m.created_at,
  m.updated_at
FROM merchants m
LEFT JOIN residuals r ON m.id = r.merchant_id
GROUP BY m.merchant_id, m.dba_name, r.processing_month, m.created_at, m.updated_at;

-- 2. Create residual_data view to match code expectations
CREATE OR REPLACE VIEW public.residual_data AS
SELECT 
  m.merchant_id as mid,
  r.processing_month as payout_month,
  0 as transactions, -- Not available in new schema
  r.final_residual as sales_amount,
  r.net_residual as income,
  r.fees_deducted as expenses,
  r.net_residual as net_profit,
  r.agent_bps as bps,
  0 as commission_pct, -- Not available in new schema
  r.agent_bps as agent_net,
  r.processing_month as volume_month,
  r.created_at as date_loaded
FROM residuals r
JOIN merchants m ON r.merchant_id = m.id;

-- 3. Update master_data view to avoid infinite recursion
CREATE OR REPLACE VIEW public.master_data AS
SELECT
  m.merchant_id,
  m.dba_name as name,
  r.processing_month as volume_month,
  r.final_residual as merchant_volume,
  r.net_residual as net_profit,
  0 as total_txns, -- Not available in new schema
  CASE 
    WHEN r.final_residual > 0 THEN (r.net_residual / r.final_residual) * 100
    ELSE 0 
  END as profit_margin,
  EXTRACT(YEAR FROM r.processing_month) as year,
  EXTRACT(MONTH FROM r.processing_month) as month_num
FROM merchants m
JOIN residuals r ON m.id = r.merchant_id;

-- 4. Create merchant_volume view
CREATE OR REPLACE VIEW public.merchant_volume AS
WITH daily_data AS (
  SELECT
    processing_month as volume_date,
    final_residual / EXTRACT(DAY FROM (DATE_TRUNC('MONTH', processing_month) + INTERVAL '1 MONTH - 1 day')) as daily_volume
  FROM residuals
)
SELECT 
  volume_date,
  SUM(daily_volume) as daily_volume
FROM daily_data
GROUP BY volume_date;

-- 5. Create estimated_net_profit view
CREATE OR REPLACE VIEW public.estimated_net_profit AS
SELECT
  m.merchant_id,
  m.dba_name as name,
  COALESCE(r.agent_bps, 0) as bps_last_month,
  r.final_residual as projected_volume_this_month,
  r.net_residual as estimated_profit
FROM merchants m
LEFT JOIN residuals r ON m.id = r.merchant_id
WHERE r.processing_month = (SELECT MAX(processing_month) FROM residuals);

-- Grant appropriate permissions on views to authenticated users
GRANT SELECT ON public.master_data TO authenticated;
GRANT SELECT ON public.merchant_data TO authenticated;
GRANT SELECT ON public.residual_data TO authenticated;
GRANT SELECT ON public.merchant_volume TO authenticated;
GRANT SELECT ON public.estimated_net_profit TO authenticated; 