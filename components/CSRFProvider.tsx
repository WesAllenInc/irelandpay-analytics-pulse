'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCsrfToken } from '@/lib/csrf-client';

// Create a context for CSRF token
interface CSRFContextType {
  csrfToken: string | null;
  refreshToken: () => Promise<string>;
  isLoading: boolean;
}

const CSRFContext = createContext<CSRFContextType>({
  csrfToken: null,
  refreshToken: async () => '',
  isLoading: true,
});

/**
 * Hook to use CSRF token from context
 */
export const useCSRF = () => useContext(CSRFContext);

interface CSRFProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages CSRF token lifecycle
 * Automatically refreshes tokens and makes them available throughout the app
 */
export function CSRFProvider({ children }: CSRFProviderProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Function to refresh the token
  const refreshToken = async (force = false): Promise<string> => {
    try {
      setIsLoading(true);
      const token = await getCsrfToken(force);
      setCsrfToken(token);
      return token;
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      return '';
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial token fetch
    refreshToken();

    // Set up periodic token refresh (every 20 minutes)
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 20 * 60 * 1000);

    // Set up visibility change listener to refresh token when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const contextValue: CSRFContextType = {
    csrfToken,
    refreshToken: () => refreshToken(true),
    isLoading,
  };

  return (
    <CSRFContext.Provider value={contextValue}>
      {children}
    </CSRFContext.Provider>
  );
}
