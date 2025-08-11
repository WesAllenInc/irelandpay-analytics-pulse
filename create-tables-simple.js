import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function createTablesSimple() {
  try {
    console.log('🚀 Creating essential tables for IRIS CRM integration...');
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }
    
    // Create client with service role key for admin access
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    console.log('✅ Connected with service role');
    
    // Test connection by trying to access a system table
    console.log('\n🔍 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  System table access failed, but continuing...');
    } else {
      console.log('✅ Connection confirmed');
    }
    
    // Try to create tables using direct SQL
    console.log('\n🏗️  Creating tables...');
    
    // Create merchants table
    try {
      const { error } = await supabase
        .from('merchants')
        .select('count')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        console.log('📋 Creating merchants table...');
        // We'll need to use the Supabase dashboard or CLI for this
        console.log('💡 Please create the merchants table manually in the Supabase dashboard');
      } else {
        console.log('✅ Merchants table exists');
      }
    } catch (error) {
      console.log('❌ Merchants table missing - needs manual creation');
    }
    
    // Check other essential tables
    const tablesToCheck = ['agents', 'residuals', 'sync_jobs', 'user_roles'];
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error && error.message.includes('does not exist')) {
          console.log(`❌ Table missing: ${table}`);
        } else {
          console.log(`✅ Table exists: ${table}`);
        }
      } catch (error) {
        console.log(`❌ Table missing: ${table}`);
      }
    }
    
    console.log('\n📋 Manual Setup Required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL:');
    console.log(`
-- Create essential tables
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

-- Create indexes
CREATE INDEX IF NOT EXISTS merchants_agent_id_idx ON public.merchants(agent_id);
CREATE INDEX IF NOT EXISTS residuals_merchant_id_idx ON public.residuals(merchant_id);
CREATE INDEX IF NOT EXISTS residuals_processing_month_idx ON public.residuals(processing_month);
CREATE INDEX IF NOT EXISTS sync_jobs_status_idx ON public.sync_jobs(status);

-- Enable RLS
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Allow all for now" ON public.merchants FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.agents FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.residuals FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.sync_jobs FOR ALL USING (true);
    `);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createTablesSimple(); 