import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local file')
  process.exit(1)
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250605_add_merchant_volume_tables.sql')
    const migrationSql = fs.readFileSync(migrationPath, 'utf8')

    console.log('Applying migration...')
    
    // Split SQL into individual statements
    // Simple split by semicolon - this is a basic approach and may not work for all SQL
    const statements = migrationSql.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql: stmt + ';' 
      })
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        console.error('Statement:', stmt)
        process.exit(1)
      }
    }
    
    console.log('Migration applied successfully!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

applyMigration()
