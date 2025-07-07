'use client';

/**
 * Client-side utilities for CSRF token management
 */

let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

/**
 * Get a CSRF token from the server or cache
 * @param forceRefresh Force a refresh of the token even if cached
 * @returns The CSRF token
 */
export async function getCsrfToken(forceRefresh = false): Promise<string> {
  // If we already have a token and we're not forcing a refresh, return it
  if (!forceRefresh && cachedToken) {
    return cachedToken;
  }

  // If we're already fetching a token, return the promise
  if (!forceRefresh && tokenPromise) {
    return tokenPromise;
  }

  // Create a new promise to fetch the token
  tokenPromise = new Promise(async (resolve, reject) => {
    try {
      // Check localStorage first (if available)
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedToken = localStorage.getItem('csrfToken');
        if (storedToken && !forceRefresh) {
          cachedToken = storedToken;
          resolve(storedToken);
          return;
        }
      }

      // Fetch from server if not in localStorage or forcing refresh
      const response = await fetch('/api/csrf/token', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }

      // Store in cache and localStorage
      cachedToken = data.csrfToken;
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('csrfToken', data.csrfToken);
      }

      resolve(data.csrfToken);
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      reject(error);
    } finally {
      // Clear the promise so we can fetch again if needed
      tokenPromise = null;
    }
  });

  return tokenPromise;
}

/**
 * Get CSRF headers for fetch/axios requests
 */
export async function getCsrfHeaders(): Promise<HeadersInit> {
  try {
    const token = await getCsrfToken();
    return {
      'x-csrf-token': token,
    };
  } catch (error) {
    console.error('Failed to get CSRF headers:', error);
    return {};
  }
}

/**
 * Get CSRF form field for HTML forms
 */
export async function getCsrfFormField(): Promise<{ name: string; value: string }> {
  try {
    const token = await getCsrfToken();
    return {
      name: '_csrf',
      value: token,
    };
  } catch (error) {
    console.error('Failed to get CSRF form field:', error);
    return {
      name: '_csrf',
      value: '',
    };
  }
}
