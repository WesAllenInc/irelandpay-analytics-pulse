/**
 * API Handler Higher-Order Function
 * Provides standardized request validation, error handling, and response validation
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logRequest, logError } from './logging';
import { validateRequest, validateQueryParams, validateResponse, successResponse, errorResponse } from './api-utils';

export type ApiHandlerOptions<TReq, TRes> = {
  // Required
  handler: (data: TReq, req: NextRequest) => Promise<TRes>;
  
  // Optional schemas
  requestSchema?: z.ZodType<TReq>;
  responseSchema?: z.ZodType<TRes>;
  queryParamsSchema?: z.ZodType<any>;
  
  // Error messages
  requestValidationMessage?: string;
  responseValidationMessage?: string;
  queryValidationMessage?: string;
  
  // Additional options
  logEndpoint?: string;
  skipRequestValidation?: boolean;
  skipResponseValidation?: boolean;
};

/**
 * Creates a standardized API route handler with request and response validation
 * 
 * @example
 * // Basic usage
 * export const POST = createApiHandler({
 *   requestSchema: MyRequestSchema,
 *   responseSchema: MyResponseSchema,
 *   handler: async (data) => {
 *     // Your logic here
 *     return result;
 *   }
 * });
 * 
 * @example
 * // With query parameters
 * export const GET = createApiHandler({
 *   queryParamsSchema: MyQuerySchema,
 *   handler: async (data, request) => {
 *     // data contains validated query params
 *     return result;
 *   }
 * });
 */
export function createApiHandler<TReq = any, TRes = any>(
  options: ApiHandlerOptions<TReq, TRes>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const endpoint = options.logEndpoint || `api/${request.nextUrl.pathname.split('/').pop()}`;
    
    // Log the incoming request
    logRequest(request, {
      metadata: { endpoint }
    });
    
    try {
      let validatedData: TReq;
      
      // For GET requests or when skipRequestValidation is true, we don't validate the request body
      if (request.method === 'GET' || options.skipRequestValidation) {
        if (options.queryParamsSchema) {
          // Validate query parameters if schema is provided
          const queryParams = new URLSearchParams(request.nextUrl.search);
          const validation = validateQueryParams(
            queryParams,
            options.queryParamsSchema,
            options.queryValidationMessage || 'Invalid query parameters'
          );
          
          if (validation.response) return validation.response;
          validatedData = validation.data as TReq;
        } else {
          // No validation needed
          validatedData = {} as TReq;
        }
      } else if (options.requestSchema) {
        // Validate request body with the provided schema
        const validation = await validateRequest<TReq>(
          request,
          options.requestSchema,
          options.requestValidationMessage || 'Invalid request data'
        );
        
        if (validation.response) return validation.response;
        validatedData = validation.data as TReq;
      } else {
        // No schema provided, just parse JSON
        try {
          if (request.method !== 'GET') {
            validatedData = await request.clone().json() as TReq;
          } else {
            validatedData = {} as TReq;
          }
        } catch (e) {
          return errorResponse('Invalid JSON in request body', 400);
        }
      }
      
      // Call the handler function with validated data
      const result = await options.handler(validatedData, request);
      
      // Validate the response if a schema is provided and validation isn't skipped
      if (options.responseSchema && !options.skipResponseValidation) {
        const validation = validateResponse(
          result,
          options.responseSchema,
          options.responseValidationMessage || 'Internal data validation error'
        );
        
        if (validation.response) return validation.response;
        return successResponse(validation.data);
      }
      
      // Return success response with the result
      return successResponse(result);
    } catch (error) {
      // Determine if it's a client error (4xx) or server error (5xx)
      let status = 500;
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof z.ZodError) {
        status = 400;
        errorMessage = 'Validation error';
      } else if (error instanceof Error) {
        // Check for custom error properties that might indicate a specific status code
        const anyError = error as any;
        if (anyError.status && typeof anyError.status === 'number') {
          status = anyError.status;
        }
        
        errorMessage = error.message || errorMessage;
      }
      
      // Log the error with detailed information
      logError(`[${endpoint}] ${errorMessage}`, error instanceof Error ? error : new Error(String(error)));
      
      // Return standardized error response
      return errorResponse(errorMessage, status, { 
        path: request.nextUrl.pathname,
        method: request.method
      });
    }
  };
}

/**
 * Helper to create custom errors with status codes
 */
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Common API response schemas that can be reused
 */
export const CommonSchemas = {
  // Generic success response with a message
  SuccessResponse: z.object({
    success: z.literal(true),
    message: z.string().optional()
  }),
  
  // Paginated results schema
  PaginatedResponse: <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalItems: z.number().int().nonnegative(),
      totalPages: z.number().int().positive()
    })
  }),
  
  // Common query params for pagination
  PaginationParams: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    pageSize: z.string().regex(/^\d+$/).transform(Number).optional().default('10')
  })
};
