// Test script for Excel upload flow
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create a test Excel file
function createTestExcelFile() {
  console.log('Creating test Excel file...');
  
  // Sample data
  const data = [
    {
      merchantId: 'MERCH001',
      merchantName: 'Test Merchant 1',
      transactionDate: '2025-06-01',
      amount: 125.50,
      currency: 'USD',
      status: 'completed'
    },
    {
      merchantId: 'MERCH002',
      merchantName: 'Test Merchant 2',
      transactionDate: '2025-06-02',
      amount: 75.25,
      currency: 'EUR',
      status: 'pending'
    },
    {
      merchantId: 'MERCH003',
      merchantName: 'Test Merchant 3',
      transactionDate: '2025-06-03',
      amount: 200.00,
      currency: 'GBP',
      status: 'completed'
    }
  ];
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  
  // Create the test directory if it doesn't exist
  const testDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Write the workbook to a file
  const filePath = path.join(testDir, 'test-transactions.xlsx');
  XLSX.writeFile(workbook, filePath);
  
  console.log(`Test Excel file created at: ${filePath}`);
  return filePath;
}

// Upload the Excel file to Supabase Storage
async function uploadToSupabaseStorage(filePath) {
  console.log('Uploading file to Supabase Storage...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Read the file
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  
  // Upload to Supabase Storage
  const { data, error } = await supabase
    .storage
    .from('uploads')
    .upload(`merchant/${fileName}`, fileBuffer, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }
  
  console.log('File uploaded successfully:', data.path);
  return data.path;
}

// Process the Excel file using our API endpoint
async function processExcelFile(filePath) {
  console.log('Processing Excel file...');
  
  // In a real test, we would make an HTTP request to our API endpoint
  // For this test script, we'll simulate the API logic directly
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 0 });
    
    if (!rows || rows.length === 0) {
      console.error('No data found in Excel file');
      return false;
    }
    
    // Process the data
    const processedData = rows.map(row => {
      return {
        merchant_id: row.merchantId || '',
        merchant_name: row.merchantName || '',
        transaction_date: row.transactionDate || '',
        amount: typeof row.amount === 'number' ? row.amount : 0,
        currency: row.currency || 'USD',
        status: row.status || 'pending',
        raw_data: row,
        created_at: new Date().toISOString()
      };
    });
    
    // Insert into database
    const { data, error } = await supabase
      .from('merchant_transactions')
      .insert(processedData);
    
    if (error) {
      console.error('Error inserting data:', error);
      return false;
    }
    
    console.log(`Successfully processed ${processedData.length} records`);
    return true;
  } catch (error) {
    console.error('Error processing file:', error);
    return false;
  }
}

// Verify the data in the database
async function verifyDatabaseData() {
  console.log('Verifying data in database...');
  
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Query the most recent entries
  const { data, error } = await supabase
    .from('merchant_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error querying database:', error);
    return false;
  }
  
  if (!data || data.length === 0) {
    console.error('No data found in database');
    return false;
  }
  
  console.log('Recent database entries:');
  console.log(JSON.stringify(data, null, 2));
  return true;
}

// Run the full test flow
async function runTest() {
  console.log('Starting Excel upload flow test...');
  
  // Step 1: Create a test Excel file
  const filePath = createTestExcelFile();
  if (!filePath) {
    console.error('Failed to create test Excel file');
    return;
  }
  
  // Step 2: Upload to Supabase Storage
  const storagePath = await uploadToSupabaseStorage(filePath);
  if (!storagePath) {
    console.error('Failed to upload to Supabase Storage');
    return;
  }
  
  // Step 3: Process the Excel file
  const processed = await processExcelFile(filePath);
  if (!processed) {
    console.error('Failed to process Excel file');
    return;
  }
  
  // Step 4: Verify the data in the database
  const verified = await verifyDatabaseData();
  if (!verified) {
    console.error('Failed to verify database data');
    return;
  }
  
  console.log('Test completed successfully!');
}

// Run the test
runTest().catch(console.error);
