/**
 * Simplified script to create dashboard views in Supabase
 * 
 * This uses the direct SQL client that's available through the Supabase Dashboard
 * and generates SQL that you can copy and paste into the SQL Editor
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Create a SQL file with all the view creation statements
const viewsSql = `
-- Create merchant_data view to provide total volume and transactions
DROP VIEW IF EXISTS merchant_data;
CREATE VIEW merchant_data AS
SELECT 
  to_char(payout_month, 'YYYY-MM-DD') as month,
  SUM(total_volume) as total_volume,
  SUM(total_transactions) as total_txns
FROM residual_payouts
GROUP BY payout_month;

-- Create master_data_mv materialized view
DROP MATERIALIZED VIEW IF EXISTS master_data_mv;
CREATE MATERIALIZED VIEW master_data_mv AS
SELECT
  m.mid as merchant_id,
  m.name,
  r.payout_month as volume_month,
  r.total_volume as merchant_volume,
  r.net_profit
FROM merchants m
JOIN residual_payouts r ON m.mid = r.mid;

-- Create merchant_volume view for daily volume data
DROP VIEW IF EXISTS merchant_volume;
CREATE VIEW merchant_volume AS
WITH daily_data AS (
  SELECT
    payout_month as volume_date,
    total_volume / EXTRACT(DAY FROM (DATE_TRUNC('MONTH', payout_month) + INTERVAL '1 MONTH - 1 day')) as daily_volume
  FROM residual_payouts
)
SELECT 
  volume_date,
  SUM(daily_volume) as daily_volume
FROM daily_data
GROUP BY volume_date;

-- Create estimated_net_profit view
DROP VIEW IF EXISTS estimated_net_profit;
CREATE VIEW estimated_net_profit AS
SELECT
  m.mid as merchant_id,
  m.name,
  COALESCE(r.total_volume / NULLIF(r.total_transactions, 0), 0) as bps_last_month,
  COALESCE(mm.projected_volume, r.total_volume) as projected_volume_this_month,
  COALESCE(mm.projected_profit, r.net_profit) as estimated_profit
FROM merchants m
LEFT JOIN residual_payouts r ON m.mid = r.mid
LEFT JOIN merchant_metrics mm ON m.mid = mm.mid
WHERE r.payout_month = (SELECT MAX(payout_month) FROM residual_payouts);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW master_data_mv;
`;

// Save the SQL to a file
const outputPath = path.join(__dirname, 'dashboard-views-for-supabase.sql');
fs.writeFileSync(outputPath, viewsSql, 'utf8');

console.log(`\n✅ SQL for dashboard views saved to: ${outputPath}`);
console.log('\nPlease follow these steps to create the views:');
console.log('1. Open the Supabase Dashboard in your browser');
console.log('2. Go to the SQL Editor');
console.log('3. Copy and paste the content from the generated SQL file');
console.log('4. Run the SQL query\n');
console.log('After creating the views, refresh your Next.js application to see the data in your charts.');
