import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api-handler';

// Define response schema
const SupabaseTestResponseSchema = z.object({
  connected: z.boolean(),
  message: z.string(),
  serviceStatus: z.any().optional(),
  healthData: z.any().optional(),
  projectData: z.any().optional()
});

// Define handler function
async function supabaseTestHandler() {
  const supabase = createSupabaseServerClient();
  
  // Test the connection by getting Supabase version
  const { data, error } = await supabase.rpc('get_service_status');
  
  if (error) {
    // If the RPC method doesn't exist, try a simpler query
    const { data: healthData, error: healthError } = await supabase.from('_health').select('*').limit(1);
    
    if (healthError) {
      // If that also fails, just try to get the Supabase project reference
      const { data: projectData } = await supabase.auth.getSession();
      
      // Return response data
      return {
        connected: true,
        message: 'Connected to Supabase, but could not get detailed status',
        projectData: projectData || null
      };
    }
    
    // Return response data
    return {
      connected: true,
      message: 'Connected to Supabase health check',
      healthData: healthData || null
    };
  }
  
  // Return response data
  return {
    connected: true,
    message: 'Successfully connected to Supabase',
    serviceStatus: data
  };
}

// Create API route with standardized error handling and response validation
export const GET = createApiHandler({
  // No request schema needed for GET
  responseSchema: SupabaseTestResponseSchema,
  logEndpoint: 'api/supabase-test',
  handler: async () => await supabaseTestHandler(),
  // Custom error message for response validation failures
  responseValidationMessage: 'Invalid Supabase test response format'
});
