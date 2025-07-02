# Excel Parser Python Edge Function

This Supabase Edge Function handles Excel file parsing using Python's pandas library. It replaces the JavaScript-based XLSX parsing with a more robust Python implementation.

## Features

- Processes Excel files uploaded to Supabase Storage
- Handles both residual and volume data
- Uses pandas for Excel parsing
- Updates the database with parsed data
- Provides comprehensive error logging

## Deployment

To deploy this Edge Function to your Supabase project:

```bash
# Navigate to the function directory
cd supabase/functions/excel-parser-py

# Deploy the function
supabase functions deploy excel-parser-py --no-verify-jwt

# Set environment variables
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

This function is called from the TypeScript ingestion module:

```typescript
// Example call from ingestion.ts
const { data, error } = await supabase
  .functions
  .invoke('excel-parser-py', {
    body: JSON.stringify({
      fileKey: 'path/to/file.xlsx',
      fileType: 'residuals', // or 'volumes'
      fileName: 'file.xlsx'
    })
  });
```

## API

### Request Format

```json
{
  "fileKey": "path/to/uploaded/file.xlsx",
  "fileType": "residuals|volumes",
  "fileName": "originalFileName.xlsx"
}
```

### Response Format

```json
{
  "fileName": "originalFileName.xlsx",
  "fileType": "residuals|volumes",
  "totalRows": 100,
  "rowsSuccess": 95,
  "rowsFailed": 5,
  "errorLog": {
    "2": "Error message for row 2",
    "10": "Error message for row 10"
  }
}
```

## Dependencies

- pandas
- openpyxl
- supabase-py
- python-dotenv

## Error Handling

The function includes comprehensive error handling:
- File access errors
- Excel parsing errors
- Database operation errors
- Individual row processing errors

Errors are logged both in the function response and in the Supabase database for audit purposes.
