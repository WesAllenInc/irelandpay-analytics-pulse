-- Database optimizations for API data patterns
-- This migration adds specialized indexes and partitioning for improved performance

-- 1. Add specialized indexes for sync operations
-- Index for merchant lookup by external ID (IRIS CRM ID)
CREATE INDEX IF NOT EXISTS idx_merchants_external_id ON public.merchants(external_id);

-- Index for residuals by date (year/month)
CREATE INDEX IF NOT EXISTS idx_residuals_year_month ON public.residuals(year, month);

-- Index for frequently accessed merchant data
CREATE INDEX IF NOT EXISTS idx_merchants_common_lookups ON 
  public.merchants(agent_id, status, last_sync_at);

-- Index for frequently accessed residuals data
CREATE INDEX IF NOT EXISTS idx_residuals_common_lookups ON
  public.residuals(merchant_id, status, last_sync_at);

-- 2. Create function for archiving historical data
CREATE OR REPLACE FUNCTION public.archive_old_data(
  p_months_to_keep INTEGER DEFAULT 6,
  p_archive_schema TEXT DEFAULT 'archive'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archive_date DATE := (CURRENT_DATE - (p_months_to_keep || ' MONTH')::INTERVAL);
  v_count_residuals INTEGER := 0;
  v_count_volumes INTEGER := 0;
  v_archive_table_residuals TEXT;
  v_archive_table_volumes TEXT;
  v_result JSON;
BEGIN
  -- Create archive schema if it doesn't exist
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(p_archive_schema);

  -- Calculate archive date
  -- Archive residuals older than specified months
  v_archive_table_residuals := p_archive_schema || '.residuals_archive';

  -- Create archive tables if they don't exist (with same structure as source)
  EXECUTE '
    CREATE TABLE IF NOT EXISTS ' || v_archive_table_residuals || '
    (LIKE public.residuals INCLUDING ALL)
  ';

  -- Move data older than the cutoff to archive
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'residuals'
  ) THEN
    EXECUTE '
      WITH moved_rows AS (
        DELETE FROM public.residuals
        WHERE 
          (year < EXTRACT(YEAR FROM $1) OR 
          (year = EXTRACT(YEAR FROM $1) AND month <= EXTRACT(MONTH FROM $1)))
        RETURNING *
      )
      INSERT INTO ' || v_archive_table_residuals || '
      SELECT * FROM moved_rows
    ' USING v_archive_date;

    -- Get count of moved rows
    GET DIAGNOSTICS v_count_residuals = ROW_COUNT;
  END IF;

  -- Archive volumes data if volumes table exists
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'volumes'
  ) THEN
    v_archive_table_volumes := p_archive_schema || '.volumes_archive';
    
    -- Create archive table for volumes
    EXECUTE '
      CREATE TABLE IF NOT EXISTS ' || v_archive_table_volumes || '
      (LIKE public.volumes INCLUDING ALL)
    ';

    -- Move old volumes data
    EXECUTE '
      WITH moved_rows AS (
        DELETE FROM public.volumes
        WHERE 
          (year < EXTRACT(YEAR FROM $1) OR 
          (year = EXTRACT(YEAR FROM $1) AND month <= EXTRACT(MONTH FROM $1)))
        RETURNING *
      )
      INSERT INTO ' || v_archive_table_volumes || '
      SELECT * FROM moved_rows
    ' USING v_archive_date;

    -- Get count of moved rows
    GET DIAGNOSTICS v_count_volumes = ROW_COUNT;
  END IF;

  -- Create indexes on archive tables
  EXECUTE '
    CREATE INDEX IF NOT EXISTS idx_residuals_archive_year_month
    ON ' || v_archive_table_residuals || '(year, month)
  ';

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = p_archive_schema AND table_name = 'volumes_archive'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_volumes_archive_year_month
      ON ' || v_archive_table_volumes || '(year, month)
    ';
  END IF;

  -- Return result as JSON
  SELECT json_build_object(
    'status', 'success',
    'archive_date', v_archive_date,
    'months_kept', p_months_to_keep,
    'residuals_archived', v_count_residuals,
    'volumes_archived', v_count_volumes,
    'archive_schema', p_archive_schema
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- 3. Create a scheduled job to run archival automatically (monthly)
-- This uses pg_cron extension which needs to be enabled by the Supabase admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- If pg_cron is enabled, create a scheduled job
    PERFORM cron.schedule(
      'archive-old-data-monthly',
      '0 0 1 * *',  -- At midnight on the first day of each month
      $$SELECT public.archive_old_data(6, 'archive')$$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron extension not available, log warning
    RAISE NOTICE 'pg_cron extension not available. Scheduled archival job not created.';
END $$;

-- 4. Create views that combine current and archived data for reporting
CREATE OR REPLACE VIEW public.all_residuals AS
SELECT * FROM public.residuals
UNION ALL
SELECT * FROM archive.residuals_archive;

-- Conditionally create views for volumes if tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'volumes'
  ) AND EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'archive' AND table_name = 'volumes_archive'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.all_volumes AS
      SELECT * FROM public.volumes
      UNION ALL
      SELECT * FROM archive.volumes_archive
    ';
  END IF;
END $$;

-- 5. Create function to optimize tables (analyze for statistics and vacuum)
CREATE OR REPLACE FUNCTION public.optimize_tables()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update statistics for query planner
  ANALYZE public.merchants;
  ANALYZE public.residuals;
  ANALYZE public.agents;
  ANALYZE public.sync_queue;
  
  -- Try to vacuum (cleanup) tables
  EXECUTE 'VACUUM public.merchants';
  EXECUTE 'VACUUM public.residuals';
  EXECUTE 'VACUUM public.agents';
  EXECUTE 'VACUUM public.sync_queue';
  
  -- Also optimize archive tables if they exist
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'archive' AND table_name = 'residuals_archive'
  ) THEN
    EXECUTE 'ANALYZE archive.residuals_archive';
    EXECUTE 'VACUUM archive.residuals_archive';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'archive' AND table_name = 'volumes_archive'
  ) THEN
    EXECUTE 'ANALYZE archive.volumes_archive';
    EXECUTE 'VACUUM archive.volumes_archive';
  END IF;
END;
$$;
