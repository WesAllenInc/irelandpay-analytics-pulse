#!/usr/bin/env node

/**
 * Apply Database Fixes Script
 * 
 * This script applies the database view fixes to resolve build errors.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function applyDatabaseFixes() {
  console.log('🔧 Applying database fixes...');
  
  try {
    // Check if Supabase CLI is available
    try {
      execSync('supabase --version', { stdio: 'pipe' });
      console.log('✅ Supabase CLI found');
    } catch (error) {
      console.log('⚠️  Supabase CLI not found, trying alternative approach...');
    }
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250120_fix_database_views.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration SQL loaded successfully');
    console.log('📋 Migration includes:');
    console.log('   - merchant_data view');
    console.log('   - residual_data view');
    console.log('   - master_data view');
    console.log('   - merchant_volume view');
    console.log('   - estimated_net_profit view');
    
    // Try to apply using Supabase CLI
    try {
      console.log('🚀 Applying migration via Supabase CLI...');
      execSync('supabase db push', { stdio: 'inherit' });
      console.log('✅ Migration applied successfully via Supabase CLI');
    } catch (error) {
      console.log('⚠️  Supabase CLI failed, trying manual application...');
      
      // Alternative: Create a simple script to run the SQL
      const sqlScriptPath = path.join(__dirname, 'run-migration.sql');
      fs.writeFileSync(sqlScriptPath, migrationSQL);
      
      console.log('📝 SQL script created at:', sqlScriptPath);
      console.log('📋 To apply manually:');
      console.log('   1. Connect to your Supabase database');
      console.log('   2. Run the SQL in:', sqlScriptPath);
      console.log('   3. Or use the Supabase dashboard SQL editor');
    }
    
    console.log('🎉 Database fixes ready to apply!');
    console.log('📋 Next steps:');
    console.log('   1. Apply the migration to your database');
    console.log('   2. Run "npm run build" to verify the build works');
    console.log('   3. Test the application functionality');
    
  } catch (error) {
    console.error('❌ Error applying database fixes:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  applyDatabaseFixes();
}

module.exports = { applyDatabaseFixes }; 