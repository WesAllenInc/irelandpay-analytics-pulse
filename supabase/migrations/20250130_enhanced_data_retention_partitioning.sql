-- Enhanced Data Retention & Archive Strategy
-- This migration implements a comprehensive partitioning system for unlimited historical data storage
-- starting from April 2024 with automatic partition management and performance optimization

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create base partitioned table for merchant data with enhanced structure
CREATE TABLE IF NOT EXISTS merchant_data_partitioned (
  id uuid DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL,
  merchant_name text,
  mid text,
  month date NOT NULL,
  total_transactions integer DEFAULT 0,
  total_volume numeric(15,2) DEFAULT 0,
  avg_ticket numeric(10,2) DEFAULT 0,
  total_fees numeric(15,2) DEFAULT 0,
  net_revenue numeric(15,2) DEFAULT 0,
  data_source text DEFAULT 'ireland_pay_crm',
  sync_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT merchant_data_partitioned_pkey PRIMARY KEY (id, month)
) PARTITION BY RANGE (month);

-- Create indexes on the parent table (inherited by partitions)
CREATE INDEX IF NOT EXISTS idx_merchant_data_partitioned_merchant_id 
  ON merchant_data_partitioned (merchant_id, month DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_data_partitioned_month 
  ON merchant_data_partitioned (month DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_data_partitioned_mid 
  ON merchant_data_partitioned (mid) WHERE mid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_data_partitioned_sync_id 
  ON merchant_data_partitioned (sync_id) WHERE sync_id IS NOT NULL;

-- Create monthly partitions starting from April 2024
DO $$
DECLARE
  start_date date := '2024-04-01';
  end_date date := date_trunc('month', CURRENT_DATE) + interval '1 month';
  curr_date date;
  partition_name text;
  next_month date;
BEGIN
  curr_date := start_date;
  
  WHILE curr_date < end_date LOOP
    partition_name := 'merchant_data_' || to_char(curr_date, 'YYYY_MM');
    next_month := curr_date + interval '1 month';
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF merchant_data_partitioned
       FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      curr_date,
      next_month
    );
    
    curr_date := next_month;
  END LOOP;
END $$;

-- Create function to automatically create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_date date;
  partition_name text;
  start_date date;
  end_date date;
BEGIN
  -- Get the first day of next month
  partition_date := date_trunc('month', CURRENT_DATE) + interval '1 month';
  partition_name := 'merchant_data_' || to_char(partition_date, 'YYYY_MM');
  start_date := partition_date;
  end_date := partition_date + interval '1 month';
  
  -- Check if partition already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF merchant_data_partitioned
       FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date,
      end_date
    );
    
    RAISE NOTICE 'Created partition %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for commonly accessed aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS merchant_monthly_summary AS
SELECT 
  merchant_id,
  merchant_name,
  DATE_TRUNC('month', month) as month,
  SUM(total_transactions) as total_transactions,
  SUM(total_volume) as total_volume,
  AVG(avg_ticket) as avg_ticket,
  SUM(total_fees) as total_fees,
  SUM(net_revenue) as net_revenue,
  COUNT(*) as record_count,
  MAX(updated_at) as last_updated
FROM merchant_data_partitioned
GROUP BY merchant_id, merchant_name, DATE_TRUNC('month', month);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_merchant_monthly_summary_merchant 
  ON merchant_monthly_summary(merchant_id, month DESC);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_summary_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY merchant_monthly_summary;
END;
$$ LANGUAGE plpgsql;

-- Create unified view for easy querying
CREATE OR REPLACE VIEW merchant_data_unified AS
SELECT * FROM merchant_data_partitioned;

-- Create retention statistics functions
CREATE OR REPLACE FUNCTION get_retention_stats()
RETURNS json AS $$
DECLARE
  stats json;
BEGIN
  SELECT json_build_object(
    'total_records', COUNT(*),
    'oldest_record', MIN(month),
    'newest_record', MAX(month),
    'partition_count', (
      SELECT COUNT(*) 
      FROM pg_tables 
      WHERE tablename LIKE 'merchant_data_%'
    ),
    'total_size', pg_size_pretty(
      SUM(pg_table_size(tablename::regclass))
    ),
    'size_by_month', (
      SELECT json_agg(
        json_build_object(
          'month', SUBSTRING(tablename FROM 'merchant_data_(.*)'),
          'size', pg_size_pretty(pg_table_size(tablename::regclass)),
          'record_count', (
            SELECT COUNT(*) 
            FROM merchant_data_partitioned 
            WHERE DATE_TRUNC('month', month) = DATE(SUBSTRING(tablename FROM 'merchant_data_(.*)') || '-01')
          )
        )
      )
      FROM pg_tables 
      WHERE tablename LIKE 'merchant_data_%'
      ORDER BY tablename DESC
      LIMIT 12
    )
  ) INTO stats
  FROM merchant_data_partitioned;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Create function to get partitions for analysis
CREATE OR REPLACE FUNCTION get_partitions_for_analysis()
RETURNS TABLE(name text, last_analyzed timestamp) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename AS name,
    last_analyze
  FROM pg_stat_user_tables
  WHERE tablename LIKE 'merchant_data_%'
    AND (last_analyze IS NULL OR last_analyze < CURRENT_DATE - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Create function to analyze specific partition
CREATE OR REPLACE FUNCTION analyze_partition(partition_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('ANALYZE %I', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Create function to create partition if not exists
CREATE OR REPLACE FUNCTION create_partition_if_not_exists(
  partition_name text,
  start_date date,
  end_date date
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF merchant_data_partitioned
       FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      start_date,
      end_date
    );
    
    RAISE NOTICE 'Created partition %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get partition health
CREATE OR REPLACE FUNCTION get_partition_health()
RETURNS TABLE(
  name text,
  month date,
  record_count bigint,
  size text,
  last_analyzed timestamp,
  healthy boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename as name,
    DATE(SUBSTRING(t.tablename FROM 'merchant_data_(.*)') || '-01') as month,
    COALESCE(p.record_count, 0) as record_count,
    pg_size_pretty(pg_table_size(t.tablename::regclass)) as size,
    t.last_analyze as last_analyzed,
    CASE 
      WHEN t.last_analyze IS NULL OR t.last_analyze < CURRENT_DATE - INTERVAL '7 days' 
      THEN false 
      ELSE true 
    END as healthy
  FROM pg_tables t
  LEFT JOIN (
    SELECT 
      DATE_TRUNC('month', month) as partition_month,
      COUNT(*) as record_count
    FROM merchant_data_partitioned
    GROUP BY DATE_TRUNC('month', month)
  ) p ON DATE(SUBSTRING(t.tablename FROM 'merchant_data_(.*)') || '-01') = p.partition_month
  WHERE t.tablename LIKE 'merchant_data_%'
  ORDER BY t.tablename DESC;
END;
$$ LANGUAGE plpgsql;

-- Schedule partition creation for the 25th of each month
SELECT cron.schedule(
  'create-monthly-partitions',
  '0 0 25 * *',
  'SELECT create_monthly_partition()'
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_data_partitioned TO authenticated;
GRANT SELECT ON merchant_data_unified TO authenticated;
GRANT SELECT ON merchant_monthly_summary TO authenticated;
GRANT EXECUTE ON FUNCTION create_monthly_partition TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_summary_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_retention_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_partitions_for_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_partition TO authenticated;
GRANT EXECUTE ON FUNCTION create_partition_if_not_exists TO authenticated;
GRANT EXECUTE ON FUNCTION get_partition_health TO authenticated; 