# Parse Excel Edge Function

This Supabase Edge Function processes Excel files uploaded to Supabase Storage, extracts the data, and stores it in the database.

## Prerequisites

- Supabase project with Storage and Database set up
- Supabase CLI installed (`npm install -g supabase`)
- A `merchant_transactions` table in your Supabase database

## Database Setup

Before deploying this function, ensure you have created the necessary table:

```sql
CREATE TABLE merchant_transactions (
  id BIGSERIAL PRIMARY KEY,
  merchant_id TEXT,
  merchant_name TEXT,
  transaction_date TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Storage Setup

Ensure you have a bucket named `uploads` in your Supabase Storage:

```bash
supabase storage create bucket uploads --public=false
```

## Deployment

Deploy the function using the Supabase CLI:

```bash
# Navigate to the project root
cd /path/to/project

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy parse-excel --no-verify-jwt
```

## Usage

After uploading an Excel file to the `uploads` bucket in the `merchant` folder, call this function with the file key:

```typescript
const { data, error } = await supabaseClient
  .functions
  .invoke("parse-excel", {
    body: { fileKey: "your-file-name.xlsx" }
  });
```

## Expected Excel Format

The Excel file should have columns that match the following field names (case-sensitive):

- `merchantId`: Unique identifier for the merchant
- `merchantName`: Name of the merchant
- `transactionDate`: Date of the transaction
- `amount`: Transaction amount (numeric)
- `currency`: Currency code (e.g., "USD")
- `status`: Transaction status

Additional columns will be stored in the `raw_data` JSON field.

## Response Format

Successful response:
```json
{
  "success": true,
  "message": "Successfully processed X records",
  "summary": {
    "totalRecords": X,
    "fileName": "your-file-name.xlsx"
  }
}
```

Error response:
```json
{
  "error": "Error message"
}
```

## Environment Variables

The function requires the following environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin access)

Set these using the Supabase CLI:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Note: The `SUPABASE_URL` is automatically available in the Edge Function environment.
