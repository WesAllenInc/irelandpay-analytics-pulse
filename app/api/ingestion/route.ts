import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { ingestResiduals, ingestVolumes } from '@/lib/legacy-ingestion';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/api-utils';
import { logRequest, logError } from '@/lib/logging';

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
    const form = await request.formData();
    const results: any[] = [];
    
    // Validate that at least one file is present
    if ([...form.values()].filter(value => value instanceof File).length === 0) {
      return errorResponse('No files provided for ingestion', 400);
    }
    
    for (const [_, value] of form.entries()) {
      if (value instanceof File) {
        // Validate file type (can be expanded based on requirements)
        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.includes(value.type) && !value.name.match(/\.(csv|xls|xlsx)$/i)) {
          return errorResponse(`Invalid file type: ${value.type}. Only CSV and Excel files are supported.`, 400);
        }
        
        const buffer = Buffer.from(await value.arrayBuffer());
        const fileName = value.name;
        let result;
        
        try {
          if (fileName.toLowerCase().includes('residual')) {
            result = await ingestResiduals(buffer, fileName);
          } else {
            result = await ingestVolumes(buffer, fileName);
          }
          results.push(result);
        } catch (error) {
          logError(`Error processing file ${fileName}`, error instanceof Error ? error : new Error(String(error)));
          return errorResponse(`Error processing file ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
      }
    }
    
    // Validate response
    const responseData = { results };
    
    return successResponse(responseData);  
  } catch (error) {
    logError('Error in ingestion API route', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}
