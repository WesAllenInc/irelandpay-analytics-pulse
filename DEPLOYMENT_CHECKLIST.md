# Ireland Pay Analytics Pulse - Deployment Checklist

This checklist will help ensure your Vercel deployment with Supabase integration and Iris CRM API works correctly.

## 1. Pre-Deployment Setup

### Environment Variables
- [ ] Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Select your project "irelandpay-analytics-pulse"
- [ ] Go to "Settings" > "Environment Variables"
- [ ] Verify the following secrets are set:

#### Required Variables:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- [ ] `NEXT_PUBLIC_APP_URL` - Your deployed app URL (e.g., https://irelandpay-analytics-pulse.vercel.app)
- [ ] `NEXT_PUBLIC_SUPABASE_PROJECT_ID` - Your Supabase project ID

#### Optional Variables (for full functionality):
- [ ] `IRIS_CRM_API_KEY` - Iris CRM API key (for real data integration)
- [ ] `IRIS_CRM_BASE_URL` - Iris CRM API base URL
- [ ] `CSRF_SECRET` - Random string for CSRF protection
- [ ] `SUPABASE_JWT_SECRET` - Supabase JWT secret

#### Email Configuration (optional):
- [ ] `SMTP_HOST` - SMTP server host
- [ ] `SMTP_PORT` - SMTP server port
- [ ] `SMTP_SECURE` - SMTP security setting
- [ ] `SMTP_USER` - SMTP username
- [ ] `SMTP_PASSWORD` - SMTP password
- [ ] `SMTP_FROM` - From email address

## 2. Build and Deploy

### Local Build Test
```bash
# Install dependencies
npm install

# Run build locally to catch any issues
npm run build

# Test the build locally
npm start
```

### Deploy to Vercel
```bash
# Deploy using Vercel CLI
vercel --prod

# Or connect your GitHub repository to Vercel for automatic deployments
```

## 3. Post-Deployment Verification

### Core Functionality Tests
- [ ] **Homepage**: Visit your deployed URL and verify it loads
- [ ] **Demo Mode**: Verify authentication bypass works (demo mode enabled)
- [ ] **Dashboard**: Test `/dashboard` page with analytics components
- [ ] **Analytics**: Test `/analytics` page with charts and filters
- [ ] **Iris Test**: Test `/iris-test` page with simulated API data

### Analytics Components
- [ ] **KPI Cards**: Verify MerchantAnalyticsCard components display correctly
- [ ] **Charts**: Test MerchantChart components (line and bar charts)
- [ ] **Tables**: Verify MerchantTable with sorting and CSV export
- [ ] **Responsive Design**: Test on mobile and desktop

### API Endpoints
- [ ] **Test API**: Visit `/api/test-iriscrm` to verify simulated data generation
- [ ] **Environment Check**: Test `/api/check-env` (if available)
- [ ] **Supabase Connection**: Verify database connectivity

## 4. Database Setup (if using real Supabase)

### Supabase Configuration
- [ ] Verify your Supabase project is active
- [ ] Check database tables exist:
  - [ ] `merchant_data`
  - [ ] `agents`
  - [ ] `sync_status`
  - [ ] `merchant_user_map`

### Edge Functions (if using real Iris CRM)
- [ ] Deploy Supabase Edge Functions:
  ```bash
  supabase functions deploy sync-iriscrm
  ```
- [ ] Verify functions are accessible in Supabase Dashboard

## 5. Performance Optimization

### Build Optimization
- [ ] Check bundle size in Vercel deployment logs
- [ ] Verify images are optimized
- [ ] Test loading performance

### Analytics Optimization
- [ ] Verify charts load efficiently
- [ ] Test data fetching performance
- [ ] Check for any console errors

## 6. Security Verification

### Authentication
- [ ] Verify demo mode is working correctly
- [ ] Test CSRF protection (if enabled)
- [ ] Check environment variables are not exposed

### API Security
- [ ] Verify API endpoints are properly protected
- [ ] Test rate limiting (if implemented)
- [ ] Check for any exposed sensitive data

## 7. Final Testing

### User Experience
- [ ] Test navigation between all pages
- [ ] Verify responsive design on different screen sizes
- [ ] Test chart interactions and data filtering
- [ ] Verify CSV export functionality

### Data Flow
- [ ] Test simulated Iris CRM data generation
- [ ] Verify analytics components display data correctly
- [ ] Test month selection and data updates

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check for TypeScript errors or missing dependencies
2. **Environment Variables**: Verify all required variables are set in Vercel
3. **Chart Rendering**: Check browser console for Recharts errors
4. **API Errors**: Verify API endpoints are accessible

### Debug Steps:
1. Check Vercel deployment logs
2. Test locally with `npm run build && npm start`
3. Verify environment variables in Vercel dashboard
4. Check browser console for client-side errors

## Notes

- The application includes demo mode for testing without real Iris CRM credentials
- All analytics components are optimized for dark backgrounds
- Charts use Recharts library with responsive design
- CSV export functionality is included in merchant tables
- The application is ready for production with real Iris CRM integration

## Deployment URL

Your application will be available at:
`https://irelandpay-analytics-pulse.vercel.app` (or your custom domain)
