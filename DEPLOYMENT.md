# Deployment Guide for IrelandPay Analytics Pulse

This guide explains how to set up automatic deployments from GitHub to Windsurf for your IrelandPay Analytics Pulse application.

## GitHub Secrets Setup

For the GitHub Actions workflow to deploy your application successfully, you need to set up the following secrets in your GitHub repository:

1. Navigate to your GitHub repository: https://github.com/WesAllenInc/irelandpay-analytics-pulse
2. Go to Settings > Secrets and variables > Actions
3. Click on "New repository secret"
4. Add the following secrets:

   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `WINDSURF_API_KEY`: Your Windsurf API key
   - `WINDSURF_PROJECT_ID`: Your Windsurf project ID

## Obtaining the Required Values

### Supabase Values
1. Log in to your Supabase account
2. Select your project
3. Go to Project Settings > API
4. Copy the URL and anon/public key

### Windsurf Values
1. Log in to your Windsurf account
2. Go to your project settings
3. Copy the API Key and Project ID

## Triggering Deployments

Deployments will automatically trigger when:
- Code is pushed to the main/master branch
- You manually trigger the workflow from the GitHub Actions tab

## Manual Deployment

If you want to manually trigger a deployment:
1. Go to the Actions tab in your GitHub repository
2. Select the "Deploy to Windsurf" workflow
3. Click "Run workflow"
4. Select the branch you want to deploy
5. Click "Run workflow"

## Checking Deployment Status

After a deployment is triggered:
1. Go to the Actions tab in your GitHub repository
2. Click on the running or completed workflow
3. View the deployment logs

You can also check the deployment status in your Windsurf dashboard.
