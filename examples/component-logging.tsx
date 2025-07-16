/**
 * Example of using the client-side logging utilities in React components
 * This demonstrates how to integrate logging in both client components and server components
 */
'use client';

import React, { useEffect, useState } from 'react';
import clientLogger from '../lib/client-logging';
import { ErrorBoundary } from 'react-error-boundary';

// Example: Agent dashboard table component with logging
export function AgentMerchantsTable({ agentId }: { agentId: string }) {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use component performance tracking
  const perf = clientLogger.useComponentPerformance('AgentMerchantsTable');
  
  useEffect(() => {
    async function fetchMerchantData() {
      // Start timing an operation
      const timerId = perf.start('fetch_merchants');
      
      try {
        // Log the data fetch attempt with component context
        clientLogger.info('Fetching merchants data for agent', {
          component: 'AgentMerchantsTable',
          agentId,
          limit: 50
        });
        
        // Simulate API call
        const response = await fetch(`/api/agents/${agentId}/merchants`);
        
        if (!response.ok) {
          throw new Error(`Error fetching merchants: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // End timing and get duration
        const duration = perf.end(timerId);
        
        // Log successful data fetch with performance metrics
        clientLogger.debug('Merchants data loaded successfully', {
          component: 'AgentMerchantsTable',
          count: data.length,
          duration: duration ? `${Math.round(duration)}ms` : undefined
        });
        
        setMerchants(data);
      } catch (err) {
        // Log errors with full context
        clientLogger.logError(
          'Failed to fetch merchants data',
          err,
          { 
            component: 'AgentMerchantsTable',
            agentId
          },
          true // Send critical errors to server for monitoring
        );
        
        setError(err instanceof Error ? err : new Error('Unknown error'));
        
        // Still end timing even if operation failed
        perf.end(timerId);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMerchantData();
  }, [agentId, perf]);
  
  // Render logic with appropriate logging
  if (loading) {
    return <div>Loading merchants data...</div>;
  }
  
  if (error) {
    // Log rendering error state
    clientLogger.warn('Rendering merchants table in error state', {
      component: 'AgentMerchantsTable',
      errorMessage: error.message
    });
    
    return (
      <div className="error-container">
        <h3>Error loading merchants data</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }
  
  if (merchants.length === 0) {
    // Log empty data state
    clientLogger.info('No merchants data available for agent', {
      component: 'AgentMerchantsTable',
      agentId
    });
    
    return <div>No merchants found for this agent.</div>;
  }
  
  return (
    <div className="merchants-table">
      <table>
        <thead>
          <tr>
            <th>Merchant Name</th>
            <th>Volume</th>
            <th>BPS</th>
            <th>Residual Earned</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map(merchant => (
            <tr key={merchant.id}>
              <td>{merchant.name}</td>
              <td>${merchant.volume.toLocaleString()}</td>
              <td>{merchant.bps}</td>
              <td>${merchant.residual.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Example of component with error boundary and logging
export function AgentDashboard({ agentId }: { agentId: string }) {
  // Log component mount/initialization
  useEffect(() => {
    clientLogger.info('Agent dashboard initialized', {
      component: 'AgentDashboard', 
      agentId
    });
    
    // Log component unmount/cleanup
    return () => {
      clientLogger.debug('Agent dashboard unmounting', {
        component: 'AgentDashboard',
        agentId
      });
    };
  }, [agentId]);
  
  // Error fallback component with logging
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
    useEffect(() => {
      // Log component crash to both console and server
      clientLogger.logComponentError(
        error,
        'AgentDashboard component tree',
        'AgentDashboard'
      );
    }, [error]);
    
    return (
      <div className="error-fallback">
        <h2>Something went wrong in the dashboard</h2>
        <p>{error.message}</p>
        <button onClick={resetErrorBoundary}>
          Try again
        </button>
      </div>
    );
  };
  
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Log error recovery attempts
        clientLogger.info('Agent dashboard error boundary reset', {
          component: 'AgentDashboard',
          agentId
        });
      }}
    >
      <div className="agent-dashboard">
        <h1>Agent Dashboard</h1>
        <section className="merchants-section">
          <h2>Merchant List</h2>
          <AgentMerchantsTable agentId={agentId} />
        </section>
      </div>
    </ErrorBoundary>
  );
}

// Server Component Example (for documentation purposes)
export const ServerComponentExample = `
// In app/agents/[agentId]/page.tsx (Server Component)
import { createSupabaseServerClient } from '../lib/supabase/server';
import logger from '@/lib/logging'; // Server-side logger
import { AgentDashboard } from '@/components/AgentDashboard';

export default async function AgentDashboardPage({ params }: { params: { agentId: string } }) {
  const { agentId } = params;
  
  try {
    // Log server-side data fetching
    logger.info('Server rendering agent dashboard page', { agentId });
    
    // Use performance tracking for server operations
    const agentData = await logger.withPerformanceTracking('get_agent_data', async () => {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
        
      if (error) throw error;
      return data;
    });
    
    return (
      <main>
        <AgentDashboard agentId={agentId} initialData={agentData} />
      </main>
    );
  } catch (error) {
    // Log server-side errors
    logger.logError('Failed to render agent dashboard page', error, { agentId });
    
    // Return error state
    return (
      <div>
        <h1>Error Loading Dashboard</h1>
        <p>Unable to load agent data. Please try again later.</p>
      </div>
    );
  }
}`;
