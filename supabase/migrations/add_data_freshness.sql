-- Add data freshness indicators to track when data was last updated
-- This allows the UI to display how fresh/stale data is and when it was last synced

-- Add last_sync_at column to merchants table
ALTER TABLE IF EXISTS public.merchants 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW();

-- Add last_sync_at column to residuals table
ALTER TABLE IF EXISTS public.residuals 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW();

-- Add last_sync_at column to volumes table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'volumes'
  ) THEN
    ALTER TABLE public.volumes ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add last_sync_at column to agents table
ALTER TABLE IF EXISTS public.agents 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ DEFAULT NOW();

-- Create a view to calculate data freshness for each table
CREATE OR REPLACE VIEW public.data_freshness AS
SELECT
  'merchants' AS table_name,
  MAX(last_sync_at) AS last_updated,
  EXTRACT(EPOCH FROM (NOW() - MAX(last_sync_at))) / 3600 AS hours_since_update,
  COUNT(*) AS record_count
FROM
  public.merchants
UNION ALL
SELECT
  'residuals' AS table_name,
  MAX(last_sync_at) AS last_updated,
  EXTRACT(EPOCH FROM (NOW() - MAX(last_sync_at))) / 3600 AS hours_since_update,
  COUNT(*) AS record_count
FROM
  public.residuals
UNION ALL
SELECT
  'agents' AS table_name,
  MAX(last_sync_at) AS last_updated,
  EXTRACT(EPOCH FROM (NOW() - MAX(last_sync_at))) / 3600 AS hours_since_update,
  COUNT(*) AS record_count
FROM
  public.agents;

-- Create a function to update last_sync_at timestamp for a table
CREATE OR REPLACE FUNCTION public.update_sync_timestamp(p_table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    UPDATE public.%I 
    SET last_sync_at = NOW()
    WHERE TRUE
  ', p_table_name);
END;
$$;

-- Create RPC to get data freshness information
CREATE OR REPLACE FUNCTION public.get_data_freshness()
RETURNS TABLE (
  table_name TEXT,
  last_updated TIMESTAMPTZ,
  hours_since_update FLOAT,
  record_count BIGINT,
  freshness_status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    table_name,
    last_updated,
    hours_since_update,
    record_count,
    CASE
      WHEN hours_since_update < 24 THEN 'fresh' -- Less than 1 day
      WHEN hours_since_update < 72 THEN 'recent' -- Less than 3 days
      WHEN hours_since_update < 168 THEN 'aging' -- Less than 7 days
      ELSE 'stale' -- More than 7 days
    END AS freshness_status
  FROM 
    public.data_freshness
  ORDER BY
    hours_since_update ASC;
$$;

-- Add functions to the iriscrm_sync.py file to automatically update last_sync_at
-- Whenever a successful sync operation completes
-- Need to call this from Python, e.g.:
-- supabase.rpc('update_sync_timestamp', {'p_table_name': 'merchants'}).execute()

-- Grant permissions
GRANT SELECT ON public.data_freshness TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_data_freshness TO authenticated;
