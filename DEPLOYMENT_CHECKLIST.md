# Ireland Pay Analytics - Deployment Checklist

This checklist will help ensure your Vercel deployment with Supabase integration works correctly.

## 1. Verify Vercel Secrets

- [ ] Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Select your project "irelandpay-analytics-pulse"
- [ ] Go to "Settings" > "Environment Variables"
- [ ] Verify the following secrets are set:
  - [ ] `supabase_url` - [ https://ainmbbtycciukbjjdjtl.supabase.co ](https://ainmbbtycciukbjjdjtl.supabase.co)
  - [ ] `supabase_anon_key` - Your Supabase anonymous key
  - [ ] `supabase_service_role_key` - Your Supabase service role key (for admin operations)
  - [ ] `app_url` - Your deployed app URL (e.g., https://irelandpay-analytics-pulse.vercel.app)
  - [ ] `supabase_project_id` - ainmbbtycciukbjjdjtl

### Testing Environment Variables

After deployment, test if environment variables are correctly loaded:
1. Visit: `https://your-deployment-url/api/check-env` (only works in development mode)
2. Check if all environment variables are marked as "Set ✅"

## 2. Database Type Safety

Ensure your database types are up-to-date with your Supabase schema:

1. Install dependencies if needed:
   ```bash
   npm install -g supabase
   ```

2. Run the type generation script:
   ```bash
   node scripts/update-supabase-types.js
   ```

3. Compare the generated types with your existing types:
   - Check `types/supabase-generated.ts` (newly generated)
   - Compare with `types/database.ts` (your current types)
   - Update `types/database.ts` if there are differences

4. Verify your database schema matches what's expected in your code:
   - Check for missing tables or columns
   - Verify data types match
   - Ensure relationships are correctly defined

## 3. Supabase Edge Functions

Ensure your Edge Functions are properly deployed:

1. Install the Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Deploy your Edge Functions:
   ```bash
   node scripts/deploy-edge-functions.js
   ```

4. Verify each function is deployed:
   - Check in the [Supabase Dashboard](https://app.supabase.com) > Edge Functions
   - Verify the following functions exist:
     - [ ] `processResidualExcel`
     - [ ] `processMerchantExcel`
     - [ ] `parse-excel` (if used)
     - [ ] `metrics` (if used)

5. Test each function with sample data

## 4. Test Authentication Flow

Test the complete sign-in/sign-out process after deployment:

1. Run the authentication test script:
   ```bash
   # First install Playwright if needed
   npm install playwright
   
   # Run the test script
   node scripts/test-auth-flow.js
   ```

2. Manual testing steps:
   - [ ] Visit your deployed site
   - [ ] Sign in with valid credentials
   - [ ] Verify you're redirected to the correct page based on your role
   - [ ] Check if user data is loaded correctly
   - [ ] Sign out
   - [ ] Verify you're redirected to the auth page

## 5. Final Deployment Verification

- [ ] Test Excel file uploads for both merchant and residual data
- [ ] Verify data is correctly processed and stored in Supabase
- [ ] Check dashboard visualizations with the processed data
- [ ] Test responsive design on different devices
- [ ] Verify all navigation links work correctly

## Troubleshooting

If you encounter issues:

1. Check Vercel deployment logs for errors
2. Verify Supabase connection in the browser console
3. Test API endpoints directly to isolate frontend vs. backend issues
4. Check Supabase logs for Edge Function errors
5. Verify database permissions and RLS policies

## Notes

- Remember that Supabase Edge Functions have a cold start time on the first invocation
- Ensure your database has the correct tables and views as defined in your types
- For production deployments, consider setting up monitoring and alerts
