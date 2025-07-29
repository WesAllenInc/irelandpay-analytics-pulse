# Ireland Pay CRM Migration - Deployment Checklist

This checklist guides you through the complete deployment process for the Ireland Pay CRM migration.

## Pre-Deployment Checklist

### ✅ Environment Variables Setup

#### Vercel Environment Variables
- [ ] `IRELANDPAY_CRM_API_KEY` - Your Ireland Pay CRM API key
- [ ] `IRELANDPAY_CRM_BASE_URL` - Ireland Pay CRM base URL (https://crm.ireland-pay.com/api/v1)
- [ ] `IRELANDPAY_MAX_RETRIES` - Maximum retry attempts (default: 3)
- [ ] `IRELANDPAY_BACKOFF_BASE_MS` - Backoff delay in milliseconds (default: 1000)
- [ ] `IRELANDPAY_TIMEOUT_SECONDS` - Request timeout in seconds (default: 30)
- [ ] `IRELANDPAY_CIRCUIT_MAX_FAILURES` - Circuit breaker threshold (default: 5)
- [ ] `IRELANDPAY_CIRCUIT_RESET_SECONDS` - Circuit breaker reset time (default: 60)

#### Supabase Environment Variables
- [ ] `IRELANDPAY_CRM_API_KEY` - Your Ireland Pay CRM API key
- [ ] `IRELANDPAY_CRM_BASE_URL` - Ireland Pay CRM base URL
- [ ] `IRELANDPAY_MAX_RETRIES` - Maximum retry attempts
- [ ] `IRELANDPAY_BACKOFF_BASE_MS` - Backoff delay in milliseconds
- [ ] `IRELANDPAY_TIMEOUT_SECONDS` - Request timeout in seconds
- [ ] `IRELANDPAY_CIRCUIT_MAX_FAILURES` - Circuit breaker threshold
- [ ] `IRELANDPAY_CIRCUIT_RESET_SECONDS` - Circuit breaker reset time

#### Local Development Environment
- [ ] `.env.local` file created with all required variables
- [ ] Local development server starts without errors
- [ ] API endpoints are accessible locally

### ✅ Code Review
- [ ] All files have been migrated from Iris CRM to Ireland Pay CRM
- [ ] No references to old Iris CRM remain in the codebase
- [ ] All imports and exports are correctly updated
- [ ] Test files are updated and passing
- [ ] Documentation is updated

### ✅ API Credentials Verification
- [ ] Ireland Pay CRM API key is valid and has proper permissions
- [ ] API key can access required endpoints (merchants, residuals, transactions)
- [ ] Base URL is correct and accessible
- [ ] Authentication method (Bearer token) is working

## Deployment Steps

### Step 1: Local Testing
```bash
# 1. Install dependencies
npm install

# 2. Run the integration test
node scripts/test-irelandpay-integration.js

# 3. Start local development server
npm run dev

# 4. Test the sync functionality locally
curl http://localhost:3000/api/sync-irelandpay-crm/status
```

### Step 2: Build Verification
```bash
# 1. Build the application
npm run build

# 2. Verify build output
# Check that no build errors occur
# Verify that all components are properly bundled
```

### Step 3: Supabase Edge Functions Deployment
```bash
# 1. Link to Supabase project (if not already linked)
supabase link --project-ref YOUR_SUPABASE_PROJECT_ID

# 2. Deploy the edge function
supabase functions deploy sync-irelandpay-crm

# 3. Verify function deployment
supabase functions list
```

### Step 4: Vercel Deployment
```bash
# 1. Deploy to Vercel
vercel --prod

# 2. Verify deployment
# Check that the deployment URL is accessible
# Verify that all environment variables are set correctly
```

### Step 5: Post-Deployment Verification
```bash
# 1. Run the monitoring script
node scripts/monitor-irelandpay-integration.js

# 2. Test production endpoints
curl https://your-app.vercel.app/api/sync-irelandpay-crm/status

# 3. Test sync functionality
curl -X POST https://your-app.vercel.app/api/sync-irelandpay-crm \
  -H "Content-Type: application/json" \
  -d '{"dataType": "merchants"}'
```

## Verification Checklist

### ✅ API Endpoints
- [ ] `/api/sync-irelandpay-crm/status` returns 200 OK
- [ ] `/api/sync-irelandpay-crm` accepts POST requests
- [ ] Error handling works correctly
- [ ] Authentication is working

### ✅ Database Connectivity
- [ ] Supabase connection is working
- [ ] Tables are accessible (merchants, residual_payouts, merchant_metrics)
- [ ] Sync status table is being updated
- [ ] No database errors in logs

### ✅ Sync Functionality
- [ ] Merchants sync works correctly
- [ ] Residuals sync works correctly
- [ ] Volumes sync works correctly
- [ ] Error handling and retries work
- [ ] Circuit breaker pattern is functioning

### ✅ Frontend Components
- [ ] Sync page loads without errors
- [ ] Ireland Pay CRM sync component is displayed
- [ ] Sync history is showing correctly
- [ ] UI interactions work as expected

### ✅ Error Handling
- [ ] API errors are handled gracefully
- [ ] Network timeouts are handled
- [ ] Circuit breaker opens and closes correctly
- [ ] Error messages are user-friendly

## Monitoring Setup

### ✅ Logging Configuration
- [ ] Application logs are being captured
- [ ] Error logs are being captured
- [ ] Sync operation logs are being captured
- [ ] Log rotation is configured

### ✅ Health Checks
- [ ] Health check endpoint is working
- [ ] Monitoring script is running
- [ ] Alerts are configured for critical issues
- [ ] Dashboard shows system health

### ✅ Performance Monitoring
- [ ] API response times are being tracked
- [ ] Sync operation performance is monitored
- [ ] Database query performance is tracked
- [ ] Error rates are being monitored

## Rollback Plan

### If Issues Occur
1. **Immediate Actions**
   - [ ] Stop any ongoing sync operations
   - [ ] Check application logs for errors
   - [ ] Verify environment variables are correct
   - [ ] Test API connectivity manually

2. **Rollback Steps**
   - [ ] Revert to previous deployment if needed
   - [ ] Restore old environment variables
   - [ ] Deploy previous version
   - [ ] Verify system is working

3. **Investigation**
   - [ ] Review error logs
   - [ ] Check API documentation
   - [ ] Verify credentials
   - [ ] Test with different API keys

## Success Criteria

### ✅ Functional Requirements
- [ ] All sync operations complete successfully
- [ ] Data is being synced correctly from Ireland Pay CRM
- [ ] No data loss during migration
- [ ] Performance is acceptable

### ✅ Non-Functional Requirements
- [ ] System is stable and reliable
- [ ] Error handling works correctly
- [ ] Monitoring is in place
- [ ] Documentation is updated

### ✅ User Experience
- [ ] UI is responsive and user-friendly
- [ ] Error messages are clear
- [ ] Sync status is visible
- [ ] No disruption to existing functionality

## Post-Deployment Tasks

### ✅ Documentation Updates
- [ ] Update deployment documentation
- [ ] Update user guides
- [ ] Update API documentation
- [ ] Update troubleshooting guides

### ✅ Team Communication
- [ ] Notify stakeholders of successful migration
- [ ] Update team on new system capabilities
- [ ] Provide training if needed
- [ ] Share monitoring dashboard access

### ✅ Monitoring and Maintenance
- [ ] Set up regular health checks
- [ ] Configure alerts for critical issues
- [ ] Schedule regular maintenance
- [ ] Plan for future updates

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. API Authentication Errors
**Symptoms**: 401 Unauthorized errors
**Solutions**:
- Verify API key is correct
- Check API key permissions
- Ensure Bearer token format is correct

#### 2. Network Timeout Errors
**Symptoms**: Request timeout errors
**Solutions**:
- Increase timeout settings
- Check network connectivity
- Verify API endpoint availability

#### 3. Database Connection Errors
**Symptoms**: Database connection failures
**Solutions**:
- Verify Supabase credentials
- Check database permissions
- Ensure tables exist and are accessible

#### 4. Sync Operation Failures
**Symptoms**: Sync operations failing
**Solutions**:
- Check API response format
- Verify data transformation logic
- Review error logs for specific issues

## Support Contacts

### Technical Support
- **Development Team**: [Your contact]
- **Ireland Pay CRM Admin**: [CRM admin contact]
- **Infrastructure Team**: [Infrastructure contact]

### Emergency Contacts
- **On-call Engineer**: [Emergency contact]
- **System Administrator**: [Admin contact]
- **Project Manager**: [PM contact]

## Final Verification

Before considering the deployment complete:

- [ ] All checklist items are completed
- [ ] All tests are passing
- [ ] Monitoring is active
- [ ] Team is notified
- [ ] Documentation is updated
- [ ] Rollback plan is ready
- [ ] Support contacts are available

---

**Deployment Date**: [DATE]
**Deployed By**: [NAME]
**Verified By**: [NAME]
**Status**: [COMPLETED/IN PROGRESS/FAILED]
