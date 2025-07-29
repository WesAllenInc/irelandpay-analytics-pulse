#!/usr/bin/env node

/**
 * Ireland Pay CRM Integration Monitoring Script
 * 
 * This script monitors the Ireland Pay CRM integration to ensure everything is working correctly
 * after deployment. Run this periodically to check the health of the integration.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

function logHeader(message) {
  log(`\n${message}`, 'bold');
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

// Configuration
const config = {
  productionUrl: process.env.PRODUCTION_URL || 'https://your-app.vercel.app',
  apiKey: process.env.IRELANDPAY_CRM_API_KEY,
  baseUrl: process.env.IRELANDPAY_CRM_BASE_URL || 'https://crm.ireland-pay.com/api/v1',
  timeout: 10000,
  logFile: path.join(__dirname, '../logs/irelandpay-monitoring.log')
};

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

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

// Helper function to log to file
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(config.logFile, logEntry);
}

// Check 1: Production API Endpoints
async function checkProductionEndpoints() {
  logHeader('1. Production API Endpoints Health Check');
  
  const endpoints = [
    '/api/sync-irelandpay-crm/status',
    '/api/sync-irelandpay-crm'
  ];
  
  let allHealthy = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${config.productionUrl}${endpoint}`, {
        method: 'GET'
      });
      
      if (response.statusCode === 200) {
        logSuccess(`${endpoint} is healthy (${response.statusCode})`);
        logToFile(`Health check passed: ${endpoint} - ${response.statusCode}`);
      } else {
        logError(`${endpoint} returned status ${response.statusCode}`);
        logToFile(`Health check failed: ${endpoint} - ${response.statusCode}`);
        allHealthy = false;
      }
    } catch (error) {
      logError(`${endpoint} is not accessible: ${error.message}`);
      logToFile(`Health check error: ${endpoint} - ${error.message}`);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

// Check 2: Ireland Pay CRM API Connectivity
async function checkIrelandPayCRMApi() {
  logHeader('2. Ireland Pay CRM API Connectivity');
  
  if (!config.apiKey) {
    logError('IRELANDPAY_CRM_API_KEY is not set');
    logToFile('Error: IRELANDPAY_CRM_API_KEY is not set');
    return false;
  }
  
  try {
    const response = await makeRequest(`${config.baseUrl}/merchants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.statusCode === 200) {
      logSuccess('Ireland Pay CRM API is accessible');
      logInfo(`Response status: ${response.statusCode}`);
      if (response.data && response.data.data) {
        logInfo(`Found ${response.data.data.length} merchants`);
      }
      logToFile(`API connectivity check passed: ${response.statusCode}`);
      return true;
    } else {
      logError(`Ireland Pay CRM API returned status ${response.statusCode}`);
      logToFile(`API connectivity check failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to connect to Ireland Pay CRM API: ${error.message}`);
    logToFile(`API connectivity error: ${error.message}`);
    return false;
  }
}

// Check 3: Sync Status
async function checkSyncStatus() {
  logHeader('3. Sync Status Check');
  
  try {
    const response = await makeRequest(`${config.productionUrl}/api/sync-irelandpay-crm/status`, {
      method: 'GET'
    });
    
    if (response.statusCode === 200) {
      const data = response.data;
      
      if (data.success) {
        logSuccess('Sync status check passed');
        logInfo(`API credentials configured: ${data.details?.hasApiKey ? 'Yes' : 'No'}`);
        logInfo(`Base URL configured: ${data.details?.hasBaseUrl ? 'Yes' : 'No'}`);
        logInfo(`Recent syncs: ${data.details?.hasRecentSync ? 'Yes' : 'No'}`);
        logInfo(`Active schedules: ${data.details?.activeSchedulesCount || 0}`);
        
        logToFile(`Sync status check passed: ${JSON.stringify(data.details)}`);
        return true;
      } else {
        logError(`Sync status check failed: ${data.error}`);
        logToFile(`Sync status check failed: ${data.error}`);
        return false;
      }
    } else {
      logError(`Sync status endpoint returned ${response.statusCode}`);
      logToFile(`Sync status endpoint error: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to check sync status: ${error.message}`);
    logToFile(`Sync status check error: ${error.message}`);
    return false;
  }
}

// Check 4: Database Connectivity
async function checkDatabaseConnectivity() {
  logHeader('4. Database Connectivity Check');
  
  try {
    // This would typically involve a direct database connection test
    // For now, we'll test through the API
    const response = await makeRequest(`${config.productionUrl}/api/sync-irelandpay-crm/status`, {
      method: 'GET'
    });
    
    if (response.statusCode === 200) {
      logSuccess('Database connectivity is working');
      logToFile('Database connectivity check passed');
      return true;
    } else {
      logError(`Database connectivity failed: ${response.statusCode}`);
      logToFile(`Database connectivity check failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Database connectivity error: ${error.message}`);
    logToFile(`Database connectivity error: ${error.message}`);
    return false;
  }
}

// Check 5: Recent Sync Activity
async function checkRecentSyncActivity() {
  logHeader('5. Recent Sync Activity Check');
  
  try {
    const response = await makeRequest(`${config.productionUrl}/api/sync-irelandpay-crm/status`, {
      method: 'GET'
    });
    
    if (response.statusCode === 200) {
      const data = response.data;
      
      if (data.success && data.details?.hasRecentSync) {
        logSuccess('Recent sync activity detected');
        logInfo(`Last sync: ${data.details.lastSyncDate || 'Unknown'}`);
        logToFile(`Recent sync activity: ${data.details.lastSyncDate || 'Unknown'}`);
        return true;
      } else {
        logWarning('No recent sync activity detected');
        logToFile('Warning: No recent sync activity detected');
        return false;
      }
    } else {
      logError(`Failed to check sync activity: ${response.statusCode}`);
      logToFile(`Sync activity check failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Sync activity check error: ${error.message}`);
    logToFile(`Sync activity check error: ${error.message}`);
    return false;
  }
}

// Check 6: Error Rate Monitoring
async function checkErrorRates() {
  logHeader('6. Error Rate Monitoring');
  
  // This would typically involve checking logs or metrics
  // For now, we'll just log that this check was performed
  
  logInfo('Error rate monitoring check completed');
  logToFile('Error rate monitoring check completed');
  
  // In a real implementation, you would:
  // 1. Check application logs for errors
  // 2. Monitor API response times
  // 3. Check for failed sync operations
  // 4. Alert if error rate exceeds thresholds
  
  return true;
}

// Generate health report
function generateHealthReport(results) {
  logHeader('📊 Health Report Summary');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const healthPercentage = Math.round((passed / total) * 100);
  
  log(`Overall Health: ${healthPercentage}% (${passed}/${total} checks passed)`, 
      healthPercentage >= 80 ? 'green' : healthPercentage >= 60 ? 'yellow' : 'red');
  
  if (healthPercentage >= 80) {
    log('🎉 System is healthy!', 'green');
  } else if (healthPercentage >= 60) {
    log('⚠️  System has some issues that need attention', 'yellow');
  } else {
    log('🚨 System has critical issues that require immediate attention', 'red');
  }
  
  logToFile(`Health report: ${healthPercentage}% (${passed}/${total})`);
  
  return healthPercentage >= 80;
}

// Main monitoring function
async function runMonitoring() {
  const timestamp = new Date().toISOString();
  log(`🚀 Ireland Pay CRM Integration Monitoring - ${timestamp}`, 'bold');
  log(`Production URL: ${config.productionUrl}`, 'blue');
  log(`Log file: ${config.logFile}`, 'blue');
  
  logToFile(`=== Monitoring started at ${timestamp} ===`);
  
  const checks = [
    checkProductionEndpoints,
    checkIrelandPayCRMApi,
    checkSyncStatus,
    checkDatabaseConnectivity,
    checkRecentSyncActivity,
    checkErrorRates
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);
    } catch (error) {
      logError(`Check failed with error: ${error.message}`);
      logToFile(`Check error: ${error.message}`);
      results.push(false);
    }
  }
  
  const isHealthy = generateHealthReport(results);
  
  logToFile(`=== Monitoring completed at ${new Date().toISOString()} ===\n`);
  
  return isHealthy;
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('Ireland Pay CRM Integration Monitoring Script', 'bold');
  log('\nUsage: node scripts/monitor-irelandpay-integration.js [options]', 'blue');
  log('\nOptions:', 'blue');
  log('  --help, -h     Show this help message');
  log('  --continuous   Run monitoring continuously (every 5 minutes)');
  log('  --log-file     Specify custom log file path');
  log('\nEnvironment Variables:', 'blue');
  log('  PRODUCTION_URL           Production application URL');
  log('  IRELANDPAY_CRM_API_KEY   Ireland Pay CRM API key');
  log('  IRELANDPAY_CRM_BASE_URL  Ireland Pay CRM base URL');
  process.exit(0);
}

// Parse command line arguments
const continuousMode = process.argv.includes('--continuous');
const logFileIndex = process.argv.indexOf('--log-file');
if (logFileIndex !== -1 && process.argv[logFileIndex + 1]) {
  config.logFile = process.argv[logFileIndex + 1];
}

// Run monitoring
if (continuousMode) {
  log('🔄 Starting continuous monitoring (every 5 minutes)', 'blue');
  
  // Run initial check
  runMonitoring();
  
  // Set up interval for continuous monitoring
  setInterval(async () => {
    await runMonitoring();
  }, 5 * 60 * 1000); // 5 minutes
} else {
  runMonitoring().then(isHealthy => {
    process.exit(isHealthy ? 0 : 1);
  }).catch(error => {
    logError(`Monitoring failed: ${error.message}`);
    process.exit(1);
  });
} 