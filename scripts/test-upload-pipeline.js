/**
 * Comprehensive Excel Upload Pipeline Test Utility
 * 
 * This script provides a unified interface for testing both merchant and
 * residual upload pipelines in the Ireland Pay Analytics system.
 * 
 * Features:
 * - Generate sample Excel data for both merchant and residual datasets
 * - Upload files to Supabase Storage
 * - Process files through the API endpoints
 * - Verify data in the database
 * - Run automated tests and provide detailed reports
 * - Clean up test data
 * 
 * Usage:
 *   node test-upload-pipeline.js [options]
 * 
 * Options:
 *   --type=merchant|residual    Dataset type to test
 *   --clean                    Automatically clean up test data
 *   --skip-upload              Skip upload and use existing file
 *   --debug                    Show additional debug information
 *   --help                     Show this help message
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  type: 'both',
  clean: false,
  skipUpload: false,
  debug: false,
  help: false
};

for (const arg of args) {
  if (arg === '--help') options.help = true;
  if (arg === '--clean') options.clean = true;
  if (arg === '--skip-upload') options.skipUpload = true;
  if (arg === '--debug') options.debug = true;
  if (arg.startsWith('--type=')) options.type = arg.split('=')[1];
}

// Show help message if requested
if (options.help) {
  console.log(`
  Excel Upload Pipeline Test Utility

  Usage:
    node test-upload-pipeline.js [options]
  
  Options:
    --type=merchant|residual|both   Dataset type to test (default: both)
    --clean                         Automatically clean up test data
    --skip-upload                   Skip upload and use existing file
    --debug                         Show additional debug information
    --help                          Show this help message
  `);
  process.exit(0);
}

// Initialize Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
    process.exit(1);
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

const supabase = createSupabaseClient();
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data generation utility
class TestDataGenerator {
  static createDirectory() {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    return testDataDir;
  }
  
  static generateMerchantData(count = 5) {
    const currentDate = new Date();
    const merchantData = [];
    
    for (let i = 1; i <= count; i++) {
      const mid = `TEST${String(i).padStart(6, '0')}`;
      const dba = `Test Merchant ${i}`;
      
      merchantData.push({
        'MID': mid,
        'Merchant DBA': dba,
        'Datasource': 'Test',
        'Total Transactions': 100 * i,
        'Total Volume': 10000 * i,
        'Last Batch Date': `${currentDate.getMonth() + 1}/01/${currentDate.getFullYear()}`
      });
    }
    
    return merchantData;
  }
  
  static generateResidualData(count = 5) {
    const currentDate = new Date();
    const residualData = [];
    
    for (let i = 1; i <= count; i++) {
      const mid = `TEST${String(i).padStart(6, '0')}`;
      const dba = `Test Merchant ${i}`;
      
      residualData.push({
        'Merchant ID': mid,
        'Merchant': dba,
        'Transactions': 100 * i,
        'Sales Amount': 10000 * i,
        'Income': 300 * i,
        'Expenses': 100 * i,
        'Net': 200 * i,
        'BPS': 30,
        '%': 50,
        'Agent Net': 100 * i,
        'Payout Date': `${currentDate.getMonth() + 1}/01/${currentDate.getFullYear()}`
      });
    }
    
    return residualData;
  }
  
  static generateMerchantExcel() {
    console.log('🔧 Generating sample merchant Excel file...');
    const testDataDir = this.createDirectory();
    const currentDate = new Date();
    const fileName = `Merchants_${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
    const filePath = path.join(testDataDir, fileName);
    
    const testData = this.generateMerchantData();
    
    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Merchants');
    
    // Write to file
    XLSX.writeFile(wb, filePath);
    console.log(`✅ Generated sample merchant file at: ${filePath}`);
    
    return { filePath, fileName, folderPath: 'merchant' };
  }
  
  static generateResidualExcel() {
    console.log('🔧 Generating sample residual Excel file...');
    const testDataDir = this.createDirectory();
    const currentDate = new Date();
    const fileName = `Residuals_${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
    const filePath = path.join(testDataDir, fileName);
    
    const testData = this.generateResidualData();
    
    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Residuals');
    
    // Write to file
    XLSX.writeFile(wb, filePath);
    console.log(`✅ Generated sample residual file at: ${filePath}`);
    
    return { filePath, fileName, folderPath: 'residual' };
  }
}

// Upload utility class
class FileUploader {
  static async uploadFile(filePath, folderPath, fileName) {
    console.log(`📤 Uploading file to Supabase Storage (${folderPath})...`);
    
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const { data, error } = await supabase
        .storage
        .from('uploads')
        .upload(`${folderPath}/${fileName}`, fileBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      console.log('✅ File uploaded successfully');
      return `${folderPath}/${fileName}`;
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }
}

// Processing utility class
class FileProcessor {
  static async processMerchantFile(filePath) {
    console.log('🔄 Processing merchant Excel file...');
    
    try {
      const response = await fetch(`${appUrl}/api/process-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: filePath,
          datasetType: 'merchants'
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Processing failed: ${result.error}`);
      }
      
      console.log('✅ File processed successfully');
      console.log(`📊 Results: ${result.merchants} merchants and ${result.metrics} metrics processed`);
      return result;
    } catch (error) {
      console.error('❌ Processing error:', error);
      throw error;
    }
  }
  
  static async processResidualFile(filePath) {
    console.log('🔄 Processing residual Excel file...');
    
    try {
      const response = await fetch(`${appUrl}/api/process-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: filePath,
          datasetType: 'residuals' 
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Processing failed: ${result.error}`);
      }
      
      console.log('✅ File processed successfully');
      console.log(`📊 Results: ${result.merchants} merchants and ${result.residuals} residual records processed`);
      return result;
    } catch (error) {
      console.error('❌ Processing error:', error);
      throw error;
    }
  }
}

// Verification utility class
class DataVerifier {
  static async verifyMerchantData() {
    console.log('🔍 Verifying merchant data in database...');
    
    try {
      // Check merchants table
      const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select()
        .like('mid', 'TEST%');
        
      if (merchantError) {
        throw new Error(`Query failed: ${merchantError.message}`);
      }
      
      console.log(`✅ Found ${merchants.length} test merchants in database`);
      
      // Check merchant_metrics table
      const { data: metrics, error: metricsError } = await supabase
        .from('merchant_metrics')
        .select()
        .like('mid', 'TEST%');
        
      if (metricsError) {
        throw new Error(`Query failed: ${metricsError.message}`);
      }
      
      console.log(`✅ Found ${metrics.length} test metrics records in database`);
      
      return { merchants, metrics };
    } catch (error) {
      console.error('❌ Verification error:', error);
      throw error;
    }
  }
  
  static async verifyResidualData() {
    console.log('🔍 Verifying residual data in database...');
    
    try {
      // Check merchants table (if they don't exist already)
      const { data: merchants, error: merchantError } = await supabase
        .from('merchants')
        .select()
        .like('mid', 'TEST%');
        
      if (merchantError) {
        throw new Error(`Query failed: ${merchantError.message}`);
      }
      
      console.log(`✅ Found ${merchants.length} test merchants in database`);
      
      // Check residual_payouts table
      const { data: residuals, error: residualError } = await supabase
        .from('residual_payouts')
        .select()
        .like('mid', 'TEST%');
        
      if (residualError) {
        throw new Error(`Query failed: ${residualError.message}`);
      }
      
      console.log(`✅ Found ${residuals.length} test residual records in database`);
      
      return { merchants, residuals };
    } catch (error) {
      console.error('❌ Verification error:', error);
      throw error;
    }
  }
}

// Cleanup utility class
class DataCleaner {
  static async cleanupMerchantData() {
    console.log('🧹 Cleaning up merchant test data...');
    
    try {
      // Delete from merchant_metrics table
      const { error: deleteMetricsError } = await supabase
        .from('merchant_metrics')
        .delete()
        .like('mid', 'TEST%');
        
      if (deleteMetricsError) {
        throw new Error(`Delete failed: ${deleteMetricsError.message}`);
      }
      
      console.log('✅ Deleted test metrics records');
      return true;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      throw error;
    }
  }
  
  static async cleanupResidualData() {
    console.log('🧹 Cleaning up residual test data...');
    
    try {
      // Delete from residual_payouts table
      const { error: deleteResidualError } = await supabase
        .from('residual_payouts')
        .delete()
        .like('mid', 'TEST%');
        
      if (deleteResidualError) {
        throw new Error(`Delete failed: ${deleteResidualError.message}`);
      }
      
      console.log('✅ Deleted test residual records');
      return true;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      throw error;
    }
  }
  
  static async cleanupMerchantRecords() {
    console.log('🧹 Cleaning up merchant records...');
    
    try {
      // Delete from merchants table
      const { error: deleteMerchantError } = await supabase
        .from('merchants')
        .delete()
        .like('mid', 'TEST%');
        
      if (deleteMerchantError) {
        throw new Error(`Delete failed: ${deleteMerchantError.message}`);
      }
      
      console.log('✅ Deleted test merchant records');
      return true;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      throw error;
    }
  }
  
  static async cleanupAllData() {
    try {
      await this.cleanupMerchantData();
      await this.cleanupResidualData();
      await this.cleanupMerchantRecords();
      console.log('✅ All test data cleaned up successfully');
      return true;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      throw error;
    }
  }
}

// Test runner class
class TestRunner {
  static async testMerchantUpload() {
    try {
      console.log('🚀 Starting merchant upload pipeline test...');
      
      // Generate test file
      const { filePath, fileName, folderPath } = TestDataGenerator.generateMerchantExcel();
      
      // Upload file (unless skipped)
      const storagePath = options.skipUpload 
        ? `${folderPath}/${fileName}` 
        : await FileUploader.uploadFile(filePath, folderPath, fileName);
      
      // Process file
      const processResult = await FileProcessor.processMerchantFile(storagePath);
      
      // Verify data
      const verifyResult = await DataVerifier.verifyMerchantData();
      
      // Summary
      console.log('\n📋 Merchant Upload Test Summary:');
      console.log(`- Merchants processed: ${processResult.merchants}`);
      console.log(`- Metrics processed: ${processResult.metrics}`);
      console.log(`- Merchants verified: ${verifyResult.merchants.length}`);
      console.log(`- Metrics verified: ${verifyResult.metrics.length}`);
      
      // Clean up if requested
      if (options.clean) {
        await DataCleaner.cleanupMerchantData();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Merchant upload test failed:', error);
      return false;
    }
  }
  
  static async testResidualUpload() {
    try {
      console.log('🚀 Starting residual upload pipeline test...');
      
      // Generate test file
      const { filePath, fileName, folderPath } = TestDataGenerator.generateResidualExcel();
      
      // Upload file (unless skipped)
      const storagePath = options.skipUpload 
        ? `${folderPath}/${fileName}` 
        : await FileUploader.uploadFile(filePath, folderPath, fileName);
      
      // Process file
      const processResult = await FileProcessor.processResidualFile(storagePath);
      
      // Verify data
      const verifyResult = await DataVerifier.verifyResidualData();
      
      // Summary
      console.log('\n📋 Residual Upload Test Summary:');
      console.log(`- Merchants processed: ${processResult.merchants}`);
      console.log(`- Residuals processed: ${processResult.residuals}`);
      console.log(`- Merchants verified: ${verifyResult.merchants.length}`);
      console.log(`- Residuals verified: ${verifyResult.residuals.length}`);
      
      // Clean up if requested
      if (options.clean) {
        await DataCleaner.cleanupResidualData();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Residual upload test failed:', error);
      return false;
    }
  }
  
  static async run() {
    console.log('🧪 Starting Excel Upload Pipeline Tests');
    console.log('=====================================\n');
    
    const results = {
      merchant: null,
      residual: null
    };
    
    // Run tests based on the options
    if (options.type === 'both' || options.type === 'merchant') {
      results.merchant = await this.testMerchantUpload();
    }
    
    if (options.type === 'both' || options.type === 'residual') {
      results.residual = await this.testResidualUpload();
    }
    
    // Summary
    console.log('\n=====================================');
    console.log('📋 Overall Test Results:');
    
    if (results.merchant !== null) {
      console.log(`- Merchant Upload: ${results.merchant ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    if (results.residual !== null) {
      console.log(`- Residual Upload: ${results.residual ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    // Clean up merchant records if all tests are complete and clean flag is set
    if (options.clean && options.type === 'both' && results.merchant && results.residual) {
      await DataCleaner.cleanupMerchantRecords();
    } else if (!options.clean) {
      // Ask if user wants to clean up
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Do you want to clean up all test data? (y/n) ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await DataCleaner.cleanupAllData();
        }
        
        console.log('\n✨ Testing completed');
        rl.close();
      });
    } else {
      console.log('\n✨ Testing completed');
    }
  }
}

// Run tests
TestRunner.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
