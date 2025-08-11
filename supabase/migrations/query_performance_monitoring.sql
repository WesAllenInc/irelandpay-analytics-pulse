-- Query Performance Monitoring
-- This migration adds tools to analyze and monitor database query performance

-- 1. Create a view to track slow queries (requires pg_stat_statements extension)
-- Note: pg_stat_statements must be enabled by Supabase admin
CREATE OR REPLACE VIEW public.slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    min_exec_time,
    max_exec_time,
    mean_exec_time,
    stddev_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_dirtied,
    shared_blks_written,
    local_blks_hit,
    local_blks_read,
    local_blks_dirtied,
    local_blks_written,
    temp_blks_read,
    temp_blks_written
FROM 
    pg_stat_statements
WHERE 
    mean_exec_time > 100  -- Queries taking more than 100ms on average
ORDER BY 
    total_exec_time DESC
LIMIT 100;

-- 2. Create a view to monitor table statistics and identify potential issues
CREATE OR REPLACE VIEW public.table_stats AS
SELECT
    schemaname,
    relname as table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_tup_hot_upd,
    n_live_tup,
    n_dead_tup,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count,
    CASE 
        WHEN idx_scan = 0 AND seq_scan > 0 THEN 'No index scans - check indexes'
        WHEN n_dead_tup > n_live_tup * 0.2 THEN 'High dead tuples - needs vacuum'
        WHEN seq_scan > idx_scan * 10 AND seq_scan > 1000 THEN 'High sequential scans - missing indexes?'
        ELSE 'OK'
    END as status
FROM 
    pg_stat_user_tables
ORDER BY 
    (n_dead_tup::float / NULLIF(n_live_tup, 0)) DESC NULLS LAST,
    seq_scan DESC;

-- 3. Create a function to identify missing indexes
CREATE OR REPLACE FUNCTION public.identify_missing_indexes()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    column_names TEXT,
    seq_scans BIGINT,
    table_size TEXT,
    recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname::TEXT AS schema_name,
        relname::TEXT AS table_name,
        array_to_string(array_agg(attname), ', ') AS column_names,
        max(seq_scan) AS seq_scans,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || relname)) AS table_size,
        'Consider adding index on (' || array_to_string(array_agg(attname), ', ') || ')' AS recommendation
    FROM
        pg_stat_user_tables
    JOIN
        pg_attribute ON pg_attribute.attrelid = pg_stat_user_tables.relid
    WHERE
        -- Only tables with significant sequential scans
        seq_scan > 100
        -- Only look at columns that might benefit from indexes
        AND attnum > 0
        AND NOT attisdropped
        -- Foreign key columns, ID columns, and other likely candidates
        AND (
            attname LIKE '%\_id' OR
            attname = 'id' OR
            attname IN ('external_id', 'merchant_id', 'agent_id', 'year', 'month', 'status')
        )
        -- Exclude columns that already have indexes
        AND NOT EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = pg_attribute.attrelid AND a.attnum = pg_attribute.attnum
        )
    GROUP BY
        schemaname, relname
    ORDER BY
        seq_scans DESC;
END;
$$;

-- 4. Create a function to reset query statistics
-- This is useful after making schema or index changes to get fresh statistics
CREATE OR REPLACE FUNCTION public.reset_query_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset query statistics if pg_stat_statements is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    ) THEN
        PERFORM pg_stat_statements_reset();
    END IF;
    
    -- Reset table statistics
    PERFORM pg_stat_reset();
END;
$$;

-- 5. Create a function to analyze sync query patterns and provide recommendations
CREATE OR REPLACE FUNCTION public.analyze_sync_performance()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_merchants_count INTEGER;
    v_residuals_count INTEGER;
    v_avg_sync_time NUMERIC;
    v_last_sync_time TIMESTAMPTZ;
    v_recommendations TEXT[];
BEGIN
    -- Get merchant count
    SELECT COUNT(*) INTO v_merchants_count FROM public.merchants;
    
    -- Get residuals count
    SELECT COUNT(*) INTO v_residuals_count FROM public.residuals;
    
    -- Get average sync time
    SELECT 
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))),
        MAX(completed_at)
    INTO 
        v_avg_sync_time, v_last_sync_time
    FROM 
        public.sync_status
    WHERE 
        status = 'completed'
        AND completed_at IS NOT NULL
        AND started_at IS NOT NULL;

    -- Generate recommendations based on statistics
    v_recommendations := ARRAY[]::TEXT[];
    
    -- Check if data size is large
    IF v_merchants_count > 10000 OR v_residuals_count > 100000 THEN
        v_recommendations := v_recommendations || 'Consider implementing incremental sync to reduce sync time';
    END IF;
    
    -- Check if sync takes too long
    IF v_avg_sync_time > 300 THEN  -- More than 5 minutes
        v_recommendations := v_recommendations || 'Sync operations are taking longer than 5 minutes on average - analyze and optimize';
    END IF;
    
    -- Check if we have indexes on the right columns
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        JOIN pg_class c ON c.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'merchants' AND a.attname = 'external_id'
    ) THEN
        v_recommendations := v_recommendations || 'Add index on merchants.external_id to speed up sync operations';
    END IF;

    -- Build the result JSON
    SELECT json_build_object(
        'merchants_count', v_merchants_count,
        'residuals_count', v_residuals_count,
        'average_sync_time_seconds', v_avg_sync_time,
        'last_sync_completed_at', v_last_sync_time,
        'recommendations', v_recommendations
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 6. Grant appropriate permissions for authenticated users
GRANT SELECT ON public.table_stats TO authenticated;
GRANT SELECT ON public.slow_queries TO authenticated;
GRANT EXECUTE ON FUNCTION public.identify_missing_indexes TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_sync_performance TO authenticated;
