-- Schema setup for Ireland Pay Analytics Pulse
-- This SQL creates all the necessary tables for the application

-- Create merchants table
CREATE TABLE IF NOT EXISTS public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL UNIQUE,
  dba_name text NOT NULL,
  processor text,
  agent_id uuid REFERENCES public.agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  email text,
  role text DEFAULT 'agent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create residuals table
CREATE TABLE IF NOT EXISTS public.residuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id),
  processing_month date NOT NULL,
  net_residual numeric,
  fees_deducted numeric,
  final_residual numeric,
  office_bps numeric,
  agent_bps numeric,
  processor_residual numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (merchant_id, processing_month)
);

-- Create merchant_processing_volumes table
CREATE TABLE IF NOT EXISTS public.merchant_processing_volumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id),
  processing_month date NOT NULL,
  gross_volume numeric,
  transaction_count integer,
  avg_ticket numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (merchant_id, processing_month)
);

-- Create ingestion_logs table
CREATE TABLE IF NOT EXISTS public.ingestion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text NOT NULL,
  status text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  rows_success integer NOT NULL DEFAULT 0,
  rows_failed integer NOT NULL DEFAULT 0,
  error_log jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create monthly_forecasts table (optional for future use)
CREATE TABLE IF NOT EXISTS public.monthly_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id),
  processing_month date NOT NULL,
  forecasted_volume numeric,
  forecasted_residual numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (merchant_id, processing_month)
);

-- Create profit_leakage table (optional for future use)
CREATE TABLE IF NOT EXISTS public.profit_leakage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id),
  processing_month date NOT NULL,
  leakage_amount numeric,
  leakage_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table for authentication and role management
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'agent',
  agent_id uuid REFERENCES public.agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS merchants_agent_id_idx ON public.merchants(agent_id);
CREATE INDEX IF NOT EXISTS residuals_merchant_id_idx ON public.residuals(merchant_id);
CREATE INDEX IF NOT EXISTS residuals_processing_month_idx ON public.residuals(processing_month);
CREATE INDEX IF NOT EXISTS volumes_merchant_id_idx ON public.merchant_processing_volumes(merchant_id);
CREATE INDEX IF NOT EXISTS volumes_processing_month_idx ON public.merchant_processing_volumes(processing_month);
