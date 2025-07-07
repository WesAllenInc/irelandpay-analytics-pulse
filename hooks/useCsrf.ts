'use client';

import { useState, useEffect } from 'react';

// Type definitions
interface CSRFHookResult {
  csrfToken: string;
  isLoading: boolean;
  getCsrfHeader: () => { 'x-csrf-token': string };
  getCsrfFormField: () => { name: string; value: string };
}

/**
 * React hook to manage CSRF token for forms and AJAX requests
 */
export default function useCsrf(): CSRFHookResult {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Function to fetch CSRF token from API
    const fetchCsrfToken = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/csrf/token', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important to include cookies
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        }

        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCsrfToken();

    // Refresh token periodically (every 20 minutes)
    const intervalId = setInterval(fetchCsrfToken, 20 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  /**
   * Get CSRF header for fetch/axios requests
   */
  const getCsrfHeader = () => ({
    'x-csrf-token': csrfToken,
  });

  /**
   * Get CSRF form field for HTML forms
   */
  const getCsrfFormField = () => ({
    name: '_csrf',
    value: csrfToken,
  });

  return {
    csrfToken,
    isLoading,
    getCsrfHeader,
    getCsrfFormField,
  };
}
