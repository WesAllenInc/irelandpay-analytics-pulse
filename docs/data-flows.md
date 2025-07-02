# Data Flows Documentation

This document outlines the primary data flows in the Ireland Pay Analytics application, from database to UI components.

## Table of Contents
- [Overview](#overview)
- [Authentication Flow](#authentication-flow)
- [Agent Dashboard Data Flow](#agent-dashboard-data-flow)
- [Admin Dashboard Data Flow](#admin-dashboard-data-flow)
- [Excel Upload Flow](#excel-upload-flow)
- [Data Refresh Patterns](#data-refresh-patterns)

## Overview

The Ireland Pay Analytics application follows a consistent pattern for data flow:

1. Data is stored in Supabase PostgreSQL database
2. Accessed via Supabase client (server or browser)
3. Processed and transformed as needed
4. Rendered in UI components with appropriate memoization

## Authentication Flow

```
┌─────────────┐     ┌────────────────┐     ┌─────────────────┐     ┌───────────────┐
│ Login Form  ├────►│ Supabase Auth  ├────►│ JWT Generation  ├────►│ RouteGuard    │
└─────────────┘     └────────────────┘     └─────────────────┘     └───────┬───────┘
                                                                          │
┌─────────────┐     ┌────────────────┐     ┌─────────────────┐            │
│ Auth Context◄─────┤ User Session   │◄────┤ Protected Route ◄────────────┘
└─────────────┘     └────────────────┘     └─────────────────┘
```

### Implementation Details

1. **Authentication API**: We use Supabase Auth for user authentication.
   - Client components use `createSupabaseBrowserClient()`
   - Server components use `createSupabaseServerClient()`

2. **Session Management**: User session is managed via cookies and JWT tokens.

3. **Route Protection**: The `RouteGuard` component ensures users only access authorized routes.

## Agent Dashboard Data Flow

```
┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐    ┌───────────────┐
│ Server       │    │ useAgentDash-  │    │ Merchant/Volume Data │    │ AgentMerchant │
│ Component    ├───►│ board Hook     ├───►│ Processing           ├───►│ Table         │
└──────────────┘    └────────────────┘    └──────────────────────┘    └───────────────┘
                                                 │
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ AgentVolume  │
                                          │ Chart        │
                                          └──────────────┘
```

### Key Data Transformations

1. **Raw Data Fetching**: Server component fetches data from Supabase.
2. **Data Processing**:
   - Volume data is aggregated by month
   - Merchant data is enhanced with performance metrics
   - End-of-month estimates are calculated based on current trends
3. **Component Data Flow**: Data is passed down to memoized components.

### Code Pattern for Agent Dashboard

```typescript
// In server component
const { data: merchants } = await supabase
  .from('merchant_data')
  .select('*')
  .eq('agent_id', agentId);

// In client component with custom hook
function AgentDashboardClient({ initialData }) {
  const { merchants, volumeData, isLoading } = useAgentDashboard(initialData);
  
  return (
    <>
      <AgentMerchantTable merchants={merchants} isLoading={isLoading} />
      <AgentVolumeChart data={volumeData} isLoading={isLoading} />
    </>
  );
}
```

## Admin Dashboard Data Flow

```
┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐    ┌───────────────┐
│ Server       │    │ useAdminPayout │    │ Agent/Merchant Data  │    │ AdminAgentTable│
│ Component    ├───►│ Hook           ├───►│ Processing           ├───►│                │
└──────────────┘    └────────────────┘    └──────────────────────┘    └───────┬───────┘
                                                                              │
                                                                              │
                                                                              ▼
                                                                     ┌──────────────────┐
                                                                     │ AgentDetailView  │
                                                                     │ (Drill Down)     │
                                                                     └──────────────────┘
```

The admin flow follows a similar pattern but includes additional data for all agents and advanced filtering capabilities.

## Excel Upload Flow

```
┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐    ┌───────────────┐
│ UploadExcel  │    │ Supabase       │    │ Edge Function        │    │ Database      │
│ Component    ├───►│ Storage        ├───►│ Excel Processing     ├───►│ Tables        │
└──────────────┘    └────────────────┘    └──────────────────────┘    └───────────────┘
       │                                            │
       │                                            │
       ▼                                            ▼
┌──────────────┐                          ┌──────────────────┐
│ Upload Status│◄─────────────────────────┤ Processing       │
│ Component    │                          │ Results          │
└──────────────┘                          └──────────────────┘
```

### Upload Process

1. **File Selection**: User selects Excel file through `UploadExcel` component.
2. **Storage Upload**: File is uploaded to Supabase Storage bucket.
3. **Processing**: Supabase Edge Function processes the Excel file:
   - Parses Excel data (merchants or residuals)
   - Validates data structure and required fields
   - Inserts/updates records in appropriate tables
4. **Status Updates**: `ExcelUploadStatus` component displays progress and results.

## Data Refresh Patterns

The application uses several strategies for keeping data fresh:

1. **Server Components**: Use `export const dynamic = 'force-dynamic'` to ensure fresh data on each page load.

2. **Polling for Real-time Updates**: Implemented in components that need near real-time updates:
   ```typescript
   useEffect(() => {
     const interval = setInterval(fetchLatestData, 30000); // 30-second refresh
     return () => clearInterval(interval);
   }, [fetchLatestData]);
   ```

3. **Manual Refresh**: Critical components provide refresh buttons for user-triggered updates.

4. **Cached Data Handling**: Some data is cached for performance with configurable TTL (Time To Live).

---

Understanding these data flows is essential for maintaining and extending the Ireland Pay Analytics application. Always consider performance implications when adding new data flows or modifying existing ones.
