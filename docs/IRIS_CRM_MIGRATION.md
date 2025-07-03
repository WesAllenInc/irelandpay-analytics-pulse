# IRIS CRM API Integration - Migration Documentation

This document provides a comprehensive overview of the migration from manual Excel file uploads to automated IRIS CRM API integration in the IrelandPay Analytics Pulse application.

## Migration Overview

### Previous Workflow
The previous workflow required manual uploads of Excel files containing merchant and residual data. This process involved:
1. Downloading Excel reports from IRIS CRM
2. Manual data cleaning and formatting
3. Uploading the Excel files through the web interface
4. Processing the data using a Python Edge Function that parsed the Excel files
5. Manual tracking of data freshness and sync status

### New Workflow
The new workflow automates data synchronization directly from the IRIS CRM API:
1. Automated daily sync of merchant, residual, and transaction data from IRIS CRM
2. On-demand sync capabilities through a user-friendly interface
3. Real-time sync status tracking and history
4. Elimination of manual Excel downloads and uploads
5. Consistent data format and structure directly from the API source

## Technical Implementation

### Core Components Added
1. **IRIS CRM API Client** (`lib/iriscrm_client/`)
   - Custom Python client for IRIS CRM API
   - Handles authentication and API request formatting
   - Provides methods for all required IRIS CRM endpoints

2. **Sync Manager** (`lib/iriscrm_sync.py`)
   - Coordinates data fetching, transformation, and storage
   - Handles synchronization of merchants, residuals, and transaction volumes
   - Manages relationships between merchants and agents

3. **Edge Function** (`supabase/functions/sync-iriscrm/`)
   - Handles API synchronization requests
   - Executes the Python sync script
   - Tracks sync status and history

4. **API Routes** (`app/api/sync-iriscrm/`)
   - Provides Next.js API endpoints for triggering and monitoring syncs
   - Includes proper error handling and status reporting

5. **UI Components** (`components/IRISCRMSync.tsx`, `app/dashboard/sync/`)
   - Modern interface for triggering and monitoring syncs
   - Displays sync history and status
   - Provides filtering options for data types and date ranges

### Removed Components
The following components have been archived and can be safely removed:
1. `components/UploadExcel.tsx` - Excel file upload interface
2. `components/ExcelUploadStatus.tsx` - Excel upload status tracking
3. `lib/ingestion.ts` - Excel file processing and ingestion logic
4. `supabase/functions/excel-parser-py/` - Excel parsing Edge Function

### Database Changes
1. Added new tables:
   - `sync_status` - Tracks IRIS CRM API synchronization status and history
   - `sync_logs` - Detailed logs of synchronization operations

2. Updated existing tables:
   - `merchants` - Added `last_sync` field to track when a merchant was last updated
   - No schema changes were required for `residuals`, `agents`, or other tables

### Environment Configuration
Added new environment variables for IRIS CRM API integration:
```
IRIS_CRM_API_KEY=your-iris-crm-api-key
IRIS_CRM_BASE_URL=https://iriscrm.com/api/v1
```

## Testing and Validation

### Unit Tests
- Added unit tests for the IRIS CRM API client and sync functionality
- Tests cover error handling, API responses, and data transformation
- All tests can be run using Vitest with `npm run test`

### Integration Tests
- End-to-end tests validate the complete sync flow
- Tests include:
  - Merchant data synchronization
  - Residual data synchronization
  - Transaction volume calculation
  - Error handling and recovery

## Deployment Instructions

1. **Environment Variables**
   - Add the IRIS CRM API key to your environment configuration
   - See `.env.local.example` for reference

2. **Database Setup**
   - Create the `sync_status` and `sync_logs` tables if they don't exist
   - Example migrations are included in the codebase

3. **Edge Function Deployment**
   - Deploy the `sync-iriscrm` Edge Function to your Supabase project
   - Ensure Python dependencies are installed in the Edge Function environment

4. **Initial Sync**
   - Perform an initial full sync using the new interface at `/dashboard/sync`
   - Verify that merchants and residuals data is correctly synchronized

## Troubleshooting

### Common Issues

#### Sync Fails with API Errors
- Verify that your IRIS CRM API token is valid and has required permissions
- Check that the API base URL is correctly configured
- Examine logs for specific API error messages

#### Missing Data After Sync
- Ensure that the data exists in IRIS CRM for the selected time period
- Verify database schema compatibility
- Check the sync logs for specific error messages

#### Long-Running Syncs
- For large datasets, sync operations may take several minutes
- Consider syncing smaller date ranges or specific data types
- Monitor sync status through the UI or API

## Future Enhancements

1. **Scheduled Syncs**
   - Implement automatic daily/weekly sync scheduling
   - Add configurable sync frequency options

2. **Incremental Syncs**
   - Optimize sync process to only fetch new or changed data
   - Reduce API load and sync duration

3. **Extended Data Points**
   - Add support for additional IRIS CRM data types
   - Implement custom data mappings for specific business needs

## References

- [IRIS CRM API Documentation](https://iriscrm.com/api/docs)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)
