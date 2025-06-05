'use client';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StagewiseToolbar } from '@stagewise/toolbar-react';

// Add type declaration for the global window object
declare global {
  interface Window {
    retryStagewiseConnection?: () => void;
  }
}

// Configuration for the Stagewise toolbar
const toolbarConfig = {
  plugins: [], // Add your custom plugins here
  allowExternalConnections: true, // Enable connections from external browsers
  autoConnect: true, // Automatically attempt to connect
  debug: true, // Enable debug mode for better troubleshooting
};

/**
 * StagewiseToolbarWrapper component
 * 
 * This component initializes the Stagewise toolbar in a Next.js application.
 * It uses client-side rendering to mount the toolbar after the DOM is loaded.
 * Enhanced with better external browser support and connection handling.
 */
export function StagewiseToolbarWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if sessionStorage is available
    const isSessionStorageAvailable = () => {
      try {
        const testKey = '__stagewise_test__';
        window.sessionStorage.setItem(testKey, testKey);
        window.sessionStorage.removeItem(testKey);
        return true;
      } catch (e) {
        console.warn('sessionStorage is not available in this environment');
        return false;
      }
    };

    // Don't initialize if sessionStorage is not available
    if (!isSessionStorageAvailable()) {
      console.log('Stagewise toolbar disabled due to missing sessionStorage');
      return;
    }

    // Add a small delay to ensure the DOM is fully loaded
    const timer = setTimeout(() => {
      try {
        // Initialize toolbar
        const toolbarRoot = document.createElement('div');
        toolbarRoot.id = 'stagewise-toolbar-root';
        toolbarRoot.setAttribute('data-external-browser', 'true');
        document.body.appendChild(toolbarRoot);

        const root = createRoot(toolbarRoot);
        root.render(<StagewiseToolbar config={toolbarConfig} />);

        // Add a global function to retry connection
        window.retryStagewiseConnection = () => {
          const event = new CustomEvent('stagewise:retry-connection');
          document.dispatchEvent(event);
          console.log('Stagewise connection retry triggered');
          setConnectionAttempted(true);
        };

        // Listen for connection status changes
        const handleConnectionStatus = (event: CustomEvent) => {
          console.log('Stagewise connection status:', event.detail);
        };
        document.addEventListener('stagewise:connection-status', handleConnectionStatus as EventListener);

        setConnectionAttempted(true);
      } catch (error) {
        console.error('Error initializing Stagewise toolbar:', error);
      }
    }, 500);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      const toolbarRoot = document.getElementById('stagewise-toolbar-root');
      if (toolbarRoot) {
        document.body.removeChild(toolbarRoot);
      }
      // Remove global function
      if (window.retryStagewiseConnection) {
        delete window.retryStagewiseConnection;
      }
      document.removeEventListener('stagewise:connection-status', () => {});
    };
  }, []);

  // Don't render anything on the server
  if (!isMounted) {
    return null;
  }

  // This component doesn't render anything visible
  return null;
}
