'use client';

import { getCsrfToken } from './csrf-client';

/**
 * Enhanced fetch function that automatically includes CSRF tokens
 * for non-GET requests
 */
export async function csrfFetch<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(options.method?.toUpperCase() || 'GET');
  
  // Clone the original headers
  const headers = new Headers(options.headers);
  
  // Add CSRF token for state-changing operations
  if (isStateChanging) {
    try {
      const token = await getCsrfToken();
      if (token) {
        headers.append('x-csrf-token', token);
      }
    } catch (error) {
      console.error('Failed to get CSRF token for request:', error);
      // Continue with the request even if token fetching fails
    }
  }
  
  // Merge the new headers back into the options
  const enhancedOptions: RequestInit = {
    ...options,
    headers,
    // Always include credentials to send cookies
    credentials: 'include',
  };
  
  // Make the fetch request
  const response = await fetch(url, enhancedOptions);
  
  // Handle token refresh header if present
  const refreshToken = response.headers.get('x-csrf-token');
  if (refreshToken) {
    try {
      // Store the new token for future requests
      localStorage.setItem('csrfToken', refreshToken);
    } catch (error) {
      console.error('Failed to store refreshed CSRF token:', error);
    }
  }
  
  // Handle JSON responses
  if (response.headers.get('content-type')?.includes('application/json')) {
    const data = await response.json();
    
    // Check if response was successful
    if (!response.ok) {
      // Special handling for CSRF errors
      if (response.status === 403 && data.error?.includes('CSRF')) {
        console.error('CSRF validation failed. Refreshing token...');
        // Force refresh token and retry once
        try {
          await getCsrfToken(true);
          // Retry the request with fresh token
          return csrfFetch(url, options);
        } catch (retryError) {
          console.error('Failed to refresh token for retry:', retryError);
          throw new Error(data.error || 'CSRF validation failed');
        }
      }
      
      // For other errors, just throw with the error message
      throw new Error(data.error || response.statusText);
    }
    
    return data as T;
  }
  
  // For non-JSON responses
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  
  return response as unknown as T;
}
