// Script to create a test Excel file for upload testing
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

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
    },
    {
      merchantId: 'MERCH004',
      merchantName: 'Test Merchant 4',
      transactionDate: '2025-06-04',
      amount: 50.75,
      currency: 'USD',
      status: 'pending'
    },
    {
      merchantId: 'MERCH005',
      merchantName: 'Test Merchant 5',
      transactionDate: '2025-06-05',
      amount: 300.00,
      currency: 'EUR',
      status: 'completed'
    }
  ];
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  
  // Create the test directory if it doesn't exist
  const testDir = path.join(__dirname, 'sample-data');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Write the workbook to a file
  const filePath = path.join(testDir, 'test-transactions.xlsx');
  XLSX.writeFile(workbook, filePath);
  
  console.log(`Test Excel file created at: ${filePath}`);
  return filePath;
}

// Run the function
createTestExcelFile();
