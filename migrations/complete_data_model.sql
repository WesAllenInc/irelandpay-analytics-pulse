-- Complete the data model for Ireland Pay Analytics

-- Update agents table to add approval_status if not already present
ALTER TABLE agents ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add missing fields to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS commission_rate DECIMAL DEFAULT 0.5;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS default_bps INTEGER DEFAULT 25;

-- Create admin_users table if not exists
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_payout_history table to track payments
CREATE TABLE IF NOT EXISTS agent_payout_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  payout_month DATE NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'paid')),
  approved_by UUID REFERENCES admin_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, payout_month)
);

-- Create agent_forecasts table for forecasting
CREATE TABLE IF NOT EXISTS agent_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  forecast_month DATE NOT NULL,
  forecasted_volume DECIMAL NOT NULL DEFAULT 0,
  forecasted_residual DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, forecast_month)
);

-- Create merchant_forecasts table for merchant-level forecasting
CREATE TABLE IF NOT EXISTS merchant_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mid TEXT NOT NULL REFERENCES merchants(merchant_id),
  forecast_month DATE NOT NULL,
  forecasted_volume DECIMAL NOT NULL DEFAULT 0,
  forecasted_residual DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mid, forecast_month)
);

-- Create reports table to track generated reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('agent_payout', 'merchant_performance', 'residual_summary', 'custom')),
  parameters JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  file_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY,
  dashboard_layout JSONB DEFAULT '{}',
  theme TEXT DEFAULT 'light',
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchants_agent_id ON merchants(agent_id);
CREATE INDEX IF NOT EXISTS idx_merchant_metrics_mid ON merchant_metrics(mid);
CREATE INDEX IF NOT EXISTS idx_merchant_metrics_month ON merchant_metrics(month);
CREATE INDEX IF NOT EXISTS idx_residual_payouts_mid ON residual_payouts(mid);
CREATE INDEX IF NOT EXISTS idx_residual_payouts_payout_month ON residual_payouts(payout_month);
CREATE INDEX IF NOT EXISTS idx_agent_payout_history_agent_id ON agent_payout_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payout_history_payout_month ON agent_payout_history(payout_month);

-- Create view for agent dashboard summary
CREATE OR REPLACE VIEW agent_dashboard_summary AS
SELECT 
  a.id AS agent_id,
  a.agent_name,
  COUNT(DISTINCT m.mid) AS merchant_count,
  COALESCE(SUM(mm.total_volume), 0) AS mtd_volume,
  COALESCE(SUM(rp.net_profit), 0) AS mtd_residual
FROM 
  agents a
LEFT JOIN 
  merchants m ON a.id = m.agent_id
LEFT JOIN 
  merchant_metrics mm ON m.mid = mm.mid AND mm.month = DATE_TRUNC('month', CURRENT_DATE)::DATE
LEFT JOIN 
  residual_payouts rp ON m.mid = rp.mid AND rp.payout_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
GROUP BY 
  a.id, a.agent_name;

-- Create view for admin agent summary
CREATE OR REPLACE VIEW admin_agent_summary AS
SELECT 
  a.id AS agent_id,
  a.agent_name,
  a.email,
  COUNT(DISTINCT m.mid) AS merchant_count,
  COALESCE(SUM(mm.total_volume), 0) AS mtd_volume,
  COALESCE(SUM(rp.net_profit), 0) AS mtd_residual,
  COALESCE(af.forecasted_volume, 0) AS forecasted_volume,
  COALESCE(af.forecasted_residual, 0) AS forecasted_residual
FROM 
  agents a
LEFT JOIN 
  merchants m ON a.id = m.agent_id
LEFT JOIN 
  merchant_metrics mm ON m.mid = mm.mid AND mm.month = DATE_TRUNC('month', CURRENT_DATE)::DATE
LEFT JOIN 
  residual_payouts rp ON m.mid = rp.mid AND rp.payout_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
LEFT JOIN 
  agent_forecasts af ON a.id = af.agent_id AND af.forecast_month = DATE_TRUNC('month', CURRENT_DATE)::DATE
GROUP BY 
  a.id, a.agent_name, a.email, af.forecasted_volume, af.forecasted_residual;

-- Add RLS policies for security
-- Enable RLS on tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE residual_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_payout_history ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Agents can only see their own data
CREATE POLICY agents_view_own_data ON agents
  FOR SELECT
  USING (auth.uid() = id::text);

-- Agents can only see their own merchants
CREATE POLICY merchants_view_own ON merchants
  FOR SELECT
  USING (agent_id::text = auth.uid() OR 
         EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));

-- Admin users can see all data
CREATE POLICY admin_view_all ON merchants
  FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));

CREATE POLICY admin_view_all_metrics ON merchant_metrics
  FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));

CREATE POLICY admin_view_all_residuals ON residual_payouts
  FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));

-- Agents can only see metrics for their merchants
CREATE POLICY metrics_view_own ON merchant_metrics
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM merchants m
    WHERE m.mid = merchant_metrics.mid
    AND m.agent_id::text = auth.uid()
  ));

-- Agents can only see residuals for their merchants
CREATE POLICY residuals_view_own ON residual_payouts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM merchants m
    WHERE m.mid = residual_payouts.mid
    AND m.agent_id::text = auth.uid()
  ));
