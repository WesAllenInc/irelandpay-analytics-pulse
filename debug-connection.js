import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

console.log('🔍 Debugging Supabase connection...');

// Check all possible environment variables
const possibleUrls = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL'
];

const possibleKeys = [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY'
];

console.log('\n📋 Environment Variables:');
console.log('URL variables:');
possibleUrls.forEach(varName => {
  const value = process.env[varName];
  console.log(`  ${varName}: ${value ? value.substring(0, 50) + '...' : 'NOT SET'}`);
});

console.log('\nKey variables:');
possibleKeys.forEach(varName => {
  const value = process.env[varName];
  console.log(`  ${varName}: ${value ? value.substring(0, 20) + '...' : 'NOT SET'}`);
});

// Check service role key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log(`\nService Role Key: ${serviceRoleKey ? serviceRoleKey.substring(0, 20) + '...' : 'NOT SET'}`);

// Show which URL we'll use
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`\n🎯 Will connect to: ${url || 'NO URL FOUND'}`);
console.log(`🔑 Using key: ${key ? key.substring(0, 20) + '...' : 'NO KEY FOUND'}`); 