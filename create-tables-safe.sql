-- Safe table creation script for Ireland Pay CRM integration
-- This script drops existing tables and creates them fresh

-- Drop existing tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS public.sync_progress CASCADE;
DROP TABLE IF EXISTS public.sync_jobs CASCADE;
DROP TABLE IF EXISTS public.residuals CASCADE;
DROP TABLE IF EXISTS public.merchants CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.api_credentials CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Create agents table first (no dependencies)
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  email text,
  role text DEFAULT 'agent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create merchants table (depends on agents)
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL UNIQUE,
  dba_name text NOT NULL,
  processor text,
  agent_id uuid REFERENCES public.agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create residuals table (depends on merchants)
CREATE TABLE public.residuals (
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

-- Create sync_jobs table (no dependencies)
CREATE TABLE public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  triggered_by text NOT NULL,
  triggered_by_user_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create sync_progress table (depends on sync_jobs)
CREATE TABLE public.sync_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid REFERENCES public.sync_jobs(id),
  phase text NOT NULL,
  progress integer DEFAULT 0,
  message text,
  details jsonb,
  last_update timestamptz DEFAULT now()
);

-- Create api_credentials table (no dependencies)
CREATE TABLE public.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL UNIQUE,
  api_key text NOT NULL,
  base_url text DEFAULT 'https://crm.ireland-pay.com/api/v1',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles table (depends on auth.users)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'viewer', 'analyst')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  is_active boolean GENERATED ALWAYS AS (revoked_at IS NULL) STORED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX merchants_agent_id_idx ON public.merchants(agent_id);
CREATE INDEX residuals_merchant_id_idx ON public.residuals(merchant_id);
CREATE INDEX residuals_processing_month_idx ON public.residuals(processing_month);
CREATE INDEX sync_jobs_status_idx ON public.sync_jobs(status);
CREATE INDEX sync_jobs_created_at_idx ON public.sync_jobs(created_at DESC);
CREATE INDEX user_roles_active_idx ON public.user_roles(user_id) WHERE revoked_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create basic policies (allow all for now, can be refined later)
CREATE POLICY "Allow all for now" ON public.merchants FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.agents FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.residuals FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.sync_jobs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.sync_progress FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.api_credentials FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.user_roles FOR ALL USING (true);

-- Insert a test record to verify the structure
INSERT INTO public.agents (agent_name, email, role) 
VALUES ('Test Agent', 'test@example.com', 'agent') 
ON CONFLICT DO NOTHING;

-- Verify the structure by selecting from each table
SELECT 'merchants' as table_name, COUNT(*) as record_count FROM public.merchants
UNION ALL
SELECT 'agents' as table_name, COUNT(*) as record_count FROM public.agents
UNION ALL
SELECT 'residuals' as table_name, COUNT(*) as record_count FROM public.residuals
UNION ALL
SELECT 'sync_jobs' as table_name, COUNT(*) as record_count FROM public.sync_jobs
UNION ALL
SELECT 'sync_progress' as table_name, COUNT(*) as record_count FROM public.sync_progress
UNION ALL
SELECT 'api_credentials' as table_name, COUNT(*) as record_count FROM public.api_credentials
UNION ALL
SELECT 'user_roles' as table_name, COUNT(*) as record_count FROM public.user_roles; 