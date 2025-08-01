# Email Notification System Implementation

## Overview

The IrelandPay Analytics application now includes a comprehensive email notification system that provides real-time alerts and reports for sync operations, system health, and data insights.

## Features

### 🎯 Core Features
- **Sync Success Notifications**: Professional emails when syncs complete successfully
- **Sync Failure Alerts**: Urgent notifications with error details and troubleshooting steps
- **Daily Summary Reports**: Comprehensive daily overview of all sync activities
- **Email Queue Management**: Reliable delivery with retry logic and rate limiting
- **Notification Preferences**: User-configurable settings for email types and thresholds
- **Email Analytics**: Detailed logging and monitoring of email delivery

### 📧 Email Templates
- **SyncSuccessEmail**: Clean, professional design with sync statistics
- **SyncFailureEmail**: Urgent alerts with error details and recommended actions
- **DailySummaryEmail**: Comprehensive daily reports with activity overview

### 🔧 Technical Features
- **React Email Integration**: Modern, responsive email templates
- **Resend API**: Reliable email delivery service
- **Queue Management**: In-memory queue with priority handling
- **Retry Logic**: Exponential backoff for failed deliveries
- **Rate Limiting**: 3 emails per second to prevent API throttling
- **Database Logging**: Complete audit trail of all email activities

## Architecture

### File Structure
```
lib/email/
├── config.ts                 # Email configuration and Resend setup
├── email-service.ts          # Main email service with queue management
└── notifications.ts          # Legacy email notifications (deprecated)

emails/
├── SyncSuccessEmail.tsx      # Success notification template
├── SyncFailureEmail.tsx      # Failure alert template
└── DailySummaryEmail.tsx     # Daily summary template

app/admin/
├── notification-settings/    # User preference configuration
├── email-logs/              # Email activity monitoring
└── test-email/              # Email system testing

app/api/
└── test-email/              # API endpoint for testing emails
```

### Database Schema
```sql
-- Email notification preferences
notification_preferences (
  id, user_id, sync_success, sync_failure, daily_summary,
  weekly_report, error_threshold, data_age_threshold,
  admin_email, cc_emails, created_at, updated_at
)

-- Email activity logs
email_logs (
  id, message_id, to_email, cc_emails, subject, category,
  status, attempts, last_error, sent_at, created_at
)

-- Email queue for reliability
email_queue (
  id, to_email, subject, html_content, category, priority,
  attempts, max_attempts, last_error, scheduled_for, sent_at, created_at
)

-- Sync operation logs
sync_logs (
  id, sync_id, sync_type, status, started_at, completed_at,
  merchants_count, transactions_count, residuals_count,
  duration_ms, errors, error_message, created_at
)
```

## Setup Instructions

### 1. Environment Configuration

Add the following environment variables to your `.env.local`:

```bash
# Email Service
RESEND_API_KEY=re_xxxxxxxxxx

# Email Configuration
EMAIL_FROM_NAME=IrelandPay Analytics
EMAIL_FROM_ADDRESS=analytics@irelandpay.com
EMAIL_REPLY_TO=support@irelandpay.com

# Notification Settings
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_RATE_LIMIT=3
```

### 2. Resend Setup

1. **Create Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Verify Domain**: Add and verify your domain (e.g., `irelandpay.com`)
3. **Get API Key**: Generate an API key from the Resend dashboard
4. **Update Configuration**: Set the `RESEND_API_KEY` environment variable

### 3. Database Migration

Run the email notification system migration:

```bash
# Apply the migration
supabase db push

# Or manually run the SQL
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20250127_email_notification_system.sql
```

### 4. Install Dependencies

The required packages are already installed:

```bash
npm install resend react-email @react-email/components
```

## Usage

### Basic Email Service Usage

```typescript
import { emailService } from '@/lib/email/email-service';

// Send sync success notification
await emailService.sendSyncSuccess({
  syncId: 'sync-123',
  syncType: 'daily',
  startTime: new Date(),
  endTime: new Date(),
  stats: {
    merchantsNew: 5,
    merchantsUpdated: 12,
    transactionsCount: 150,
    residualsCount: 25,
    duration: 300000
  }
});

// Send sync failure notification
await emailService.sendSyncFailure({
  syncId: 'sync-456',
  syncType: 'daily',
  error: {
    message: 'API connection timeout',
    details: { endpoint: 'https://api.irelandpay.com/merchants' }
  },
  failedAt: new Date(),
  lastSuccessfulSync: new Date(Date.now() - 24 * 60 * 60 * 1000),
  logs: ['Error log 1', 'Error log 2']
});

// Send daily summary
await emailService.sendDailySummary({
  date: new Date(),
  syncs: [/* sync data */],
  totalMerchants: 1250,
  totalTransactions: 45000,
  totalVolume: 1250000,
  issues: ['Issue 1', 'Issue 2']
});
```

### Enhanced Sync Manager

The enhanced sync manager automatically integrates email notifications:

```typescript
import { enhancedSyncManager } from '@/lib/sync/enhanced-sync-manager';

// Perform sync with automatic email notifications
const result = await enhancedSyncManager.performSyncWithNotifications('daily');
```

### Notification Preferences

Users can configure their notification preferences through the admin interface:

```typescript
// Update notification preferences
const { error } = await supabase
  .from('notification_preferences')
  .upsert({
    user_id: user.id,
    sync_success: true,
    sync_failure: true,
    daily_summary: true,
    admin_email: 'admin@irelandpay.com',
    cc_emails: ['backup@irelandpay.com']
  });
```

## Testing

### Test Email System

1. **Navigate to Test Page**: Go to `/admin/test-email`
2. **Configure Preferences**: Set up your email address in notification preferences
3. **Send Test Emails**: Use the test interface to send different types of emails
4. **Verify Delivery**: Check your email for the test notifications

### API Testing

```bash
# Test sync success email
curl -X POST /api/test-email \
  -H "Content-Type: application/json" \
  -d '{"testType": "sync-success"}'

# Test sync failure email
curl -X POST /api/test-email \
  -H "Content-Type: application/json" \
  -d '{"testType": "sync-failure"}'

# Test daily summary email
curl -X POST /api/test-email \
  -H "Content-Type: application/json" \
  -d '{"testType": "daily-summary"}'
```

## Monitoring

### Email Logs

Monitor email delivery through the admin interface at `/admin/email-logs`:

- **Status Filtering**: View sent, failed, or pending emails
- **Category Filtering**: Filter by notification type
- **Date Range**: View emails from specific time periods
- **Export**: Download email logs as CSV

### Database Queries

```sql
-- Get email delivery statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_delivery_time
FROM email_logs 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY status;

-- Get failed emails with details
SELECT 
  to_email,
  subject,
  last_error,
  attempts,
  created_at
FROM email_logs 
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Get notification preferences
SELECT 
  admin_email,
  sync_success,
  sync_failure,
  daily_summary
FROM notification_preferences;
```

## Configuration Options

### Email Service Configuration

```typescript
// lib/email/config.ts
export const emailConfig = {
  from: {
    name: 'IrelandPay Analytics',
    email: 'analytics@irelandpay.com'
  },
  replyTo: 'support@irelandpay.com',
  categories: {
    syncNotification: 'sync-notification',
    errorAlert: 'error-alert',
    systemAlert: 'system-alert',
    report: 'report'
  }
};
```

### Queue Configuration

```typescript
// Email queue settings
const queueConfig = {
  maxAttempts: 3,
  rateLimit: 3, // emails per second
  retryDelays: [1000, 2000, 4000] // exponential backoff
};
```

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check `RESEND_API_KEY` environment variable
   - Verify domain is verified in Resend
   - Check email logs for error details

2. **Emails Going to Spam**
   - Ensure domain is properly verified
   - Use consistent "from" addresses
   - Include proper email headers

3. **Queue Processing Issues**
   - Check for memory leaks in queue processing
   - Monitor queue size and processing times
   - Verify retry logic is working

4. **Database Connection Issues**
   - Check Supabase connection settings
   - Verify RLS policies are correct
   - Ensure proper permissions

### Debug Mode

Enable debug logging:

```typescript
// Add to environment variables
DEBUG_EMAIL=true

// In email service
if (process.env.DEBUG_EMAIL) {
  console.log('Email service debug:', { queue, processing, attempts });
}
```

## Security Considerations

### Data Protection
- **Email Content**: No sensitive data in email content
- **Logging**: Sanitize error messages before logging
- **Access Control**: Admin-only access to email logs

### Rate Limiting
- **API Limits**: Respect Resend API rate limits
- **Queue Management**: Prevent queue overflow
- **Retry Logic**: Exponential backoff to prevent spam

### Privacy
- **Recipient Control**: Users control their notification preferences
- **Data Retention**: Email logs retained for monitoring only
- **GDPR Compliance**: Easy opt-out through preferences

## Performance Optimization

### Queue Optimization
- **Memory Management**: Process queue in batches
- **Priority Handling**: High-priority emails sent first
- **Rate Limiting**: Prevent API throttling

### Database Optimization
- **Indexes**: Proper indexing on email_logs table
- **Partitioning**: Consider partitioning for large log tables
- **Cleanup**: Regular cleanup of old log entries

## Future Enhancements

### Planned Features
- **SMS Notifications**: Critical alerts via SMS
- **Slack Integration**: Team notifications via Slack
- **Webhook Support**: Custom webhook notifications
- **Advanced Analytics**: Email engagement tracking
- **Template Editor**: Visual email template builder

### Scalability Improvements
- **Redis Queue**: Move to Redis for better scalability
- **Worker Processes**: Dedicated email processing workers
- **Load Balancing**: Multiple email service instances
- **Caching**: Cache notification preferences

## Support

For issues or questions about the email notification system:

1. **Check Logs**: Review email logs in `/admin/email-logs`
2. **Test System**: Use `/admin/test-email` to verify functionality
3. **Database**: Check sync_logs and email_logs tables
4. **Environment**: Verify all environment variables are set correctly

## Changelog

### v1.0.0 (Current)
- Initial email notification system implementation
- React Email templates for all notification types
- Queue management with retry logic
- Admin interface for preferences and monitoring
- Database schema for email logging
- Integration with existing sync system 