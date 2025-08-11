import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const missingEnvVars = [
  {
    name: 'IRELANDPAY_CRM_API_KEY',
    description: 'Ireland Pay CRM API Key',
    defaultValue: 'your-irelandpay-crm-api-key-here'
  },
  {
    name: 'IRELANDPAY_CRM_BASE_URL',
    description: 'Ireland Pay CRM Base URL',
    defaultValue: 'https://crm.ireland-pay.com/api/v1'
  },
  {
    name: 'IRELANDPAY_MAX_RETRIES',
    description: 'Maximum retry attempts for failed operations',
    defaultValue: '3'
  },
  {
    name: 'IRELANDPAY_BACKOFF_BASE_MS',
    description: 'Base delay in milliseconds for exponential backoff',
    defaultValue: '1000'
  },
  {
    name: 'IRELANDPAY_TIMEOUT_SECONDS',
    description: 'Timeout in seconds for HTTP requests',
    defaultValue: '30'
  },
  {
    name: 'IRELANDPAY_CIRCUIT_MAX_FAILURES',
    description: 'Number of consecutive failures before opening circuit breaker',
    defaultValue: '5'
  },
  {
    name: 'IRELANDPAY_CIRCUIT_RESET_SECONDS',
    description: 'Time in seconds after which to reset circuit breaker',
    defaultValue: '60'
  },
  {
    name: 'CRON_SECRET',
    description: 'Secret key for cron job authentication',
    defaultValue: 'your-cron-secret-here'
  },
  {
    name: 'ANTHROPIC_API_KEY',
    description: 'Anthropic API key for Claude integration',
    defaultValue: 'your-anthropic-api-key-here'
  }
];

function setupVercelEnvironment() {
  console.log('🚀 Setting up Vercel Environment Variables\n');
  
  console.log('📋 Missing Environment Variables to add:');
  missingEnvVars.forEach((envVar, index) => {
    console.log(`${index + 1}. ${envVar.name} - ${envVar.description}`);
  });
  
  console.log('\n🔧 To add these variables, run the following commands:');
  console.log('==================================================');
  
  missingEnvVars.forEach(envVar => {
    console.log(`\n# Add ${envVar.name}`);
    console.log(`vercel env add ${envVar.name} production`);
    console.log(`# When prompted, enter: ${envVar.defaultValue}`);
  });
  
  console.log('\n📝 Manual Setup Instructions:');
  console.log('=============================');
  console.log('1. Go to https://vercel.com/wes-allen-inc/irelandpay-analytics-pulse/settings/environment-variables');
  console.log('2. Add each missing variable listed above');
  console.log('3. Set the environment to "Production"');
  console.log('4. Click "Save"');
  console.log('5. Redeploy the application');
  
  console.log('\n🔄 After adding variables, redeploy:');
  console.log('vercel --prod');
  
  console.log('\n✅ Current Vercel Environment Variables:');
  console.log('=====================================');
  
  try {
    const output = execSync('vercel env ls', { encoding: 'utf8' });
    console.log(output);
  } catch (error) {
    console.log('Could not fetch current environment variables');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Add the missing environment variables to Vercel');
  console.log('2. Fix the Supabase API key in local .env file');
  console.log('3. Test the application locally');
  console.log('4. Redeploy to production');
  console.log('5. Run the connection test again');
}

setupVercelEnvironment();
