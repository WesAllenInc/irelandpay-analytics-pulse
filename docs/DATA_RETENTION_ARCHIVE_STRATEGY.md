# Data Retention & Archive Strategy

## Overview

The Data Retention & Archive Strategy implements a comprehensive system for storing unlimited historical merchant data starting from April 2024. This system uses PostgreSQL partitioning, materialized views, and automated maintenance to ensure optimal performance while maintaining complete historical records.

## Architecture

### Database Structure

#### Partitioned Tables
- **`merchant_data_partitioned`**: Main partitioned table storing all merchant data
  - Partitioned by `month` (date range)
  - Monthly partitions: `merchant_data_YYYY_MM`
  - Primary key: `(id, month)` for partition-aware queries

#### Materialized Views
- **`merchant_monthly_summary`**: Pre-computed monthly aggregations
  - Automatically refreshed after data changes
  - Optimized for common query patterns

#### Indexes
- `idx_merchant_data_partitioned_merchant_id`: For merchant-specific queries
- `idx_merchant_data_partitioned_month`: For date range queries
- `idx_merchant_data_partitioned_mid`: For MID lookups
- `idx_merchant_data_partitioned_sync_id`: For sync tracking

### Key Features

1. **Unlimited Storage**: Monthly partitioning allows storing years of data without performance degradation
2. **Fast Queries**: Partition pruning ensures only relevant data is scanned
3. **Automatic Maintenance**: Scheduled tasks handle partition creation and optimization
4. **Performance Monitoring**: Real-time health checks and alerting
5. **Data Export**: Multiple formats with filtering and validation

## Implementation Components

### 1. Database Migration
File: `supabase/migrations/20250130_enhanced_data_retention_partitioning.sql`

Creates:
- Partitioned table structure
- Monthly partitions from April 2024
- Materialized views and indexes
- Automated partition creation functions
- Retention statistics functions

### 2. Archive Manager Service
File: `lib/archive/archive-manager.ts`

Provides:
- Historical data querying with optimization
- Retention statistics and monitoring
- Partition health management
- Query optimization recommendations

### 3. UI Components

#### Historical Data Viewer
File: `components/data/HistoricalDataViewer.tsx`
- Date range selection
- Merchant filtering
- Chart and table views
- Data export functionality
- Real-time summary statistics

#### Archive Statistics Dashboard
File: `components/admin/ArchiveStatsDashboard.tsx`
- Storage usage monitoring
- Partition health tracking
- Performance metrics
- Automated refresh

### 4. API Routes

#### Historical Data API
File: `app/api/data/historical/route.ts`
- POST/GET endpoints for data queries
- Parameter validation
- Error handling
- Summary statistics

#### Maintenance API
File: `app/api/cron/archive-maintenance/route.ts`
- Automated maintenance tasks
- Partition creation and optimization
- Health monitoring
- Alert generation

### 5. Admin Integration
File: `components/admin/AdminSettings.tsx`
- Tabbed interface for archive management
- Session management
- Security information

## Usage Instructions

### For Administrators

#### Accessing Archive Management
1. Navigate to Admin Settings
2. Click on "Data Archive" tab
3. View archive statistics and partition health

#### Using Historical Data Viewer
1. Navigate to `/admin/data-archive`
2. Select date range (April 2024 onwards)
3. Optionally filter by merchant ID
4. Choose chart or table view
5. Export data as needed

#### Monitoring Archive Health
- Check partition health status
- Monitor storage growth trends
- Review maintenance task results
- Set up alerts for issues

### For Developers

#### Querying Historical Data
```typescript
import { ArchiveManager } from '@/lib/archive/archive-manager';

const archiveManager = new ArchiveManager();

// Query historical data
const data = await archiveManager.queryHistoricalData({
  startDate: '2024-04-01',
  endDate: '2024-12-31',
  merchantId: 'optional-merchant-id',
  metrics: ['total_volume', 'total_transactions', 'net_revenue']
});

// Get retention statistics
const stats = await archiveManager.getRetentionStats();

// Get partition health
const health = await archiveManager.getPartitionHealth();
```

#### API Usage
```bash
# Query historical data
POST /api/data/historical
{
  "startDate": "2024-04-01",
  "endDate": "2024-12-31",
  "merchantId": "optional",
  "metrics": ["total_volume", "total_transactions"]
}

# Get archive statistics
GET /api/cron/archive-maintenance
Authorization: Bearer <CRON_SECRET>
```

## Maintenance Procedures

### Automated Tasks

#### Daily Maintenance
- Partition health checks
- Storage monitoring
- Performance analysis

#### Weekly Maintenance (Sundays at 2 AM)
- Create future partitions (3 months ahead)
- Analyze partitions for optimization
- Refresh materialized views
- Clean up orphaned data
- Generate storage reports

#### Monthly Maintenance
- Comprehensive partition analysis
- Index optimization
- Storage growth analysis
- Alert threshold review

### Manual Maintenance

#### Creating Partitions
```sql
-- Create partition for specific month
SELECT create_partition_if_not_exists(
  'merchant_data_2025_01',
  '2025-01-01',
  '2025-02-01'
);
```

#### Refreshing Materialized Views
```sql
-- Refresh summary views
SELECT refresh_summary_views();
```

#### Analyzing Partitions
```sql
-- Analyze specific partition
SELECT analyze_partition('merchant_data_2024_04');

-- Get partitions needing analysis
SELECT * FROM get_partitions_for_analysis();
```

### Monitoring and Alerts

#### Storage Alerts
- Growth rate > 50% in a month
- Partition size > 1GB
- Unhealthy partitions detected

#### Performance Alerts
- Query response time > 5 seconds
- Partition analysis overdue
- Materialized view refresh failures

#### Health Checks
- Partition accessibility
- Index efficiency
- Data integrity
- Backup status

## Performance Optimization

### Query Optimization
1. **Use Partition Pruning**: Always include date filters
2. **Leverage Materialized Views**: For common aggregations
3. **Optimize Index Usage**: Use indexed columns in WHERE clauses
4. **Limit Result Sets**: Use LIMIT and pagination

### Storage Optimization
1. **Regular Analysis**: Keep partition statistics current
2. **Index Maintenance**: Rebuild indexes when needed
3. **Vacuum Operations**: Clean up dead tuples
4. **Compression**: Consider table compression for old partitions

### Monitoring Best Practices
1. **Regular Health Checks**: Daily partition health monitoring
2. **Performance Tracking**: Query response time monitoring
3. **Storage Planning**: Growth trend analysis
4. **Capacity Planning**: Proactive storage management

## Troubleshooting

### Common Issues

#### Partition Creation Failures
- Check available disk space
- Verify partition naming conventions
- Ensure proper permissions
- Review error logs

#### Query Performance Issues
- Verify partition pruning is working
- Check index usage with EXPLAIN
- Review materialized view freshness
- Analyze partition statistics

#### Storage Growth Issues
- Monitor partition sizes
- Check for data duplication
- Review retention policies
- Consider archiving old data

### Debugging Commands

```sql
-- Check partition status
SELECT tablename, pg_size_pretty(pg_table_size(tablename::regclass))
FROM pg_tables 
WHERE tablename LIKE 'merchant_data_%'
ORDER BY tablename;

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM merchant_data_partitioned 
WHERE month >= '2024-04-01' AND month <= '2024-12-31';

-- Check materialized view status
SELECT schemaname, matviewname, definition 
FROM pg_matviews 
WHERE matviewname = 'merchant_monthly_summary';
```

## Security Considerations

### Access Control
- Admin-only access to archive management
- Role-based permissions for data access
- Audit logging for all operations
- Secure API endpoints with authentication

### Data Protection
- Encrypted storage for sensitive data
- Secure data export with validation
- Backup encryption
- Access audit trails

### Compliance
- Data retention policy enforcement
- Export audit trails
- Data integrity validation
- Regulatory compliance monitoring

## Future Enhancements

### Planned Features
1. **Tiered Storage**: Move old partitions to cheaper storage
2. **Advanced Analytics**: Machine learning insights
3. **Real-time Streaming**: Live data ingestion
4. **Multi-region Support**: Geographic data distribution

### Scalability Improvements
1. **Horizontal Partitioning**: Distribute across multiple servers
2. **Read Replicas**: Separate read/write operations
3. **Caching Layer**: Redis integration for hot data
4. **Compression**: Advanced compression algorithms

## Support and Maintenance

### Documentation
- Keep this document updated
- Maintain API documentation
- Update troubleshooting guides
- Document configuration changes

### Monitoring
- Set up comprehensive alerting
- Regular performance reviews
- Capacity planning sessions
- Security audits

### Training
- Admin user training
- Developer onboarding
- Best practices workshops
- Troubleshooting sessions

---

For technical support or questions about the Data Retention & Archive Strategy, please contact the development team or refer to the system documentation. 