# Ireland Pay Analytics Pulse - Project Guide

## Table of Contents
- [Overview](#overview)
- [Architecture & Technology Stack](#architecture--technology-stack)
- [Core Features](#core-features)
- [Data Flow & Integration](#data-flow--integration)
- [Development Guide](#development-guide)
- [Deployment & Configuration](#deployment--configuration)
- [Project Status & Roadmap](#project-status--roadmap)
- [Troubleshooting & FAQs](#troubleshooting--faqs)

## Overview

Ireland Pay Analytics Pulse is a comprehensive analytics platform designed to provide a virtual window into your business data. The platform enables users to upload financial data (merchant and residual information), visualize key metrics through interactive charts and dashboards, and generate insights to support business decisions.

### Key Capabilities
- **Data Ingestion**: Upload and process merchant and residual Excel files
- **Interactive Analytics**: Visualize business performance through dynamic charts and reports
- **Role-Based Access**: Agent and administrative views for different user types
- **Commission Management**: Track agent commission and performance metrics
- **Report Generation**: Export reports for accounting and business analysis

## Architecture & Technology Stack

The Ireland Pay Analytics platform is built on a modern, scalable architecture using the following technologies:

### Frontend
- **Framework**: Next.js 15.3.3 with TypeScript and App Router
- **UI Libraries**: 
  - Tailwind CSS for styling
  - shadcn/ui and Radix UI for component primitives
  - Chakra UI for additional UI components
- **State Management**: Zustand for application state
- **Data Visualization**: 
  - Lightweight Charts (v3.8.0) for interactive financial charts
  - Recharts for additional chart types
  - ApexCharts for complex visualizations

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for file uploads
- **API**: Next.js API routes

### Integration Points
- **Supabase Client**: Compatibility layer for Supabase authentication and data access
- **Excel Processing**: XLSX library for parsing and processing Excel data

## Core Features

### 1. Agent Commission Dashboard (`/agent` or `/agent-dashboard`)
- Agent name and performance summary
- Number of merchants under management
- Month-to-date (MTD) processing volume
- MTD residual earnings
- Merchant breakdown table with detailed metrics
- Volume trend charts with 3-month history

### 2. Admin Commission View (`/admin/agent-payouts`)
- Comprehensive list of all agents
- Performance metrics including merchant count, volume, and residuals
- Forecasting tools for business planning
- Export functionality for accounting payout summaries
- Drill-down capability to view individual agent's merchants

### 3. Data Upload & Processing
- Excel file upload for merchant and residual data
- Validation and error handling for data integrity
- Automatic processing and storage in Supabase
- Status tracking and notifications for upload progress

### 4. Analytics & Reporting
- Interactive charts for visualizing trends
- Filtering and date range selection
- CSV export capabilities for further analysis
- Custom report generation

### 5. User Management & Authentication
- Role-based access control
- User registration and approval workflow
- Secure authentication through Supabase

## Data Flow & Integration

### Data Ingestion Process
1. **Upload**: Users upload Excel files through the `UploadExcel` component
2. **Storage**: Files are stored in Supabase Storage in either 'merchants' or 'residuals' buckets
3. **Processing**: API routes (`/api/process-excel`, `/api/process-merchant-excel`, `/api/process-residual-excel`) handle data extraction and validation
4. **Database Storage**: Processed data is stored in respective Supabase tables
5. **Feedback**: Users receive real-time feedback on processing status and results

### Database Schema
- **merchants**: Stores merchant information (MID, DBA name, etc.)
- **merchant_transactions**: Stores transaction data by merchant and month
- **residual_payouts**: Stores commission and residual data
- **users**: Stores user information and roles
- **agents**: Stores agent-specific information

### Integration with Supabase
- Authentication using Supabase Auth
- Database access through Supabase client
- File storage in Supabase Storage buckets
- Real-time notifications and updates (where applicable)

## Development Guide

### Prerequisites
- Node.js (LTS version)
- npm or yarn
- Supabase account and project

### Local Development Setup
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
4. Start the development server:
   ```
   npm run dev
   ```

### File Structure
- `/app`: Next.js App Router pages and layouts
- `/components`: Reusable UI components
- `/lib`: Utility functions and service integrations
- `/hooks`: Custom React hooks
- `/types`: TypeScript type definitions
- `/public`: Static assets

### Testing
- Vitest for unit and integration tests
- Mocked Supabase for testing ingestion functions
- Run tests with `npm test`

### Adding New Features
1. **New Components**: Place in the `/components` directory
2. **New Pages**: Add to the appropriate directory in `/app`
3. **API Endpoints**: Add new routes in `/app/api`
4. **Database Changes**: Update schema in Supabase and update TypeScript types

### Best Practices
- Use TypeScript for type safety
- Implement tests for new features
- Follow the component structure for consistency
- Use Supabase client helpers from `lib/supabase-compat.ts`
- Handle errors and provide user feedback

## Deployment & Configuration

### Deployment Options
- Vercel (recommended for Next.js applications)
- Netlify
- Self-hosted options

### Environment Variables
Required environment variables for deployment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Supabase Configuration
1. Create a Supabase project
2. Set up the necessary tables:
   - merchants
   - merchant_transactions
   - residual_payouts
   - users
   - agents
3. Configure storage buckets:
   - merchants
   - residuals
4. Set up authentication providers and security policies

## Project Status & Roadmap

### Current Status
The Ireland Pay Analytics project currently has implemented:
- ✅ Next.js application with TypeScript and Tailwind CSS
- ✅ Supabase integration for backend services
- ✅ Data upload and processing functionality
- ✅ Basic dashboard views for agents and admins
- ✅ Chart components for data visualization

### Pending Implementation
- ⬜ Enhanced mobile responsiveness
- ⬜ Advanced filtering options for reports
- ⬜ Additional chart types and visualization options
- ⬜ Batch processing for large datasets
- ⬜ Export to additional formats (PDF, Excel)
- ⬜ Email notifications for significant events
- ⬜ User preference settings

### Known Issues
- Chart rendering compatibility requires lightweight-charts v3.8.0 (not v5.x)
- React key warnings in some merchant table implementations have been addressed
- Supabase authentication requires compatibility layer due to package version changes

## Troubleshooting & FAQs

### Common Issues

#### Excel Upload Errors
- **Issue**: File size too large
  **Solution**: Ensure Excel files are under 10MB or optimize before uploading
  
- **Issue**: Invalid format
  **Solution**: Use only .xlsx or .xls formats

#### Chart Rendering Problems
- **Issue**: Charts not rendering
  **Solution**: Ensure lightweight-charts v3.8.0 is used; v5.x is not compatible with current implementation

#### Supabase Authentication Errors
- **Issue**: Authentication not working
  **Solution**: Check that the correct Supabase client creation methods are used:
  - `createSupabaseBrowserClient` for client components
  - `createSupabaseServerClient` for server components and API routes

### Performance Optimization
- Use pagination for large datasets
- Implement caching for frequently accessed data
- Optimize database queries with appropriate indexes

---

## Contributing to This Guide

This project guide is a living document. As the project evolves, please update this guide to reflect new features, architectural changes, or best practices. All team members are encouraged to contribute to keeping this documentation accurate and comprehensive.

Last Updated: June 30, 2025
