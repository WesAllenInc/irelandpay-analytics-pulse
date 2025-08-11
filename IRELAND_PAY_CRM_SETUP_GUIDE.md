# Ireland Pay CRM Integration Setup Guide

## Overview

This guide will help you set up the complete database structure and integration for the **Ireland Pay CRM** system. The application syncs data from the Ireland Pay CRM API (`https://crm.ireland-pay.com/api/v1`) to provide analytics and reporting.

## Current Issues Identified

1. **Database Tables Missing**: No tables exist in Supabase
2. **Module Resolution**: Vercel can't resolve `@/lib/supabase/*` imports
3. **Environment Variables**: Fixed - now using correct prefixed variables

## Step-by-Step Solution

### Step 1: Create Database Tables (Manual)

Since automated creation failed, manually create the tables:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/ainmbbtycciukbjjdjtl
2. **Navigate to SQL Editor**
3. **Run this SQL script**:

```sql
-- Create essential tables for Ireland Pay CRM integration
CREATE TABLE IF NOT EXISTS public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id text NOT NULL UNIQUE,
  dba_name text NOT NULL,
  processor text,
  agent_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  email text,
  role text DEFAULT 'agent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.sync_jobs (
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

CREATE TABLE IF NOT EXISTS public.sync_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid REFERENCES public.sync_jobs(id),
  phase text NOT NULL,
  progress integer DEFAULT 0,
  message text,
  details jsonb,
  last_update timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL UNIQUE,
  api_key text NOT NULL,
  base_url text DEFAULT 'https://crm.ireland-pay.com/api/v1',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
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
CREATE INDEX IF NOT EXISTS merchants_agent_id_idx ON public.merchants(agent_id);
CREATE INDEX IF NOT EXISTS residuals_merchant_id_idx ON public.residuals(merchant_id);
CREATE INDEX IF NOT EXISTS residuals_processing_month_idx ON public.residuals(processing_month);
CREATE INDEX IF NOT EXISTS sync_jobs_status_idx ON public.sync_jobs(status);
CREATE INDEX IF NOT EXISTS sync_jobs_created_at_idx ON public.sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS user_roles_active_idx ON public.user_roles(user_id) WHERE revoked_at IS NULL;

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
```

### Step 2: Verify Database Setup

After creating the tables, run this to verify everything works:

```bash
node test-app-supabase.js
```

Expected output:
```
✅ Client created successfully
✅ Auth connection successful
✅ Merchants table accessible
```

### Step 3: Test Ireland Pay CRM Connection

The application uses the `IrelandPayCRMClient` class to connect to:
- **Base URL**: `https://crm.ireland-pay.com/api/v1`
- **Authentication**: API Key via `X-API-KEY` header

Available endpoints:
- `/merchants` - Get merchant list
- `/merchants/{id}` - Get specific merchant
- `/residuals/summary` - Get residuals summary
- `/residuals/details` - Get detailed residuals

### Step 4: Deploy to Vercel

Once the database tables are created, deploy:

```bash
vercel --prod
```

## Ireland Pay CRM API Integration Details

### Client Configuration

The `IrelandPayCRMClient` class handles:
- **Authentication**: API key-based auth
- **Rate Limiting**: Built-in request handling
- **Error Handling**: Comprehensive error logging
- **Data Transformation**: Converts API responses to database format

### Sync Process

1. **Initial Sync**: Downloads all merchants and residuals
2. **Incremental Sync**: Only syncs changed data
3. **Progress Tracking**: Real-time sync progress updates
4. **Error Recovery**: Automatic retry on failures

### Data Flow

```
Ireland Pay CRM API → IrelandPayCRMClient → Supabase Database → Analytics Dashboard
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Fixed by updating path mappings
2. **"Table does not exist"**: Run the SQL script above
3. **API connection failures**: Check API key and base URL
4. **Vercel deployment failures**: Ensure all tables exist first

### Environment Variables

Required variables (already configured):
Use only standard env names:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Ireland Pay CRM variables:
- `IRIS_CRM_API_KEY` - Your Ireland Pay CRM API key
- `IRIS_CRM_BASE_URL` - Ireland Pay CRM base URL

## Next Steps

1. ✅ **Create database tables** (manual SQL execution)
2. ✅ **Test Supabase connection** (`node test-app-supabase.js`)
3. ✅ **Deploy to Vercel** (`vercel --prod`)
4. 🔄 **Test Ireland Pay CRM sync** (through admin interface)
5. 🔄 **Create initial admin user** (first login)
6. 🔄 **Run initial data sync** (populate database)

## Support

If you encounter issues:
1. Check the Supabase dashboard for table creation
2. Verify environment variables are set correctly
3. Test the Ireland Pay CRM API connection separately
4. Review the sync logs in the admin interface 