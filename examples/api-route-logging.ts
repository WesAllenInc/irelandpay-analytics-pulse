/**
 * Example of using the logging middleware in Next.js API routes
 * This demonstrates how to use the enhanced logging system in Pages Router API routes
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { withLogging, ExtendedNextApiRequest } from '../lib/logging-middleware';
import logger from '../lib/logging';

// Example API handler for agent dashboard data
async function agentDashboardHandler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Track performance of database query
    const apiCall = logger.trackApiCall('supabase_agent_dashboard_query');
    
    // Log start of data processing
    logger.info('Fetching agent dashboard data', { 
      agentId: req.query.agentId,
      userId: req.userId
    });
    
    // Simulate API call or database query
    await new Promise(resolve => setTimeout(resolve, 200));
    
    apiCall.end(); // End performance tracking
    
    // Send response
    return res.status(200).json({ 
      success: true, 
      message: 'Agent dashboard data retrieved' 
    });
    
  } catch (error) {
    // The middleware will log the error, but we can add more context
    logger.logError('Failed to fetch agent dashboard data', error, {
      agentId: req.query.agentId,
      // Context is automatically added by the middleware
    });
    
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
}

// Wrap with logging middleware to automatically log requests and responses
export default withLogging(agentDashboardHandler);

/**
 * Example of using the App Router logging wrapper (for /app directory)
 */
export const appRouterExample = `
// In app/api/agents/[agentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAppRouterLogging } from '@/lib/logging-middleware';
import logger from '@/lib/logging';

// Define your handler
async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    
    logger.info('Processing agent data request', { agentId });
    
    // Use performance tracking wrapper
    const result = await logger.withPerformanceTracking('fetch_agent_data', async () => {
      // Your database or API calls here
      await new Promise(resolve => setTimeout(resolve, 100));
      return { agent: { id: agentId, name: 'Example Agent' } };
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.logError('Failed to process agent data request', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Wrap with logging middleware
export const GET = withAppRouterLogging(GET);
`;
