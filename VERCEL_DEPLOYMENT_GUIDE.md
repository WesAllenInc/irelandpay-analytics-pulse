# Vercel Deployment Guide for Ireland Pay Analytics

This guide outlines the steps to deploy your Ireland Pay Analytics application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. Your Supabase project with necessary tables and Edge Functions

## Deployment Steps

### 1. Connect to GitHub

- Push your project to a GitHub repository.
- Login to your Vercel account and select "Import Project".
- Select the GitHub repository that contains your project.

### 2. Configure the Project

- **Framework Preset**: Next.js
- **Root Directory**: Leave as `.` (default) unless your project is in a subdirectory.
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### 3. Environment Variables

Add the following environment variables to your Vercel project:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=https://your-production-url.vercel.app
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your-supabase-project-id
```

> **Important**: Ensure these values match your production Supabase project, not your development environment.

### 4. Deploy

- Click "Deploy" and wait for the deployment process to complete.

### 5. Edge Functions

Your Supabase Edge Functions will continue to run from your Supabase environment. The `vercel.json` configuration includes rewrites to ensure API calls are properly directed to Supabase.

### 6. Checking Deployment

After deployment, you should:

1. Verify the Excel upload functionality works with your production Supabase instance
2. Check that the Supabase Edge Functions are accessible
3. Ensure data is displaying correctly in the dashboard

## Troubleshooting

- **Missing Environment Variables**: Check that all required environment variables are properly set in the Vercel dashboard.
- **Edge Functions Not Working**: Ensure your Supabase project is properly set up and Edge Functions are deployed.
- **Build Errors**: Check the Vercel deployment logs for any build errors.

## Future Updates

To update the deployed application:

1. Push changes to your GitHub repository
2. Vercel will automatically rebuild and deploy the updated application
