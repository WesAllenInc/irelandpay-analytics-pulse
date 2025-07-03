# IrelandPay Analytics Pulse - Project Structure

This document provides an overview of the project structure after the IRIS CRM API integration migration. It highlights key files and directories related to the new API-driven approach.

## Core Directories

### API Client and Sync Logic
- `/lib/iriscrm_client/` - Custom Python client for IRIS CRM API
- `/lib/iriscrm_sync.py` - IRIS CRM synchronization manager

### Backend API Components
- `/supabase/functions/sync-iriscrm/` - Supabase Edge Function for data synchronization
- `/supabase/functions/legacy-excel-parser-py/` - Archived Excel parser (reference only)

### Frontend Components
- `/components/IRISCRMSync.tsx` - React component for IRIS CRM sync UI
- `/components/legacy-excel/` - Archived Excel upload components (reference only)

### API Routes
- `/app/api/sync-iriscrm/route.ts` - Next.js API route for triggering and monitoring syncs

### Pages
- `/app/dashboard/sync/page.tsx` - Dashboard page for IRIS CRM sync UI

### Tests
- `/__tests__/iriscrm-sync.test.ts` - Tests for IRIS CRM sync functionality

### Documentation
- `/docs/IRIS_CRM_MIGRATION.md` - Comprehensive migration documentation
- `/docs/PROJECT_STRUCTURE.md` - Project structure overview (this file)

## Key Files by Category

### API Integration
- `/lib/iriscrm_client/__init__.py` - Package definition for IRIS CRM client
- `/lib/iriscrm_client/client.py` - Main API client implementation
- `/lib/iriscrm_sync.py` - Sync manager and data transformation logic

### Edge Functions
- `/supabase/functions/sync-iriscrm/index.ts` - Edge Function entry point
- `/supabase/functions/sync-iriscrm/iriscrm_sync.py` - Python sync script

### UI Components
- `/components/IRISCRMSync.tsx` - IRIS CRM sync UI component
- `/app/dashboard/sync/page.tsx` - Sync dashboard page

### Configuration
- `/.env.local.example` - Example environment configuration with IRIS CRM API variables

## Database Schema

### New Tables
- `sync_status` - Tracks IRIS CRM API synchronization status and history
- `sync_logs` - Detailed logs of synchronization operations

### Updated Tables
- `merchants` - Merchants data from IRIS CRM API
- `residuals` - Residual data from IRIS CRM API
- `transactions` - Transaction volume data derived from IRIS CRM API

## Removed Files

The following files have been removed as part of the migration:
- `/components/UploadExcel.tsx` - Legacy Excel upload component
- `/components/ExcelUploadStatus.tsx` - Legacy Excel upload status component
- `/lib/ingestion.ts` - Legacy ingestion logic for Excel files
- `/supabase/functions/excel-parser-py/` - Legacy Excel parser Edge Function

## Data Flow Architecture

### API Data Flow
1. IRIS CRM API is accessed via the custom Python client
2. Data is fetched and transformed by the sync manager
3. Transformed data is stored in the Supabase database
4. Frontend components access the data through Supabase queries

### Sync Flow
1. User initiates sync via the UI or automated schedule
2. Next.js API route receives the request
3. Supabase Edge Function is invoked with sync parameters
4. Python sync script executes and processes data
5. Sync status and results are stored in the database
6. UI polls for updates and displays sync status/results

## Development Guidelines

### Adding New Data Types
To add support for additional IRIS CRM data types:
1. Add new methods to the IRIS CRM client
2. Implement sync logic in the sync manager
3. Update the Edge Function to handle the new data type
4. Add UI controls for the new data type in the sync component

### Testing
- Unit tests: Run with `npm run test`
- Integration tests: Ensure proper database setup before running

### Environment Setup
Required environment variables:
```
IRIS_CRM_API_KEY=your-iris-crm-api-key
IRIS_CRM_BASE_URL=https://iriscrm.com/api/v1
```
