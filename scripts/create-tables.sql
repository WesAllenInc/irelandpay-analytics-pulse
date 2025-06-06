-- Create Merchants Table
CREATE TABLE IF NOT EXISTS public.merchants (
  mid TEXT NOT NULL PRIMARY KEY,
  merchant_dba TEXT NOT NULL,
  datasource TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.merchants IS 'Merchant information data';

-- Create Residual Payouts Table
CREATE TABLE IF NOT EXISTS public.residual_payouts (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  mid TEXT NOT NULL REFERENCES public.merchants(mid),
  merchant_dba TEXT NOT NULL,
  payout_month DATE NOT NULL,
  transactions INTEGER DEFAULT 0,
  sales_amount NUMERIC(20, 2) DEFAULT 0,
  income NUMERIC(20, 2) DEFAULT 0,
  expenses NUMERIC(20, 2) DEFAULT 0,
  net_profit NUMERIC(20, 2) DEFAULT 0,
  bps NUMERIC(10, 2) DEFAULT 0,
  commission_pct NUMERIC(5, 2) DEFAULT 0,
  agent_net NUMERIC(20, 2) DEFAULT 0,
  source_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (mid, payout_month)
);

COMMENT ON TABLE public.residual_payouts IS 'Merchant monthly residual payment data';

-- Create Merchant Metrics Table
CREATE TABLE IF NOT EXISTS public.merchant_metrics (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  mid TEXT NOT NULL REFERENCES public.merchants(mid),
  merchant_dba TEXT NOT NULL,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  sales_volume NUMERIC(20, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  avg_ticket NUMERIC(20, 2) DEFAULT 0,
  bps NUMERIC(10, 2) DEFAULT 0,
  profit_amount NUMERIC(20, 2) DEFAULT 0,
  source_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (mid, month, year)
);

COMMENT ON TABLE public.merchant_metrics IS 'Monthly merchant performance metrics';
