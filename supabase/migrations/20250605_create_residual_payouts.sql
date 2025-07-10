-- Standard SQL Settings
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

-- Create residual_payouts table
CREATE TABLE IF NOT EXISTS public.residual_payouts (
  id BIGSERIAL PRIMARY KEY,
  mid TEXT NOT NULL REFERENCES public.merchants(mid),
  merchant_dba TEXT NOT NULL,
  payout_month DATE NOT NULL,
  transactions INTEGER NOT NULL DEFAULT 0,
  sales_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  income NUMERIC(14,2) NOT NULL DEFAULT 0,
  expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
  bps NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  agent_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  source_file TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint on mid and payout_month
ALTER TABLE public.residual_payouts ADD CONSTRAINT residual_payouts_mid_payout_month_key UNIQUE (mid, payout_month);

-- Enable Row Level Security
ALTER TABLE public.residual_payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to select from residual_payouts"
  ON public.residual_payouts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert into residual_payouts"
  ON public.residual_payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update residual_payouts"
  ON public.residual_payouts
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete from residual_payouts"
  ON public.residual_payouts
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');
