# Environment Variables Setup Guide

This guide helps you set up all the required environment variables for the Ireland Pay CRM integration.

## Required Environment Variables

### 1. Ireland Pay CRM API Credentials
```bash
# Primary API key for Ireland Pay CRM
IRELANDPAY_CRM_API_KEY=your-irelandpay-crm-api-key-here

# Optional: Custom base URL (defaults to https://crm.ireland-pay.com/api/v1)
IRELANDPAY_CRM_BASE_URL=https://crm.ireland-pay.com/api/v1
```

### 2. Resilience Configuration
```bash
# Maximum retry attempts for failed operations (default: 3)
IRELANDPAY_MAX_RETRIES=3

# Base delay in milliseconds for exponential backoff (default: 1000)
IRELANDPAY_BACKOFF_BASE_MS=1000

# Timeout in seconds for HTTP requests (default: 30)
IRELANDPAY_TIMEOUT_SECONDS=30

# Number of consecutive failures before opening circuit breaker (default: 5)
IRELANDPAY_CIRCUIT_MAX_FAILURES=5

# Time in seconds after which to reset circuit breaker (default: 60)
IRELANDPAY_CIRCUIT_RESET_SECONDS=60
```

### 3. Supabase Configuration (Existing)
```bash
# Supabase project URL
SUPABASE_URL=your-supabase-project-url

# Supabase service role key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Public Supabase URL (for client-side)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url

# Public Supabase anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Platform-Specific Setup

### Vercel Environment Variables

1. **Go to your Vercel dashboard**
2. **Navigate to your project**
3. **Go to Settings → Environment Variables**
4. **Add the following variables:**

#### Production Environment
```bash
IRELANDPAY_CRM_API_KEY=your-production-api-key
IRELANDPAY_CRM_BASE_URL=https://crm.ireland-pay.com/api/v1
IRELANDPAY_MAX_RETRIES=3
IRELANDPAY_BACKOFF_BASE_MS=1000
IRELANDPAY_TIMEOUT_SECONDS=30
IRELANDPAY_CIRCUIT_MAX_FAILURES=5
IRELANDPAY_CIRCUIT_RESET_SECONDS=60
```

#### Preview Environment (for testing)
```bash
IRELANDPAY_CRM_API_KEY=your-test-api-key
IRELANDPAY_CRM_BASE_URL=https://crm.ireland-pay.com/api/v1
IRELANDPAY_MAX_RETRIES=2
IRELANDPAY_BACKOFF_BASE_MS=500
IRELANDPAY_TIMEOUT_SECONDS=15
IRELANDPAY_CIRCUIT_MAX_FAILURES=3
IRELANDPAY_CIRCUIT_RESET_SECONDS=30
```

### Supabase Environment Variables

1. **Go to your Supabase dashboard**
2. **Navigate to your project**
3. **Go to Settings → API**
4. **Add the following variables:**

#### Edge Functions Environment
```bash
IRELANDPAY_CRM_API_KEY=your-production-api-key
IRELANDPAY_CRM_BASE_URL=https://crm.ireland-pay.com/api/v1
IRELANDPAY_MAX_RETRIES=3
IRELANDPAY_BACKOFF_BASE_MS=1000
IRELANDPAY_TIMEOUT_SECONDS=30
IRELANDPAY_CIRCUIT_MAX_FAILURES=5
IRELANDPAY_CIRCUIT_RESET_SECONDS=60
```

## Local Development Setup

### 1. Create `.env.local` file
```bash
# Copy the existing .env.example and update with new variables
cp .env.example .env.local
```

### 2. Update `.env.local` with Ireland Pay CRM variables
```bash
# Ireland Pay CRM Configuration
IRELANDPAY_CRM_API_KEY=your-local-api-key
IRELANDPAY_CRM_BASE_URL=https://crm.ireland-pay.com/api/v1

# Resilience Configuration
IRELANDPAY_MAX_RETRIES=2
IRELANDPAY_BACKOFF_BASE_MS=500
IRELANDPAY_TIMEOUT_SECONDS=15
IRELANDPAY_CIRCUIT_MAX_FAILURES=3
IRELANDPAY_CIRCUIT_RESET_SECONDS=30

# Existing Supabase configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing Environment Variables

### 1. Test API Connectivity
```bash
# Test the API connection
curl -H "X-API-KEY: YOUR_API_KEY" \
     https://crm.ireland-pay.com/api/v1/merchants
```

### 2. Test Environment Variables in Code
```bash
# Run the test suite
npm test -- tests/test_irelandpay_crm_sync.py
```

### 3. Test API Endpoints
```bash
# Test the sync status endpoint
curl http://localhost:3000/api/sync-irelandpay-crm/status
```

## Verification Checklist

### Before Deployment
- [ ] Ireland Pay CRM API key is valid and has proper permissions
- [ ] All environment variables are set in Vercel
- [ ] All environment variables are set in Supabase
- [ ] Local development environment is working
- [ ] API connectivity test passes
- [ ] Test suite passes

### After Deployment
- [ ] Production API endpoints are responding
- [ ] Sync operations are working
- [ ] No errors in application logs
- [ ] Data is being synced correctly
- [ ] UI components are functioning

## Troubleshooting

### Common Issues

1. **"Missing IRELANDPAY_CRM_API_KEY" error**
   - Check that the environment variable is set correctly
   - Verify the variable name spelling
   - Ensure the variable is available in the correct environment

2. **API authentication errors**
   - Verify the API key is valid
   - Check that the API key has the required permissions
   - Ensure the base URL is correct

3. **Timeout errors**
   - Increase `IRELANDPAY_TIMEOUT_SECONDS` if needed
   - Check network connectivity
   - Verify API endpoint availability

4. **Circuit breaker errors**
   - Check if the API is experiencing issues
   - Review error logs for specific failure reasons
   - Consider adjusting circuit breaker settings

## Security Notes

- Never commit API keys to version control
- Use different API keys for different environments
- Rotate API keys regularly
- Monitor API usage and set up alerts for unusual activity
- Use environment-specific configurations

## Support

If you encounter issues with environment setup:
1. Check the troubleshooting section above
2. Review the API documentation
3. Contact your Ireland Pay CRM administrator
4. Check the application logs for detailed error messages 