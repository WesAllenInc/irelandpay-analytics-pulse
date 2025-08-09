// Script to update Supabase types
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Updating Supabase types...');

try {
  // Check if npx is available
  execSync('npx --version', { stdio: 'ignore' });
  
  // Generate types using supabase-js CLI
  console.log('Generating types from Supabase schema...');
  
  // Make sure the types directory exists
  const typesDir = path.join(__dirname, '..', 'types');
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }
  
  // Run the type generation command
  // Note: This requires SUPABASE_URL and SUPABASE_ANON_KEY environment variables
  execSync(
    'npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > types/database.types.ts',
    { 
      stdio: 'inherit',
      env: { 
        ...process.env,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }
  );
  
  console.log('✅ Types successfully generated!');
  console.log('📝 Generated types saved to types/database.types.ts');
  console.log('⚠️ Important: Review the generated types and update your Database interface if needed');
  
} catch (error) {
  console.error('❌ Error updating Supabase types:', error.message);
  console.log('\nAlternative method:');
  console.log('1. Install Supabase CLI: https://supabase.com/docs/guides/cli');
  console.log('2. Login to Supabase: supabase login');
  console.log('3. Generate types: supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > types/database.types.ts');
  process.exit(1);
}
