/**
 * Test Script for Excel Upload Flow
 * 
 * This script helps test the Excel upload functionality by:
 * 1. Creating test Excel files
 * 2. Uploading them to Supabase Storage
 * 3. Processing them with the Edge Functions
 * 4. Verifying data insertion in the database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const TEST_FILES_DIR = path.join(__dirname, '../test-data');

// Ensure test directory exists
if (!fs.existsSync(TEST_FILES_DIR)) {
  fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
}

// Helper function to format date
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

// Generate test data for residual payouts
async function generateResidualPayoutsExcel() {
  console.log('Generating test residual payouts Excel file...');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Residual Payouts');
  
  // Add headers
  worksheet.addRow([
    'Merchant ID', 'Merchant', 'Transactions', 'Sales Amount',
    'Income', 'Expenses', 'Net', 'BPS', '%', 'Agent Net', 'Payout Date'
  ]);
  
  // Add sample data (10 records)
  const currentDate = new Date();
  const payoutDate = formatDate(currentDate);
  
  for (let i = 1; i <= 10; i++) {
    const mid = `TEST${String(i).padStart(6, '0')}`;
    const dba = `Test Merchant ${i}`;
    const transactions = Math.floor(Math.random() * 1000) + 100;
    const salesAmount = (Math.random() * 10000) + 1000;
    const income = salesAmount * 0.025;
    const expenses = income * 0.2;
    const net = income - expenses;
    const bps = 25;
    const pct = 50;
    const agentNet = net * (pct / 100);
    
    worksheet.addRow([
      mid, dba, transactions, salesAmount, income, expenses,
      net, bps, pct, agentNet, payoutDate
    ]);
    
    // Format currency columns
    const row = worksheet.getRow(i + 1);
    ['D', 'E', 'F', 'G', 'J'].forEach(col => {
      row.getCell(col).numFmt = '"$"#,##0.00';
    });
    
    // Format percentage column
    row.getCell('I').numFmt = '0.00"%"';
  }
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  const fileName = `Residuals_${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
  const filePath = path.join(TEST_FILES_DIR, fileName);
  
  await workbook.xlsx.writeFile(filePath);
  console.log(`Test residual payouts file created: ${filePath}`);
  
  return { fileName, filePath };
}

// Generate test data for merchant data
async function generateMerchantDataExcel() {
  console.log('Generating test merchant data Excel file...');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Merchants');
  
  // Add headers
  worksheet.addRow([
    'MID', 'DBA Name', 'Address', 'City', 'State', 'ZIP', 'Phone',
    'Email', 'Status', 'Category', 'Monthly Volume', 'Average Ticket', 'Transaction Count'
  ]);
  
  // Add sample data (10 records)
  for (let i = 1; i <= 10; i++) {
    const mid = `MERCH${String(i).padStart(5, '0')}`;
    const dba = `Test Merchant ${i}`;
    const address = `${1000 + i} Main St`;
    const city = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][i % 5];
    const state = ['NY', 'CA', 'IL', 'TX', 'AZ'][i % 5];
    const zip = `${10000 + i * 100}`;
    const phone = `555-${String(1000 + i).padStart(4, '0')}`;
    const email = `merchant${i}@example.com`;
    const status = i % 5 === 0 ? 'inactive' : 'active';
    const category = ['Retail', 'Restaurant', 'Service', 'Healthcare', 'E-Commerce'][i % 5];
    const monthlyVolume = (Math.random() * 50000) + 5000;
    const avgTicket = (Math.random() * 100) + 10;
    const transactionCount = Math.floor(monthlyVolume / avgTicket);
    
    worksheet.addRow([
      mid, dba, address, city, state, zip, phone, email, status,
      category, monthlyVolume, avgTicket, transactionCount
    ]);
    
    // Format currency columns
    const row = worksheet.getRow(i + 1);
    ['K', 'L'].forEach(col => {
      row.getCell(col).numFmt = '"$"#,##0.00';
    });
  }
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  const fileName = `Merchants_${Date.now()}.xlsx`;
  const filePath = path.join(TEST_FILES_DIR, fileName);
  
  await workbook.xlsx.writeFile(filePath);
  console.log(`Test merchant data file created: ${filePath}`);
  
  return { fileName, filePath };
}

// Upload Excel file to Supabase Storage
async function uploadExcelFile(filePath, fileName, bucket) {
  console.log(`Uploading ${fileName} to ${bucket} bucket...`);
  
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `${bucket}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });
      
    if (error) {
      console.error(`Upload error:`, error);
      return null;
    }
    
    console.log(`File uploaded successfully:`, data.path);
    return data.path;
  } catch (err) {
    console.error(`File upload failed:`, err);
    return null;
  }
}

// Process Excel file with Edge Function
async function processExcelFile(path, functionType) {
  console.log(`Processing ${path} with ${functionType} function...`);
  
  try {
    // Get the Edge Function URL based on the project reference
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+).supabase.co/)?.[1];
    if (!projectRef) {
      throw new Error('Invalid Supabase URL');
    }
    
    // Determine which function to call
    const functionName = functionType === 'residuals' ? 'processResidualExcel' : 'processMerchantExcel';
    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
    
    // Get user session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    // Call the function
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ path })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error(`Processing failed:`, result);
      return false;
    }
    
    console.log(`Processing succeeded:`, result);
    return true;
  } catch (err) {
    console.error(`Processing failed:`, err);
    return false;
  }
}

// Verify data in the database
async function verifyDatabaseData(functionType) {
  console.log(`Verifying database data for ${functionType}...`);
  
  try {
    let tableName, query;
    
    if (functionType === 'residuals') {
      tableName = 'residual_payouts';
      query = supabase.from(tableName).select('*');
    } else {
      tableName = 'merchants';
      query = supabase.from(tableName)
        .select('*, merchant_metrics(*)')
        .eq('datasource', 'merchant_excel');
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Database query error:`, error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.error(`No data found in ${tableName} table`);
      return false;
    }
    
    console.log(`Found ${data.length} records in ${tableName} table:`);
    console.log(data.slice(0, 3)); // Show first 3 records
    
    return true;
  } catch (err) {
    console.error(`Database verification failed:`, err);
    return false;
  }
}

// Main test function
async function runTests() {
  try {
    console.log('=== Starting Excel Upload Flow Tests ===');
    
    // Test Residual Payouts Flow
    console.log('\n=== Testing Residual Payouts Flow ===');
    const residualFile = await generateResidualPayoutsExcel();
    const residualPath = await uploadExcelFile(residualFile.filePath, residualFile.fileName, 'residuals');
    
    if (residualPath) {
      const residualProcessed = await processExcelFile(residualPath, 'residuals');
      if (residualProcessed) {
        await verifyDatabaseData('residuals');
      }
    }
    
    // Test Merchant Data Flow
    console.log('\n=== Testing Merchant Data Flow ===');
    const merchantFile = await generateMerchantDataExcel();
    const merchantPath = await uploadExcelFile(merchantFile.filePath, merchantFile.fileName, 'merchants');
    
    if (merchantPath) {
      const merchantProcessed = await processExcelFile(merchantPath, 'merchants');
      if (merchantProcessed) {
        await verifyDatabaseData('merchants');
      }
    }
    
    console.log('\n=== Excel Upload Flow Tests Completed ===');
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

// Run the tests
runTests().catch(console.error);
