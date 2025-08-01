-- Create partitioned tables for efficient long-term storage
-- This migration creates archive tables that store historical data separately from active tables

-- Create merchant data archive table
CREATE TABLE IF NOT EXISTS merchant_data_archive (
  LIKE merchant_data INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create yearly partitions starting from April 2024
CREATE TABLE IF NOT EXISTS merchant_data_2024 PARTITION OF merchant_data_archive
  FOR VALUES FROM ('2024-04-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS merchant_data_2025 PARTITION OF merchant_data_archive
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Create residual data archive table
CREATE TABLE IF NOT EXISTS residual_data_archive (
  LIKE residual_data INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create yearly partitions for residuals
CREATE TABLE IF NOT EXISTS residual_data_2024 PARTITION OF residual_data_archive
  FOR VALUES FROM ('2024-04-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS residual_data_2025 PARTITION OF residual_data_archive
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Create transaction volume archive table
CREATE TABLE IF NOT EXISTS merchant_volume_archive (
  LIKE merchant_volume INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create yearly partitions for volumes
CREATE TABLE IF NOT EXISTS merchant_volume_2024 PARTITION OF merchant_volume_archive
  FOR VALUES FROM ('2024-04-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS merchant_volume_2025 PARTITION OF merchant_volume_archive
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Create indexes for historical queries
CREATE INDEX IF NOT EXISTS idx_merchant_archive_date ON merchant_data_archive (created_at, merchant_id);
CREATE INDEX IF NOT EXISTS idx_residual_archive_date ON residual_data_archive (created_at, merchant_id);
CREATE INDEX IF NOT EXISTS idx_volume_archive_date ON merchant_volume_archive (created_at, merchant_id);

-- Create function to archive old data
CREATE OR REPLACE FUNCTION archive_old_data(cutoff_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  table_name TEXT,
  archived_count INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_count INTEGER;
  v_error TEXT;
BEGIN
  -- Use provided cutoff date or default to 3 months ago
  v_cutoff := COALESCE(cutoff_date, now() - INTERVAL '3 months');
  
  -- Archive merchant data
  BEGIN
    INSERT INTO merchant_data_archive
    SELECT * FROM merchant_data 
    WHERE created_at < v_cutoff;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    DELETE FROM merchant_data 
    WHERE created_at < v_cutoff;
    
    table_name := 'merchant_data';
    archived_count := v_count;
    error_message := NULL;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    table_name := 'merchant_data';
    archived_count := 0;
    error_message := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Archive residual data
  BEGIN
    INSERT INTO residual_data_archive
    SELECT * FROM residual_data 
    WHERE created_at < v_cutoff;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    DELETE FROM residual_data 
    WHERE created_at < v_cutoff;
    
    table_name := 'residual_data';
    archived_count := v_count;
    error_message := NULL;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    table_name := 'residual_data';
    archived_count := 0;
    error_message := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Archive volume data
  BEGIN
    INSERT INTO merchant_volume_archive
    SELECT * FROM merchant_volume 
    WHERE created_at < v_cutoff;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    DELETE FROM merchant_volume 
    WHERE created_at < v_cutoff;
    
    table_name := 'merchant_volume';
    archived_count := v_count;
    error_message := NULL;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    table_name := 'merchant_volume';
    archived_count := 0;
    error_message := SQLERRM;
    RETURN NEXT;
  END;
  
  RETURN;
END;
$$;

-- Create function to restore data from archive (for admin use)
CREATE OR REPLACE FUNCTION restore_from_archive(
  p_table_name TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  CASE p_table_name
    WHEN 'merchant_data' THEN
      INSERT INTO merchant_data
      SELECT * FROM merchant_data_archive
      WHERE created_at BETWEEN p_start_date AND p_end_date;
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      
    WHEN 'residual_data' THEN
      INSERT INTO residual_data
      SELECT * FROM residual_data_archive
      WHERE created_at BETWEEN p_start_date AND p_end_date;
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      
    WHEN 'merchant_volume' THEN
      INSERT INTO merchant_volume
      SELECT * FROM merchant_volume_archive
      WHERE created_at BETWEEN p_start_date AND p_end_date;
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      
    ELSE
      RAISE EXCEPTION 'Unknown table name: %', p_table_name;
  END CASE;
  
  RETURN v_count;
END;
$$;

-- Create view to show archive statistics
CREATE OR REPLACE VIEW archive_statistics AS
SELECT 
  'merchant_data' as table_name,
  COUNT(*) as archive_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM merchant_data_archive
UNION ALL
SELECT 
  'residual_data' as table_name,
  COUNT(*) as archive_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM residual_data_archive
UNION ALL
SELECT 
  'merchant_volume' as table_name,
  COUNT(*) as archive_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM merchant_volume_archive;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_data_archive TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON residual_data_archive TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_volume_archive TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_data TO authenticated;
GRANT EXECUTE ON FUNCTION restore_from_archive TO authenticated;
GRANT SELECT ON archive_statistics TO authenticated; 