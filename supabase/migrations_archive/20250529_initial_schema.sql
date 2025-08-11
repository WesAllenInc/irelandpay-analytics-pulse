-- Create merchant_data table
CREATE TABLE IF NOT EXISTS merchant_data (
  mid TEXT PRIMARY KEY,
  datasource TEXT,
  merchant_dba TEXT,
  total_txns INT,
  total_volume NUMERIC,
  month DATE
);

-- Create residual_data table
CREATE TABLE IF NOT EXISTS residual_data (
  mid TEXT,
  payout_month DATE,
  transactions INT,
  sales_amount NUMERIC,
  income NUMERIC,
  expenses NUMERIC,
  net_profit NUMERIC,
  bps NUMERIC,
  agent_pct NUMERIC,
  agent_net NUMERIC,
  volume_month DATE,
  PRIMARY KEY (mid, payout_month)
);

-- Create materialized view joining the tables
CREATE MATERIALIZED VIEW IF NOT EXISTS master_data AS
SELECT 
  m.mid,
  m.merchant_dba,
  m.datasource,
  m.total_txns AS payout_transactions,
  m.total_volume AS merchant_volume,
  m.month,
  r.payout_month,
  r.transactions,
  r.sales_amount,
  r.income,
  r.expenses,
  r.net_profit,
  r.bps,
  r.agent_pct,
  r.agent_net,
  r.volume_month
FROM merchant_data m
JOIN residual_data r ON m.mid = r.mid AND m.month = r.volume_month;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_master_data()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW master_data;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh materialized view
CREATE TRIGGER refresh_master_data_merchant
AFTER INSERT OR UPDATE OR DELETE ON merchant_data
FOR EACH STATEMENT EXECUTE FUNCTION refresh_master_data();

CREATE TRIGGER refresh_master_data_residual
AFTER INSERT OR UPDATE OR DELETE ON residual_data
FOR EACH STATEMENT EXECUTE FUNCTION refresh_master_data();
