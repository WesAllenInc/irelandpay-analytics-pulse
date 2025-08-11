import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function setupDatabase() {
  try {
    console.log('🚀 Starting complete database setup for Ireland Pay CRM integration...');
    
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
    
    // Step 1: Test basic connection
    console.log('\n🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Basic connection test failed, but continuing...');
    } else {
      console.log('✅ Database connection confirmed');
    }
    
    // Step 2: Check if tables exist
    console.log('\n📋 Checking existing database structure...');
    
    const coreTables = ['merchants', 'agents', 'residuals', 'sync_jobs'];
    let existingTables = 0;
    
    for (const table of coreTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (!error) {
          existingTables++;
          console.log(`✅ Table exists: ${table}`);
        } else {
          console.log(`❌ Table missing: ${table}`);
        }
      } catch (error) {
        console.log(`❌ Table missing: ${table}`);
      }
    }
    
    if (existingTables > 0) {
      console.log(`\n⚠️  Found ${existingTables} existing tables.`);
      console.log('💡 Consider running reset-supabase-database.js first for a clean slate.');
    }
    
    // Step 3: Create essential tables if they don't exist
    console.log('\n🏗️  Creating essential tables for Ireland Pay CRM...');
    
    const essentialTables = [
      // Core tables for Ireland Pay CRM data
      `CREATE TABLE IF NOT EXISTS public.merchants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id text NOT NULL UNIQUE,
        dba_name text NOT NULL,
        processor text,
        agent_id uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );`,
      
      `CREATE TABLE IF NOT EXISTS public.agents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name text NOT NULL,
        email text,
        role text DEFAULT 'agent',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );`,
      
      `CREATE TABLE IF NOT EXISTS public.residuals (
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
      );`,
      
      // Ireland Pay CRM sync management tables
      `CREATE TABLE IF NOT EXISTS public.sync_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_type text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        triggered_by text NOT NULL,
        triggered_by_user_id uuid,
        started_at timestamptz,
        completed_at timestamptz,
        error_message text,
        created_at timestamptz DEFAULT now()
      );`,
      
      `CREATE TABLE IF NOT EXISTS public.sync_progress (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_id uuid REFERENCES public.sync_jobs(id),
        phase text NOT NULL,
        progress integer DEFAULT 0,
        message text,
        details jsonb,
        last_update timestamptz DEFAULT now()
      );`,
      
      // Ireland Pay CRM API credentials table
      `CREATE TABLE IF NOT EXISTS public.api_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_name text NOT NULL UNIQUE,
        api_key text NOT NULL,
        base_url text DEFAULT 'https://crm.ireland-pay.com/api/v1',
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );`,
      
      // User roles table for admin access
      `CREATE TABLE IF NOT EXISTS public.user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        role text NOT NULL CHECK (role IN ('admin', 'viewer', 'analyst')),
        granted_by uuid REFERENCES auth.users(id),
        granted_at timestamp with time zone DEFAULT now(),
        revoked_at timestamp with time zone,
        is_active boolean GENERATED ALWAYS AS (revoked_at IS NULL) STORED,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );`
    ];
    
    for (const sql of essentialTables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error(`❌ Error creating table: ${error.message}`);
        } else {
          console.log('✅ Table created/verified');
        }
      } catch (error) {
        console.error(`❌ Failed to create table: ${error.message}`);
      }
    }
    
    // Step 4: Create indexes for performance
    console.log('\n⚡ Creating performance indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS merchants_agent_id_idx ON public.merchants(agent_id);',
      'CREATE INDEX IF NOT EXISTS residuals_merchant_id_idx ON public.residuals(merchant_id);',
      'CREATE INDEX IF NOT EXISTS residuals_processing_month_idx ON public.residuals(processing_month);',
      'CREATE INDEX IF NOT EXISTS sync_jobs_status_idx ON public.sync_jobs(status);',
      'CREATE INDEX IF NOT EXISTS sync_jobs_created_at_idx ON public.sync_jobs(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS user_roles_active_idx ON public.user_roles(user_id) WHERE revoked_at IS NULL;'
    ];
    
    for (const sql of indexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error(`❌ Error creating index: ${error.message}`);
        } else {
          console.log('✅ Index created/verified');
        }
      } catch (error) {
        console.error(`❌ Failed to create index: ${error.message}`);
      }
    }
    
    // Step 5: Enable RLS and create basic policies
    console.log('\n🔒 Setting up Row Level Security...');
    
    const rlsSetup = [
      'ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.residuals ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;',
      
      // Basic policies - allow all for now (can be refined later)
      'CREATE POLICY "Allow all for now" ON public.merchants FOR ALL USING (true);',
      'CREATE POLICY "Allow all for now" ON public.agents FOR ALL USING (true);',
      'CREATE POLICY "Allow all for now" ON public.residuals FOR ALL USING (true);',
      'CREATE POLICY "Allow all for now" ON public.sync_jobs FOR ALL USING (true);',
      'CREATE POLICY "Allow all for now" ON public.user_roles FOR ALL USING (true);'
    ];
    
    for (const sql of rlsSetup) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.error(`❌ Error setting up RLS: ${error.message}`);
        } else {
          console.log('✅ RLS policy created/verified');
        }
      } catch (error) {
        console.error(`❌ Failed to setup RLS: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Database setup completed for Ireland Pay CRM integration!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the Ireland Pay CRM API connection');
    console.log('2. Create an initial admin user');
    console.log('3. Run a test sync to populate data from Ireland Pay CRM');
    console.log('4. Deploy to Vercel');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

setupDatabase(); 