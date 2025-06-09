-- Create a function that returns aggregated residual data by month
CREATE OR REPLACE FUNCTION get_aggregated_residuals(start_date TEXT)
RETURNS TABLE (
  payout_month TEXT,
  total_profit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', TO_DATE(rp.payout_month, 'YYYY-MM')), 'YYYY-MM') AS payout_month,
    SUM(rp.net_profit) AS total_profit
  FROM 
    residual_payouts rp
  WHERE 
    rp.payout_month >= start_date
  GROUP BY 
    payout_month
  ORDER BY 
    payout_month;
END;
$$ LANGUAGE plpgsql;
