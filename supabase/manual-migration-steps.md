# Manual Migration Steps for Ireland Pay Analytics Dashboard

Since we're having trouble with the local Supabase instance, follow these steps to apply the migration manually through the Supabase dashboard.

## Step 1: Access the Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select the "irelandpay-dashboard" project
4. Click on "SQL Editor" in the left sidebar

## Step 2: Create the merchant_volume table

```sql
-- Create merchant_volume table for daily sales data
CREATE TABLE IF NOT EXISTS merchant_volume (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id TEXT NOT NULL,
  volume_date DATE NOT NULL,
  daily_volume NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_merchant_id
    FOREIGN KEY (merchant_id)
    REFERENCES merchant_data(mid)
    ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_merchant_volume_date ON merchant_volume (volume_date);
CREATE INDEX IF NOT EXISTS idx_merchant_volume_merchant ON merchant_volume (merchant_id);
```

## Step 3: Create the merchant_profitability table

```sql
-- Create merchant_profitability table for profit projections
CREATE TABLE IF NOT EXISTS merchant_profitability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id TEXT NOT NULL,
  bps_last_month NUMERIC NOT NULL DEFAULT 0,
  projected_volume_this_month NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_merchant_profitability
    FOREIGN KEY (merchant_id)
    REFERENCES merchant_data(mid)
    ON DELETE CASCADE
);
```

## Step 4: Create the estimated_net_profit view

```sql
-- Create estimated_net_profit view
CREATE OR REPLACE VIEW estimated_net_profit AS
SELECT
  m.mid AS merchant_id,
  m.merchant_dba AS name,
  p.bps_last_month,
  p.projected_volume_this_month,
  (p.bps_last_month * p.projected_volume_this_month / 10000.0) AS estimated_profit
FROM
  merchant_profitability p
JOIN
  merchant_data m ON m.mid = p.merchant_id;
```

## Step 5: Create the function to calculate MTD sales and EOM estimates

```sql
-- Create function to calculate MTD sales and EOM estimates
CREATE OR REPLACE FUNCTION calculate_mtd_sales_and_eom_estimate()
RETURNS TABLE (
  mtd_total NUMERIC,
  days_elapsed INTEGER,
  total_days_in_month INTEGER,
  eom_estimate NUMERIC
) AS $$
DECLARE
  current_month DATE := date_trunc('month', CURRENT_DATE);
  days_elapsed INTEGER;
  total_days_in_month INTEGER;
BEGIN
  -- Calculate days elapsed in current month (excluding today)
  days_elapsed := EXTRACT(DAY FROM CURRENT_DATE) - 1;
  
  -- Calculate total days in current month
  total_days_in_month := EXTRACT(DAY FROM 
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date
  );
  
  -- Calculate MTD total
  SELECT COALESCE(SUM(daily_volume), 0) INTO mtd_total
  FROM merchant_volume
  WHERE volume_date >= current_month
    AND volume_date < CURRENT_DATE;
  
  -- Calculate EOM estimate
  IF days_elapsed > 0 THEN
    eom_estimate := (mtd_total / days_elapsed) * total_days_in_month;
  ELSE
    eom_estimate := mtd_total;
  END IF;
  
  RETURN QUERY SELECT mtd_total, days_elapsed, total_days_in_month, eom_estimate;
END;
$$ LANGUAGE plpgsql;
```

## Step 6: Insert sample data for testing

```sql
-- Insert sample data for merchant_volume (adjust merchant_id values to match your existing merchants)
INSERT INTO merchant_volume (merchant_id, volume_date, daily_volume)
SELECT 
  m.mid,
  CURRENT_DATE - (i || ' days')::interval,
  RANDOM() * 10000 + 5000
FROM 
  merchant_data m
CROSS JOIN 
  generate_series(0, 15) AS i
WHERE 
  m.mid IN (SELECT mid FROM merchant_data LIMIT 10);

-- Insert sample data for merchant_profitability
INSERT INTO merchant_profitability (merchant_id, bps_last_month, projected_volume_this_month)
SELECT 
  mid,
  RANDOM() * 150 + 50, -- Random BPS between 50 and 200
  RANDOM() * 300000 + 100000 -- Random projected volume between 100k and 400k
FROM 
  merchant_data
LIMIT 10;
```

## Step 7: Test the function

```sql
-- Test the function
SELECT * FROM calculate_mtd_sales_and_eom_estimate();
```

## Step 8: Start the Next.js development server

After applying all the SQL migrations, start your Next.js development server to see the new charts in action:

```bash
npm run dev
```
