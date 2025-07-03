/**
 * API Utilities for validation and standardized responses
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logError } from './logging';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  validationErrors?: Record<string, string[]>;
  status?: number;
}

/**
 * Creates a standardized success response
 */
export function successResponse<T>(data: T, message?: string, status = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };

  return NextResponse.json(response, { status });
}

/**
 * Creates a standardized error response
 */
export function errorResponse(error: string | Error, status = 400, details?: any): NextResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  
  const response: ApiResponse = {
    success: false,
    error: errorMessage,
    ...(details && { data: details })
  };

  return NextResponse.json(response, { status });
}

/**
 * Creates a standardized validation error response
 */
export function validationErrorResponse(
  validationErrors: Record<string, string[]>,
  message = 'Validation error'
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: message,
    validationErrors
  };

  return NextResponse.json(response, { status: 400 });
}

/**
 * Parses and validates request data using Zod schema
 * Returns either validated data or a response with validation errors
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
  errorMessage = 'Invalid request data'
): Promise<{ data?: T; response?: NextResponse }> {
  try {
    // Parse request JSON
    const body = await request.json();
    
    // Validate with Zod
    const result = schema.safeParse(body);
    
    if (!result.success) {
      // Format Zod errors into a more readable structure
      const formattedErrors: Record<string, string[]> = {};
      
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(issue.message);
      }
      
      return {
        response: validationErrorResponse(formattedErrors, errorMessage)
      };
    }
    
    return { data: result.data };
  } catch (error) {
    logError('Request parsing error', error);
    return {
      response: errorResponse('Failed to parse request body', 400)
    };
  }
}

/**
 * Validates query parameters from URL search params
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>,
  errorMessage = 'Invalid query parameters'
): { data?: T; response?: NextResponse } {
  try {
    // Convert URLSearchParams to a plain object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Validate with Zod
    const result = schema.safeParse(params);
    
    if (!result.success) {
      // Format Zod errors
      const formattedErrors: Record<string, string[]> = {};
      
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(issue.message);
      }
      
      return {
        response: validationErrorResponse(formattedErrors, errorMessage)
      };
    }
    
    return { data: result.data };
  } catch (error) {
    logError('Query param validation error', error);
    return {
      response: errorResponse('Failed to validate query parameters', 400)
    };
  }
}

/**
 * Validates the response data before sending
 * If validation fails, it returns an internal server error instead of sending invalid data
 */
export function validateResponse<T>(
  data: any,
  schema: z.ZodType<T>,
  errorMessage = 'Internal data validation error'
): { data?: T; response?: NextResponse } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    logError('Response validation error', new Error(JSON.stringify(result.error.issues)));
    return {
      response: errorResponse(errorMessage, 500)
    };
  }
  
  return { data: result.data };
}
