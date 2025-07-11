import { NextResponse } from 'next/server';
import { ingestResiduals, ingestVolumes, ResidualsData, VolumesData } from '@/lib/ingestion';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/api-utils';
import { logRequest, logError } from '@/lib/logging';

// Define schemas for request validation
const ResidualsDataSchema = z.object({
  dataType: z.literal('residuals'),
  month: z.string(),
  year: z.number(),
  data: z.array(z.object({
    merchantId: z.string(),
    amount: z.number(),
    processingDate: z.string().optional(),
    agentId: z.string().optional()
  }))
});

const VolumesDataSchema = z.object({
  dataType: z.literal('volumes'),
  month: z.string(),
  year: z.number(),
  data: z.array(z.object({
    merchantId: z.string(),
    volume: z.number(),
    processingDate: z.string().optional(),
    transactions: z.number().optional()
  }))
});

// Define schema for the response
const IngestionResponseSchema = z.object({
  results: z.array(z.any())
});

export async function POST(request: Request) {
  // Log request with safe metadata only
  logRequest(request, {
    metadata: { endpoint: 'api/ingestion' }
  });
  
  try {
    const body = await request.json();
    const results: any[] = [];
    
    // Check if this is residuals or volumes data based on the dataType field
    const dataType = body.dataType?.toLowerCase();
    
    if (!dataType) {
      return errorResponse('Missing dataType field. Must be either "residuals" or "volumes".', 400);
    }
    
    if (dataType === 'residuals') {
      // Validate residuals data structure
      const validation = ResidualsDataSchema.safeParse(body);
      if (!validation.success) {
        return errorResponse(`Invalid residuals data format: ${validation.error.message}`, 400);
      }
      
      try {
        const result = await ingestResiduals(body as ResidualsData);
        results.push(result);
      } catch (error) {
        logError(`Error processing residuals data`, error instanceof Error ? error : new Error(String(error)));
        return errorResponse(`Error processing residuals data: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
      }
    } else if (dataType === 'volumes') {
      // Validate volumes data structure
      const validation = VolumesDataSchema.safeParse(body);
      if (!validation.success) {
        return errorResponse(`Invalid volumes data format: ${validation.error.message}`, 400);
      }
      
      try {
        const result = await ingestVolumes(body as VolumesData);
        results.push(result);
      } catch (error) {
        logError(`Error processing volumes data`, error instanceof Error ? error : new Error(String(error)));
        return errorResponse(`Error processing volumes data: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
      }
    } else {
      return errorResponse(`Invalid dataType: ${dataType}. Must be either "residuals" or "volumes".`, 400);
    }
    
    // Validate response
    const responseData = { results };
    
    return successResponse(responseData);  
  } catch (error) {
    logError('Error in ingestion API route', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}
