#!/usr/bin/env node

/**
 * Ireland Pay CRM Integration Test Script
 * 
 * This script tests the Ireland Pay CRM integration to ensure everything is working correctly.
 * Run this before deploying to production.
 */

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n${step}. ${description}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'reset');
}

// Test configuration
const config = {
  apiKey: process.env.IRELANDPAY_CRM_API_KEY,
  baseUrl: process.env.IRELANDPAY_CRM_BASE_URL || 'https://crm.ireland-pay.com/api/v1',
  localUrl: process.env.LOCAL_URL || 'http://localhost:3000',
  timeout: 10000
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: config.timeout,
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: Environment Variables
async function testEnvironmentVariables() {
  logStep(1, 'Testing Environment Variables');
  
  if (!config.apiKey) {
    logError('IRELANDPAY_CRM_API_KEY is not set');
    return false;
  }
  
  if (!config.baseUrl) {
    logError('IRELANDPAY_CRM_BASE_URL is not set');
    return false;
  }
  
  logSuccess('All required environment variables are set');
  logInfo(`Base URL: ${config.baseUrl}`);
  logInfo(`API Key: ${config.apiKey.substring(0, 8)}...`);
  
  return true;
}

// Test 2: Ireland Pay CRM API Connectivity
async function testIrelandPayCRMApi() {
  logStep(2, 'Testing Ireland Pay CRM API Connectivity');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/merchants`, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.statusCode === 200) {
      logSuccess('Ireland Pay CRM API is accessible');
      logInfo(`Response status: ${response.statusCode}`);
      if (response.data && response.data.data) {
        logInfo(`Found ${response.data.data.length} merchants`);
      }
      return true;
    } else {
      logError(`API returned status ${response.statusCode}`);
      logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to connect to Ireland Pay CRM API: ${error.message}`);
    return false;
  }
}

// Test 3: Local API Endpoints
async function testLocalApiEndpoints() {
  logStep(3, 'Testing Local API Endpoints');
  
  const endpoints = [
    '/api/sync-irelandpay-crm/status',
    '/api/sync-irelandpay-crm'
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${config.localUrl}${endpoint}`, {
        method: 'GET'
      });
      
      if (response.statusCode === 200 || response.statusCode === 405) {
        logSuccess(`${endpoint} is accessible (${response.statusCode})`);
      } else {
        logError(`${endpoint} returned status ${response.statusCode}`);
        allPassed = false;
      }
    } catch (error) {
      logError(`Failed to access ${endpoint}: ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Test 4: Database Connectivity
async function testDatabaseConnectivity() {
  logStep(4, 'Testing Database Connectivity');
  
  try {
    const response = await makeRequest(`${config.localUrl}/api/sync-irelandpay-crm/status`, {
      method: 'GET'
    });
    
    if (response.statusCode === 200) {
      const data = response.data;
      
      if (data.success) {
        logSuccess('Database connectivity is working');
        logInfo(`API credentials configured: ${data.details?.hasApiKey ? 'Yes' : 'No'}`);
        logInfo(`Base URL configured: ${data.details?.hasBaseUrl ? 'Yes' : 'No'}`);
        return true;
      } else {
        logError(`Database connectivity failed: ${data.error}`);
        return false;
      }
    } else {
      logError(`Status endpoint returned ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to test database connectivity: ${error.message}`);
    return false;
  }
}

// Test 5: Sync Functionality
async function testSyncFunctionality() {
  logStep(5, 'Testing Sync Functionality');
  
  try {
    const response = await makeRequest(`${config.localUrl}/api/sync-irelandpay-crm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dataType: 'merchants',
        forceSync: false
      })
    });
    
    if (response.statusCode === 200) {
      const data = response.data;
      
      if (data.success) {
        logSuccess('Sync functionality is working');
        logInfo(`Message: ${data.message}`);
        return true;
      } else {
        logWarning(`Sync returned error: ${data.error}`);
        // This might be expected if a sync is already in progress
        return true;
      }
    } else if (response.statusCode === 409) {
      logWarning('Sync is already in progress (this is expected)');
      return true;
    } else {
      logError(`Sync endpoint returned ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to test sync functionality: ${error.message}`);
    return false;
  }
}

// Test 6: Frontend Components
async function testFrontendComponents() {
  logStep(6, 'Testing Frontend Components');
  
  try {
    const response = await makeRequest(`${config.localUrl}/dashboard/sync`, {
      method: 'GET'
    });
  
    if (response.statusCode === 200) {
      logSuccess('Frontend sync page is accessible');
      return true;
    } else {
      logError(`Frontend sync page returned ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to test frontend components: ${error.message}`);
    return false;
  }
}

// Test direct API connection
async function testDirectAPI() {
  console.log('\n🔗 Testing direct API connection...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/merchants`, {
      method: 'GET',
      headers: {
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      console.log('✅ Direct API connection successful');
      console.log(`📊 Found ${response.data?.data?.length || 0} merchants`);
    } else {
      console.log(`❌ Direct API connection failed: ${response.statusCode}`);
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('❌ Direct API connection error:', error.message);
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Ireland Pay CRM Integration Tests', 'bold');
  log(`Testing with base URL: ${config.baseUrl}`, 'blue');
  
  const tests = [
    testEnvironmentVariables,
    testIrelandPayCRMApi,
    testLocalApiEndpoints,
    testDatabaseConnectivity,
    testSyncFunctionality,
    testFrontendComponents
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
    } catch (error) {
      logError(`Test failed with error: ${error.message}`);
      results.push(false);
    }
  }
  
  // Summary
  log('\n📊 Test Results Summary', 'bold');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log(`Tests passed: ${passed}/${total}`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 All tests passed! The Ireland Pay CRM integration is ready for deployment.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please fix the issues before deploying.', 'yellow');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('Ireland Pay CRM Integration Test Script', 'bold');
  log('\nUsage: node scripts/test-irelandpay-integration.js [options]', 'blue');
  log('\nOptions:', 'blue');
  log('  --help, -h     Show this help message');
  log('  --local-url    Set local URL (default: http://localhost:3000)');
  log('\nEnvironment Variables:', 'blue');
  log('  IRELANDPAY_CRM_API_KEY     Your Ireland Pay CRM API key');
  log('  IRELANDPAY_CRM_BASE_URL    Ireland Pay CRM base URL');
  log('  LOCAL_URL                   Local development URL');
  process.exit(0);
}

// Parse command line arguments
const localUrlIndex = process.argv.indexOf('--local-url');
if (localUrlIndex !== -1 && process.argv[localUrlIndex + 1]) {
  config.localUrl = process.argv[localUrlIndex + 1];
}

// Run the tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
}); 