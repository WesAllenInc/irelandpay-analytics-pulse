# Ireland Pay Analytics Pulse

A comprehensive analytics and CRM integration platform for Ireland Pay, providing real-time merchant data analysis, automated sync capabilities, and advanced reporting features.

## Features

- **Real-time Analytics**: Live merchant performance tracking and insights
- **CRM Integration**: Seamless sync with Ireland Pay CRM system
- **Automated Reporting**: Scheduled reports and data archiving
- **Admin Dashboard**: Comprehensive management interface
- **Agent Portal**: Dedicated agent analytics and merchant management
- **Data Validation**: Automated data quality checks and validation

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/WesAllenInc/irelandpay-analytics-pulse.git
   cd irelandpay-analytics-pulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `IRELANDPAY_CRM_API_KEY` - Ireland Pay CRM API key
- `IRELANDPAY_CRM_BASE_URL` - Ireland Pay CRM base URL

### Sync API usage
- Start sync: `POST /api/sync-irelandpay-crm/enhanced` (reads API key from server env)
- Check status: `GET /api/sync-irelandpay-crm/enhanced?syncId=UUID`

### Optional Variables
- `NEXT_PUBLIC_APP_URL` - Your application URL
- `CSRF_SECRET` - CSRF protection secret
- `NEXT_PUBLIC_SUPABASE_PROJECT_ID` - Your Supabase project ID

## Deployment

This application is configured for deployment on Vercel with automatic deployments from the main branch.

### Vercel Deployment
- **Framework**: Next.js 15.3.4
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `.next`
- **Node Version**: 18.x or higher

### Environment Setup
1. Connect your GitHub repository to Vercel
2. Set all required environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage

### Project Structure
```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── agent/             # Agent portal pages
│   ├── api/               # API routes
│   └── dashboard/         # Main dashboard pages
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── agent/            # Agent-specific components
│   ├── charts/           # Chart components
│   └── ui/               # UI components
├── lib/                  # Utility libraries
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── supabase/             # Supabase configuration
```

## Testing

The application includes comprehensive testing with Vitest and React Testing Library.

### Running Tests
```bash
npm run test              # Run all tests
npm run test:coverage     # Run tests with coverage
```

### Test Structure
- `__tests__/` - Component and integration tests
- `tests/` - Backend and utility tests
- `e2e-tests/` - End-to-end tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For support and questions, please contact the development team or create an issue in the GitHub repository.

## License

This project is proprietary software developed for Ireland Pay.

---

**Last Updated**: August 1, 2025
**Version**: 0.1.0
