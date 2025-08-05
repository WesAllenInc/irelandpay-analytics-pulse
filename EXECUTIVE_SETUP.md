# Ireland Pay Analytics - Executive-Only Setup Guide

## Overview

This guide explains how to configure the Ireland Pay Analytics application to restrict access to only the 2 authorized executives:

- **Jake Markey** (jmarkey@irelandpay.com)
- **Wilfredo Vazquez** (wvazquez@irelandpay.com)

## Quick Setup

### Option 1: Web Interface Setup (Recommended)

1. **Navigate to the setup page:**
   ```
   http://your-domain/setup-executives
   ```

2. **Click "Setup Executive Users"** to automatically configure both executives

3. **Verify the setup** by checking the results displayed on the page

### Option 2: Command Line Setup

1. **Run the setup script:**
   ```bash
   node scripts/setup-executive-users.js
   ```

2. **Or use the API endpoint:**
   ```bash
   curl -X POST http://your-domain/api/setup-executives
   ```

## What Gets Configured

### 1. Supabase Auth Users
- Creates user accounts in Supabase Authentication
- Sets default password: `IrelandPay2025!`
- Auto-confirms email addresses
- Assigns admin role in user metadata

### 2. Database Records
- Creates/updates records in the `agents` table
- Sets `role` to `admin`
- Sets `approval_status` to `approved`
- Links to Supabase Auth users

### 3. Access Control
- Middleware enforces executive-only access
- Only the 2 configured emails can log in
- All other users are redirected to unauthorized page

## Security Features

### Executive-Only Access
- **Whitelist Protection**: Only configured emails can access the application
- **Middleware Enforcement**: Server-side validation on all routes
- **Clear Error Messages**: Unauthorized users see specific executive-only message

### Authentication Flow
1. User attempts to access application
2. Middleware checks if email is in executive whitelist
3. If authorized: proceed to dashboard
4. If unauthorized: redirect to `/unauthorized?error=executive-only`

### Default Credentials
- **Password**: `IrelandPay2025!`
- **Action Required**: Users should change password on first login
- **Email Confirmation**: Automatically confirmed during setup

## Executive Users Configuration

```javascript
const EXECUTIVE_USERS = [
  {
    email: 'jmarkey@irelandpay.com',
    agent_name: 'Jake Markey',
    role: 'admin',
    approval_status: 'approved'
  },
  {
    email: 'wvazquez@irelandpay.com',
    agent_name: 'Wilfredo Vazquez',
    role: 'admin',
    approval_status: 'approved'
  }
];
```

## Access Levels

Both executives have **full admin access** to:

### Dashboard Features
- ✅ Main dashboard with KPIs and analytics
- ✅ Merchant data and management
- ✅ Advanced analytics and insights
- ✅ Settings and configuration

### Admin Portal Features
- ✅ Agent payouts management
- ✅ Sync scheduling and monitoring
- ✅ Data validation and integrity checks
- ✅ Excel report generation
- ✅ User management
- ✅ Email logs and notifications
- ✅ System settings

### API Access
- ✅ All API endpoints
- ✅ Data synchronization
- ✅ CRM integration
- ✅ Analytics endpoints

## Troubleshooting

### Common Issues

1. **"Access Denied" Error**
   - Verify the user email is in the executive whitelist
   - Check that the user exists in both Auth and agents table
   - Ensure the user has `role: 'admin'` and `approval_status: 'approved'`

2. **Login Issues**
   - Confirm the user was created in Supabase Auth
   - Verify the default password: `IrelandPay2025!`
   - Check that email confirmation is set to true

3. **Database Connection Issues**
   - Verify Supabase environment variables are set
   - Check database permissions for the service role
   - Ensure the `agents` table exists and has correct schema

### Verification Steps

1. **Check Auth Users:**
   ```sql
   SELECT * FROM auth.users WHERE email IN ('jmarkey@irelandpay.com', 'wvazquez@irelandpay.com');
   ```

2. **Check Agent Records:**
   ```sql
   SELECT * FROM agents WHERE email IN ('jmarkey@irelandpay.com', 'wvazquez@irelandpay.com');
   ```

3. **Test Login:**
   - Try logging in with each executive email
   - Verify access to dashboard and admin features
   - Test password change functionality

## Maintenance

### Adding New Executives
1. Update the `EXECUTIVE_USERS` array in:
   - `lib/auth/executive-auth.ts`
   - `middleware.ts`
   - `scripts/setup-executive-users.js`
   - `app/api/setup-executives/route.ts`

2. Run the setup process again

### Removing Executives
1. Remove the user from the whitelist arrays
2. Optionally delete the user from Supabase Auth
3. Remove the agent record from the database

### Password Reset
If executives forget their passwords:
1. Use Supabase Auth admin to reset password
2. Or run the setup script again to recreate users

## Security Best Practices

1. **Change Default Passwords**: Ensure executives change passwords on first login
2. **Regular Audits**: Periodically verify only authorized users have access
3. **Monitor Logs**: Check authentication logs for unauthorized attempts
4. **Backup Configuration**: Keep a backup of the executive configuration
5. **Environment Security**: Ensure environment variables are properly secured

## Support

If you encounter issues with the executive setup:

1. Check the browser console for errors
2. Review server logs for authentication issues
3. Verify Supabase configuration and permissions
4. Test with the setup verification tools provided

---

**Note**: This configuration ensures that only Jake Markey and Wilfredo Vazquez have access to the Ireland Pay Analytics application. All other users will be denied access with a clear message indicating executive-only access. 