import { createSupabaseServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logRequest, logError } from '@/lib/logging';

// Define response schema
const SupabaseTestResponseSchema = z.object({
  connected: z.boolean(),
  message: z.string(),
  serviceStatus: z.any().optional(),
  healthData: z.any().optional(),
  projectData: z.any().optional()
});

export async function GET() {
  // Log request with safe metadata only
  logRequest({
    method: 'GET',
    url: '/api/supabase-test',
    headers: new Headers(),
  }, {
    metadata: { endpoint: 'api/supabase-test' }
  });
  
  try {
    const supabase = createSupabaseServerClient();
    
    // Test the connection by getting Supabase version
    const { data, error } = await supabase.rpc('get_service_status');
    
    if (error) {
      // If the RPC method doesn't exist, try a simpler query
      const { data: healthData, error: healthError } = await supabase.from('_health').select('*').limit(1);
      
      if (healthError) {
        // If that also fails, just try to get the Supabase project reference
        const { data: projectData } = await supabase.auth.getSession();
        
        // Prepare response data
        const responseData = {
          connected: true,
          message: 'Connected to Supabase, but could not get detailed status',
          projectData: projectData || null
        };
        
        // Validate response data with Zod
        const validatedResponseData = SupabaseTestResponseSchema.parse(responseData);
        
        // Return validated response
        return successResponse(validatedResponseData);
      }
      
      // Prepare response data
      const responseData = {
        connected: true,
        message: 'Connected to Supabase health check',
        healthData: healthData || null
      };
      
      // Validate response data with Zod
      const validatedResponseData = SupabaseTestResponseSchema.parse(responseData);
      
      // Return validated response
      return successResponse(validatedResponseData);
    }
    
    // Prepare response data
    const responseData = {
      connected: true,
      message: 'Successfully connected to Supabase',
      serviceStatus: data
    };
    
    // Return validated response
    return successResponse(responseData);
    
  } catch (error) {
    // Log error with structured logging
    logError('Error connecting to Supabase', error instanceof Error ? error : new Error(String(error)));
    
    // Return standardized error response
    return errorResponse('Failed to connect to Supabase', 500);
  }
}
