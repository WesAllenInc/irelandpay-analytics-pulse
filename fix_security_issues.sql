-- Migration to fix all security issues identified by Supabase linter
-- Date: 2025-06-25

-- 1. Fix SECURITY DEFINER Views
-- Recreate all views without SECURITY DEFINER property

-- Drop and recreate master_data view
DROP VIEW IF EXISTS public.master_data CASCADE;
CREATE VIEW public.master_data AS
SELECT
  m.merchant_id,
  m.dba_name as name,
  mpv.processing_month as volume_month,
  mpv.gross_volume as merchant_volume,
  r.final_residual as net_profit
FROM merchants m
JOIN merchant_processing_volumes mpv ON m.mid = mpv.merchant_mid
JOIN residuals r ON m.mid = r.merchant_mid AND mpv.processing_month = r.processing_month;

-- Drop and recreate merchant_data view
DROP VIEW IF EXISTS public.merchant_data CASCADE;
CREATE VIEW public.merchant_data AS
SELECT 
  to_char(processing_month, 'YYYY-MM-DD') as month,
  SUM(gross_volume) as total_volume
FROM merchant_processing_volumes
GROUP BY processing_month;

-- Drop and recreate merchant_volume view
DROP VIEW IF EXISTS public.merchant_volume CASCADE;
CREATE VIEW public.merchant_volume AS
WITH daily_data AS (
  SELECT
    processing_month as volume_date,
    gross_volume / EXTRACT(DAY FROM (DATE_TRUNC('MONTH', processing_month) + INTERVAL '1 MONTH - 1 day')) as daily_volume
  FROM merchant_processing_volumes
)
SELECT 
  volume_date,
  SUM(daily_volume) as daily_volume
FROM daily_data
GROUP BY volume_date;

-- Drop and recreate estimated_net_profit view
DROP VIEW IF EXISTS public.estimated_net_profit CASCADE;
CREATE VIEW public.estimated_net_profit AS
SELECT
  m.merchant_id,
  m.dba_name as name,
  COALESCE(r.agent_bps, 0) as bps_last_month,
  mpv.gross_volume as projected_volume_this_month,
  r.final_residual as estimated_profit
FROM merchants m
LEFT JOIN residuals r ON m.mid = r.merchant_mid
LEFT JOIN merchant_processing_volumes mpv ON m.mid = mpv.merchant_mid AND r.processing_month = mpv.processing_month
WHERE r.processing_month = (SELECT MAX(processing_month) FROM residuals);

-- 2. Enable RLS on all required tables

-- Enable RLS on agents table
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Enable RLS on merchant_processing_volumes table
ALTER TABLE public.merchant_processing_volumes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on residuals table
ALTER TABLE public.residuals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ingestion_logs table
ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for each table

-- RLS policies for agents table
DROP POLICY IF EXISTS "Allow authenticated users to select from agents" ON public.agents;
CREATE POLICY "Allow authenticated users to select from agents"
  ON public.agents
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage agents" ON public.agents;
CREATE POLICY "Allow admins to manage agents"
  ON public.agents
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

-- RLS policies for merchant_processing_volumes table
DROP POLICY IF EXISTS "Allow authenticated users to select from merchant_processing_volumes" ON public.merchant_processing_volumes;
CREATE POLICY "Allow authenticated users to select from merchant_processing_volumes"
  ON public.merchant_processing_volumes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage merchant_processing_volumes" ON public.merchant_processing_volumes;
CREATE POLICY "Allow admins to manage merchant_processing_volumes"
  ON public.merchant_processing_volumes
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Agent can only access their merchant's processing volumes
DROP POLICY IF EXISTS "Agents can access their merchants' processing volumes" ON public.merchant_processing_volumes;
CREATE POLICY "Agents can access their merchants' processing volumes"
  ON public.merchant_processing_volumes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants m
      JOIN agents a ON m.agent_id = a.aid
      JOIN auth.users u ON a.aid = u.agent_aid
      WHERE m.mid = merchant_processing_volumes.merchant_mid
      AND u.id = auth.uid()
      AND u.role = 'agent'
    )
  );

-- RLS policies for residuals table
DROP POLICY IF EXISTS "Allow authenticated users to select from residuals" ON public.residuals;
CREATE POLICY "Allow authenticated users to select from residuals"
  ON public.residuals
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow admins to manage residuals" ON public.residuals;
CREATE POLICY "Allow admins to manage residuals"
  ON public.residuals
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Agent can only access their merchant's residuals
DROP POLICY IF EXISTS "Agents can access their merchants' residuals" ON public.residuals;
CREATE POLICY "Agents can access their merchants' residuals"
  ON public.residuals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM merchants m
      JOIN agents a ON m.agent_id = a.aid
      JOIN auth.users u ON a.aid = u.agent_aid
      WHERE m.mid = residuals.merchant_mid
      AND u.id = auth.uid()
      AND u.role = 'agent'
    )
  );

-- RLS policies for ingestion_logs table
DROP POLICY IF EXISTS "Allow admins to access ingestion_logs" ON public.ingestion_logs;
CREATE POLICY "Allow admins to access ingestion_logs"
  ON public.ingestion_logs
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

-- 4. Grant appropriate permissions on views to authenticated users
GRANT SELECT ON public.master_data TO authenticated;
GRANT SELECT ON public.merchant_data TO authenticated;
GRANT SELECT ON public.merchant_volume TO authenticated;
GRANT SELECT ON public.estimated_net_profit TO authenticated;
