# Ireland Pay Analytics Setup Implementation Guide

This guide covers the complete implementation of the Ireland Pay CRM setup and sync system that integrates with your existing codebase.

## Overview

The implementation includes:
1. **First-Run Setup Wizard** - Guided configuration for new installations
2. **Scheduled Sync System** - Automated data synchronization twice daily
3. **Email Notification System** - Admin notifications for sync status
4. **Admin-Only Access Control** - Secure admin-only sync management
5. **Data Retention & Archive Strategy** - Long-term data storage

## Environment Variables

Add these to your `.env.local` file:

```bash
# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
ADMIN_NOTIFICATION_EMAIL=jake@irelandpay.com

# Cron Security
CRON_SECRET=generate_secure_random_string_here

# App URL for email links
NEXT_PUBLIC_APP_URL=https://analytics.irelandpay.com
```

## Database Migrations

Run these migrations in order:

1. **API Credentials Table**:
   ```bash
   supabase db execute --file ./supabase/migrations/20250125_add_api_credentials_table.sql
   ```

2. **Data Archive Tables**:
   ```bash
   supabase db execute --file ./supabase/migrations/20250125_add_data_archive_tables.sql
   ```

## Setup Wizard Flow

### 1. First-Run Detection
- System checks if any admin users exist
- If no admins, redirects to `/setup` page
- Setup wizard guides through 6 steps

### 2. Setup Steps
1. **Welcome** - Introduction and overview
2. **Admin Setup** - Configure admin account and notifications
3. **CRM Connection** - Enter Ireland Pay CRM API credentials
4. **Connection Test** - Verify API connectivity
5. **Historical Data** - Import data from April 2024 to present
6. **Sync Schedule** - Configure automatic sync times (11 AM & 7 PM)

### 3. Setup Completion
- Creates admin user in auth system
- Stores API credentials securely
- Configures sync schedules
- Sends completion email to admin

## Scheduled Sync System

### Cron Jobs
The system uses Vercel's cron jobs for scheduling:

- **Morning Sync**: 11:00 AM daily (`0 11 * * *`)
- **Evening Sync**: 7:00 PM daily (`0 19 * * *`)
- **Data Archive**: 2:00 AM monthly (`0 2 1 * *`)

### Sync Process
1. **Merchant Sync** - Updates merchant data
2. **Transaction Sync** - Processes transaction volumes
3. **Residual Sync** - Calculates and stores residuals
4. **Notification** - Sends email status reports

## Email Notifications

### Notification Types
- **Sync Success** - Daily sync completion reports
- **Sync Failure** - Error alerts with troubleshooting steps
- **Setup Complete** - Welcome email with login credentials

### Email Templates
- Professional HTML templates
- Includes dashboard links
- Error details and troubleshooting steps

## Admin Access Control

### Middleware Protection
- All sync endpoints require admin authentication
- Cron jobs use secure token validation
- Service role access for automated operations

### Admin-Only Features
- Manual sync triggers
- Sync configuration management
- Data archival operations
- User management

## Data Retention Strategy

### Archive Tables
- **Partitioned storage** by year (2024, 2025, etc.)
- **Automatic archival** of data older than 3 months
- **Restore capability** for admin data recovery

### Archive Process
- Monthly automated archival
- Moves old data to partitioned tables
- Maintains active table performance
- Preserves all historical data

## Integration Points

### Existing Components
- **Ireland Pay CRM Sync** - Uses existing sync logic
- **Admin Dashboard** - Integrates with current admin interface
- **Authentication** - Works with existing auth system
- **Database** - Extends current schema

### New Components
- **Setup Wizard** - New guided setup flow
- **Cron Jobs** - Automated scheduling
- **Email System** - Notification infrastructure
- **Archive System** - Data retention management

## Security Features

### API Security
- Secure credential storage
- Admin-only access control
- Cron job authentication
- Encrypted API keys

### Data Protection
- Partitioned archive tables
- Secure admin authentication
- Audit logging for sync operations
- Error handling and recovery

## Monitoring & Maintenance

### Sync Monitoring
- Email notifications for all sync events
- Error logging and alerting
- Performance tracking
- Archive statistics

### Maintenance Tasks
- Monthly data archival
- Archive table management
- Sync schedule updates
- Credential rotation

## Troubleshooting

### Common Issues
1. **Setup Wizard Not Appearing**
   - Check if admin users exist
   - Verify database migrations

2. **Sync Failures**
   - Check API credentials
   - Verify network connectivity
   - Review error logs

3. **Email Notifications**
   - Verify Resend API key
   - Check admin email configuration

### Debug Steps
1. Check application logs
2. Verify environment variables
3. Test API connectivity
4. Review database permissions

## Next Steps

### Immediate Actions
1. Set up environment variables
2. Run database migrations
3. Configure Resend for email
4. Test setup wizard flow

### Future Enhancements
1. Slack notifications
2. Advanced sync scheduling
3. Data export capabilities
4. Enhanced monitoring dashboard

## Support

For implementation support:
- Review the code comments
- Check the database migrations
- Test each component individually
- Monitor the application logs

The implementation is designed to integrate seamlessly with your existing Ireland Pay Analytics system while adding the requested setup wizard and automated sync capabilities. 