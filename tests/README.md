# Testing the Excel Upload Flow

This document outlines the steps to test the complete Excel upload flow in the Ireland Pay Analytics application.

## Prerequisites

Before testing, ensure you have:

1. A running instance of the Next.js application
2. Access to your Supabase project
3. The following environment variables set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup

Ensure your Supabase database has the required table:

```sql
CREATE TABLE public.merchant_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  transaction_date TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_merchant_transactions_merchant_id ON public.merchant_transactions(merchant_id);
CREATE INDEX idx_merchant_transactions_created_at ON public.merchant_transactions(created_at);
```

## Storage Setup

Ensure your Supabase project has a storage bucket named `uploads` with appropriate permissions:

1. Go to the Supabase dashboard
2. Navigate to Storage
3. Create a new bucket named `uploads` if it doesn't exist
4. Set the bucket to private
5. Update the RLS policies to allow authenticated users to upload files

## Test Plan

### 1. Component Testing

#### UploadExcel Component

1. Navigate to `/dashboard/upload` in your application
2. Verify the component renders correctly
3. Try selecting a non-Excel file and verify validation works
4. Select a valid Excel file and verify the file name appears
5. Click upload without selecting a file and verify error message

### 2. Upload Testing

1. Create a test Excel file with the following columns:
   - merchantId
   - merchantName
   - transactionDate
   - amount
   - currency
   - status

2. Select the test Excel file in the upload component
3. Click the upload button
4. Verify the "Uploading file..." message appears
5. After upload completes, verify the "Processing Excel data..." message appears

### 3. Processing Testing

1. After upload and processing completes, verify the success message appears
2. Check the Supabase Storage dashboard to confirm the file exists in the `uploads/merchant/` path
3. Check the Supabase Table Editor to verify data was inserted into the `merchant_transactions` table
4. Verify the data in the table matches the data in your Excel file

### 4. Error Handling Testing

1. Test with an empty Excel file
2. Test with an Excel file missing required columns
3. Test with an Excel file containing invalid data types
4. Test with a very large Excel file (near the size limit)
5. Test uploading the same file twice to verify upsert behavior

## Manual Testing Checklist

- [ ] Component renders correctly
- [ ] File selection works
- [ ] File validation works
- [ ] Upload to Storage works
- [ ] Processing via API works
- [ ] Data appears in database
- [ ] Success feedback is shown to user
- [ ] Error handling works correctly

## Automated Testing

For automated testing, you can use the provided test scripts:

1. `test-excel-upload.js` - Tests the full upload and processing flow
2. `check-database-setup.js` - Verifies the database and storage setup

Run the tests with:

```bash
node tests/test-excel-upload.js
```

## Sample Test Excel File

You can create a sample Excel file with this structure:

| merchantId | merchantName      | transactionDate | amount | currency | status    |
|------------|-------------------|----------------|--------|----------|-----------|
| MERCH001   | Test Merchant 1   | 2025-06-01     | 125.50 | USD      | completed |
| MERCH002   | Test Merchant 2   | 2025-06-02     | 75.25  | EUR      | pending   |
| MERCH003   | Test Merchant 3   | 2025-06-03     | 200.00 | GBP      | completed |
