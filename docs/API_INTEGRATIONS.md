# API Integrations Documentation

This document provides an overview of the different API integrations used in the Ireland Pay Analytics Pulse application.

## Current API Integrations

### 1. Ireland Pay CRM API (Primary Integration)

**Base URL**: `https://crm.ireland-pay.com/api/v1`  
**Documentation**: `irelandpay-crm-api.yaml`  
**Status**: ✅ **ACTIVE** - Fully integrated and operational

#### Purpose
- Primary data source for merchant and residual analytics
- Automated synchronization of merchant data, residuals, and transaction volumes
- Replaces manual Excel upload workflow

#### Key Features
- **Merchants API**: Get merchant lists, details, and transaction data
- **Residuals API**: Access monthly residuals reports and calculations
- **Authentication**: X-API-KEY header authentication
- **Rate Limiting**: 500 requests per minute
- **Resilience**: Built-in retry logic, circuit breaker, and error handling

#### Implementation
- **Client**: `lib/irelandpay_crm_client/client.py`
- **Sync Manager**: `lib/irelandpay_crm_sync.py`
- **Edge Function**: `supabase/functions/sync-irelandpay-crm/`
- **UI Components**: `components/IrelandPayCRMSync.tsx`

### 2. Ireland Pay CRM API (Secondary Integration)

**Base URL**: `https://crm.ireland-pay.com/api/v1`  
**Documentation**: `irelandpay-crm-api.yaml`  
**Status**: 📋 **DOCUMENTED** - API documentation available for future integration

#### Purpose
- Potential complementary data source
- Ireland Pay's internal CRM system
- May contain additional business data not available in Iris CRM

#### Key Features
- **Leads API**: Lead management and tracking
- **Merchants API**: Merchant data (similar to Iris CRM)
- **Residuals API**: Residual calculations and reports
- **Helpdesk API**: Ticket management system
- **E-Signature API**: Document signing workflows
- **Web Forms API**: Form generation and management

#### Implementation Status
- ✅ API documentation added to project
- ⏳ No active integration yet
- 🔄 Ready for future development if needed

## API Comparison

| Feature | Ireland Pay CRM API | Legacy Iris CRM API |
|---------|---------------------|-------------------|
| **Primary Use** | Analytics data source | Legacy system (deprecated) |
| **Integration Status** | Fully integrated | Deprecated |
| **Data Types** | Merchants, Residuals, Transactions | Merchants, Residuals, Transactions |
| **Authentication** | X-API-KEY | X-API-KEY |
| **Rate Limit** | 500 req/min | 500 req/min |
| **Base URL** | `https://crm.ireland-pay.com/api/v1` | `https://iriscrm.com/api/v1` |

## Future Integration Opportunities

### Potential Benefits of Ireland Pay CRM Integration

1. **Enhanced Lead Data**
   - Lead tracking and conversion analytics
   - Sales pipeline management
   - Lead-to-merchant conversion tracking

2. **Additional Merchant Insights**
   - Complementary merchant data
   - Different data granularity or timeframes
   - Alternative data validation

3. **Operational Data**
   - Helpdesk ticket analytics
   - Customer support metrics
   - Process efficiency tracking

4. **Document Management**
   - E-signature workflow tracking
   - Document completion rates
   - Compliance monitoring

### Implementation Considerations

#### When to Integrate Ireland Pay CRM API

**Consider integration if:**
- Additional lead data is needed for analytics
- Helpdesk metrics would provide valuable insights
- Document workflow tracking is required
- Data validation between systems is beneficial

**Integration Priority:**
1. **Low Priority**: Current Iris CRM integration meets primary needs
2. **Medium Priority**: If specific data gaps are identified
3. **High Priority**: If business requirements change significantly

#### Technical Implementation

If integration is needed, follow the existing pattern:

1. **Create API Client**
   ```python
   # lib/irelandpay_crm_client/client.py
   class IrelandPayCRMClient:
       BASE_URL = "https://crm.ireland-pay.com/api/v1"
   ```

2. **Add Sync Manager**
   ```python
   # lib/irelandpay_crm_sync.py
   class IrelandPayCRMSyncManager:
       # Similar to IRISCRMSyncManager
   ```

3. **Create Edge Function**
   ```typescript
   // supabase/functions/sync-irelandpay-crm/
   ```

4. **Add UI Components**
   ```typescript
   // components/IrelandPayCRMSync.tsx
   ```

## Environment Variables

### Current (Iris CRM)
```bash
IRIS_CRM_API_KEY=your-iris-crm-api-key
IRIS_CRM_BASE_URL=https://iriscrm.com/api/v1
```

### Future (Ireland Pay CRM)
```bash
IRELANDPAY_CRM_API_KEY=your-irelandpay-crm-api-key
IRELANDPAY_CRM_BASE_URL=https://crm.ireland-pay.com/api/v1
```

## Documentation Files

- `iriscrm.yaml` - Complete Iris CRM API specification
- `irelandpay-crm-api.yaml` - Ireland Pay CRM API specification (placeholder)
- `docs/IRIS_CRM_INTEGRATION_SUMMARY.md` - Detailed Iris CRM integration docs
- `docs/IRIS_CRM_MIGRATION.md` - Migration documentation
- `docs/IRIS_CRM_SYNC.md` - Sync implementation details

## Maintenance

### Regular Tasks
1. **Monitor API Health**: Check both APIs for availability and performance
2. **Update Documentation**: Keep API specs current with vendor updates
3. **Review Integration**: Assess if additional integrations provide value
4. **Security Review**: Regularly audit API key usage and permissions

### Troubleshooting
- **Iris CRM Issues**: Check `docs/IRIS_CRM_SYNC.md` for resilience features
- **API Rate Limits**: Monitor usage and implement backoff strategies
- **Authentication**: Verify API keys and permissions regularly

## Conclusion

The current Iris CRM integration provides comprehensive analytics capabilities. The Ireland Pay CRM API documentation is available for future integration if business needs require additional data sources or operational insights.

The modular architecture allows for easy addition of new API integrations while maintaining the existing robust analytics platform. 