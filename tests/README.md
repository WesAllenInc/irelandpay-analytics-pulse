# Testing Guide

This document outlines the testing strategy and procedures for the IrelandPay Analytics application.

## Database Setup

Ensure your Supabase database has the required tables and structure:

```sql
-- Create merchant_transactions table
CREATE TABLE IF NOT EXISTS public.merchant_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT,
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

## Test Plan

### 1. API Integration Testing

The application now uses API-based data sync instead of Excel file uploads. Test the following:

1. **CRM API Connection**
   - Verify connection to IrelandPay CRM API
   - Test authentication and authorization
   - Verify data retrieval endpoints

2. **Data Sync Process**
   - Test automatic data synchronization
   - Verify data transformation and normalization
   - Test error handling and retry mechanisms

3. **Dashboard Data Display**
   - Verify merchant data appears correctly
   - Test analytics and reporting features
   - Verify real-time data updates

### 2. Component Testing

#### Dashboard Components

1. Navigate to `/dashboard` in your application
2. Verify all dashboard components render correctly
3. Test data loading states and error handling
4. Verify responsive design on different screen sizes

#### Analytics Components

1. Test chart components with various data sets
2. Verify filtering and sorting functionality
3. Test export and reporting features

### 3. Authentication Testing

1. Test user login and logout flows
2. Verify role-based access control
3. Test session management and token refresh

### 4. Error Handling Testing

1. Test network connectivity issues
2. Test API rate limiting scenarios
3. Test invalid data handling
4. Test authentication failures

## Manual Testing Checklist

- [ ] Dashboard loads correctly
- [ ] Data sync works properly
- [ ] Charts and analytics display correctly
- [ ] User authentication works
- [ ] Error handling works correctly
- [ ] Responsive design works on mobile
- [ ] Performance is acceptable

## Automated Testing

For automated testing, use the provided test scripts:

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Performance Testing

1. Test dashboard load times
2. Test data sync performance
3. Test concurrent user scenarios
4. Monitor memory usage and CPU utilization

## Security Testing

1. Test authentication and authorization
2. Verify data encryption in transit
3. Test input validation and sanitization
4. Verify secure API communication
