-- Create a function that returns aggregated merchant metrics by month
CREATE OR REPLACE FUNCTION get_aggregated_metrics(start_date TEXT)
RETURNS TABLE (
  month TEXT,
  total_volume NUMERIC,
  total_txns NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', TO_DATE(mm.month, 'YYYY-MM')), 'YYYY-MM') AS month,
    SUM(mm.volume) AS total_volume,
    SUM(mm.transaction_count) AS total_txns
  FROM 
    merchant_metrics mm
  WHERE 
    mm.month >= start_date
  GROUP BY 
    month
  ORDER BY 
    month;
END;
$$ LANGUAGE plpgsql;
