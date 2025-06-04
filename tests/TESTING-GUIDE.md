# Excel Upload Flow Testing Guide

This guide provides step-by-step instructions to test the complete Excel upload flow in the Ireland Pay Analytics application.

## Prerequisites

1. Ensure your Next.js development server is running:
   ```bash
   npm run dev
   ```

2. Verify your Supabase project is properly configured:
   - Check that the `merchant_transactions` table exists
   - Verify the `uploads` storage bucket exists
   - Ensure your `.env.local` file contains the correct Supabase credentials

## Step 1: Database Setup Verification

Before testing the upload flow, ensure your database is properly set up:

```sql
-- Run this in the Supabase SQL Editor if the table doesn't exist
CREATE TABLE IF NOT EXISTS public.merchant_transactions (
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

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_merchant_id ON public.merchant_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_created_at ON public.merchant_transactions(created_at);
```

## Step 2: Test File Preparation

We've created a sample Excel file for testing at:
```
tests/sample-data/test-transactions.xlsx
```

This file contains sample merchant transaction data with the following columns:
- merchantId
- merchantName
- transactionDate
- amount
- currency
- status

## Step 3: Manual Testing Through the UI

1. **Access the Upload Page**
   - Navigate to `http://localhost:3000/dashboard/upload` in your browser
   - Verify that the UploadExcel component renders correctly

2. **Test File Selection**
   - Click on the file input field
   - Select the test Excel file from `tests/sample-data/test-transactions.xlsx`
   - Verify that the file name appears and the upload button is enabled

3. **Test File Upload**
   - Click the "Upload" button
   - Observe the status messages:
     - "Uploading file..." should appear first
     - "Processing Excel data..." should appear next
     - Finally, a success message with the number of processed records should appear

4. **Verify Storage Upload**
   - Go to your Supabase dashboard
   - Navigate to Storage > uploads > merchant
   - Verify that `test-transactions.xlsx` appears in the bucket

5. **Verify Database Insertion**
   - Go to your Supabase dashboard
   - Navigate to Table Editor > merchant_transactions
   - Verify that the data from the Excel file has been inserted into the table
   - Check that the following fields are populated correctly:
     - merchant_id
     - merchant_name
     - transaction_date
     - amount
     - currency
     - status
     - raw_data (should contain the full JSON of each row)

## Step 4: Error Handling Testing

Test how the system handles various error scenarios:

1. **Invalid File Type**
   - Try uploading a non-Excel file (e.g., a .txt or .pdf file)
   - Verify that the file input validation prevents selection or shows an error

2. **Empty File**
   - Create and upload an empty Excel file
   - Verify that an appropriate error message is displayed

3. **Missing Required Columns**
   - Create an Excel file missing some of the required columns
   - Upload it and verify that an appropriate error message is displayed

4. **Network Interruption**
   - Disable your network connection during upload
   - Verify that an appropriate error message is displayed

## Step 5: API Testing

Test the API endpoint directly:

1. Use a tool like Postman or curl to send a POST request to:
   ```
   http://localhost:3000/api/process-excel
   ```

2. Include a JSON body with:
   ```json
   {
     "path": "merchant/test-transactions.xlsx"
   }
   ```

3. Verify that the API returns a success response with the number of inserted records

## Step 6: Edge Function Testing (If Using Supabase Edge Function)

If you're using the Supabase Edge Function approach:

1. Deploy the Edge Function:
   ```bash
   cd supabase/functions/parse-excel
   supabase functions deploy parse-excel --project-ref <your-project-ref>
   ```

2. Test the Edge Function directly:
   ```bash
   curl -X POST https://<your-project-ref>.supabase.co/functions/v1/parse-excel \
     -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"fileKey": "merchant/test-transactions.xlsx"}'
   ```

3. Verify that the function returns a success response with the number of processed records

## Troubleshooting

If you encounter issues during testing:

1. **File Upload Fails**
   - Check Supabase storage bucket permissions
   - Verify that the file size is within limits
   - Check browser console for errors

2. **Processing Fails**
   - Check that the API route or Edge Function is correctly implemented
   - Verify that the Excel file format matches the expected format
   - Check server logs for errors

3. **Database Insertion Fails**
   - Verify that the `merchant_transactions` table exists with the correct schema
   - Check that the processed data matches the table schema
   - Look for database constraint violations

## Conclusion

After completing these tests, you should have verified:

1. The UploadExcel component correctly uploads files to Supabase Storage
2. The API route correctly processes Excel files and stores data in the database
3. The system handles errors appropriately and provides meaningful feedback
4. The full flow from upload to database storage works seamlessly

This testing process ensures that your Excel upload feature is working correctly and ready for production use.
