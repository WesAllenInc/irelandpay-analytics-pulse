-- Setup database schema for Ireland Pay Analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  business_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_categories table
CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id),
  customer_id UUID REFERENCES customers(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  category_id UUID REFERENCES transaction_categories(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id ON transactions(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Insert sample payment methods
INSERT INTO payment_methods (name, description)
VALUES
  ('Credit Card', 'Payment via credit card'),
  ('Debit Card', 'Payment via debit card'),
  ('Bank Transfer', 'Payment via bank transfer'),
  ('PayPal', 'Payment via PayPal'),
  ('Apple Pay', 'Payment via Apple Pay'),
  ('Google Pay', 'Payment via Google Pay')
ON CONFLICT DO NOTHING;

-- Insert sample transaction categories
INSERT INTO transaction_categories (name, description)
VALUES
  ('Retail', 'Retail purchases'),
  ('Food & Beverage', 'Restaurants, cafes, and food delivery'),
  ('Travel', 'Airlines, hotels, and travel agencies'),
  ('Entertainment', 'Movies, events, and subscriptions'),
  ('Services', 'Professional and personal services'),
  ('Other', 'Miscellaneous transactions')
ON CONFLICT DO NOTHING;

-- Create a view for transaction analytics
CREATE OR REPLACE VIEW transaction_analytics AS
SELECT
  DATE_TRUNC('day', t.transaction_date) AS date,
  COUNT(t.id) AS transaction_count,
  SUM(t.amount) AS total_amount,
  t.status,
  m.name AS merchant_name,
  pm.name AS payment_method,
  tc.name AS category
FROM transactions t
LEFT JOIN merchants m ON t.merchant_id = m.id
LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
LEFT JOIN transaction_categories tc ON t.category_id = tc.id
GROUP BY
  DATE_TRUNC('day', t.transaction_date),
  t.status,
  m.name,
  pm.name,
  tc.name;

-- Create a function to get daily transaction summary
CREATE OR REPLACE FUNCTION get_daily_transaction_summary(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  date DATE,
  transaction_count BIGINT,
  total_amount NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', t.transaction_date)::DATE,
    COUNT(t.id),
    SUM(t.amount),
    (COUNT(CASE WHEN t.status = 'completed' THEN 1 ELSE NULL END)::NUMERIC / COUNT(t.id)::NUMERIC) * 100
  FROM transactions t
  WHERE t.transaction_date BETWEEN start_date AND end_date
  GROUP BY DATE_TRUNC('day', t.transaction_date)
  ORDER BY DATE_TRUNC('day', t.transaction_date);
END;
$$ LANGUAGE plpgsql;
