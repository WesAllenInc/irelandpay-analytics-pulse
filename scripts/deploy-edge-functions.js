/**
 * Deploy Edge Functions to Supabase
 * 
 * This script deploys the necessary Edge Functions for processing Excel files
 * in the IrelandPay Analytics project.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Supabase project information
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = supabaseUrl ? supabaseUrl.match(/https:\/\/([^.]+).supabase.co/)?.[1] : null;

if (!projectRef) {
  console.error('Invalid Supabase URL configuration. Expected format: https://<project-ref>.supabase.co');
  process.exit(1);
}

console.log(`🚀 Deploying Edge Functions to Supabase project: ${projectRef}`);

// Path to the Supabase CLI (assumes it's installed globally)
const supabaseCLI = 'supabase';

// Functions to deploy
const functions = [
  'processResidualExcel',
  'processMerchantExcel'
];

// Check if Supabase CLI is installed
function checkSubabaseCLI() {
  return new Promise((resolve, reject) => {
    const check = spawn('supabase', ['--version']);
    
    check.on('error', () => {
      console.error('❌ Supabase CLI not found. Please install it first:');
      console.error('npm install -g supabase');
      reject(new Error('Supabase CLI not installed'));
    });
    
    check.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Supabase CLI found');
        resolve();
      } else {
        reject(new Error('Supabase CLI check failed'));
      }
    });
  });
}

// Login to Supabase
function loginToSubabase() {
  console.log('🔑 Checking Supabase login status...');
  
  return new Promise((resolve, reject) => {
    // Check if already logged in
    const check = spawn('supabase', ['projects', 'list']);
    
    let output = '';
    check.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    check.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    check.on('close', (code) => {
      if (code === 0 && output.includes(projectRef)) {
        console.log('✅ Already logged into Supabase');
        resolve();
      } else {
        console.log('⚠️ Need to login to Supabase');
        console.log('Please run "supabase login" manually and then run this script again.');
        reject(new Error('Not logged into Supabase'));
      }
    });
  });
}

// Deploy a single function
function deployFunction(functionName) {
  console.log(`📦 Deploying ${functionName}...`);
  
  return new Promise((resolve, reject) => {
    // Path to the function directory
    const functionPath = path.join(__dirname, '../supabase/functions', functionName);
    
    // Verify function directory exists
    if (!fs.existsSync(functionPath)) {
      console.error(`❌ Function directory not found: ${functionPath}`);
      reject(new Error(`Function directory not found: ${functionPath}`));
      return;
    }
    
    // Deploy the function
    const deploy = spawn('supabase', [
      'functions', 
      'deploy', 
      functionName,
      '--project-ref', 
      projectRef,
      '--no-verify-jwt'
    ]);
    
    deploy.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    deploy.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    deploy.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Successfully deployed ${functionName}`);
        resolve();
      } else {
        console.error(`❌ Failed to deploy ${functionName}`);
        reject(new Error(`Failed to deploy ${functionName}`));
      }
    });
  });
}

// Deploy all functions
async function deployAllFunctions() {
  try {
    await checkSubabaseCLI();
    await loginToSubabase();
    
    console.log('\n📋 Starting deployment of Edge Functions...');
    
    for (const functionName of functions) {
      await deployFunction(functionName);
    }
    
    console.log('\n✨ All functions deployed successfully!');
    console.log(`
🔗 Function URLs:
  - processResidualExcel: ${supabaseUrl}/functions/v1/processResidualExcel
  - processMerchantExcel: ${supabaseUrl}/functions/v1/processMerchantExcel
    `);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run the deployment
deployAllFunctions();
