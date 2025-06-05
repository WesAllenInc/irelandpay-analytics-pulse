'use client';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StagewiseToolbar } from '@stagewise/toolbar-react';

// Configuration for the Stagewise toolbar
const toolbarConfig = {
  plugins: [], // Add your custom plugins here
};

/**
 * StagewiseToolbarWrapper component
 * 
 * This component initializes the Stagewise toolbar in a Next.js application.
 * It uses client-side rendering to mount the toolbar after the DOM is loaded.
 */
export function StagewiseToolbarWrapper() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Initialize toolbar
    const toolbarRoot = document.createElement('div');
    toolbarRoot.id = 'stagewise-toolbar-root';
    document.body.appendChild(toolbarRoot);

    const root = createRoot(toolbarRoot);
    root.render(<StagewiseToolbar config={toolbarConfig} />);

    // Cleanup function
    return () => {
      root.unmount();
      if (document.body.contains(toolbarRoot)) {
        document.body.removeChild(toolbarRoot);
      }
    };
  }, []);

  // Don't render anything on the server
  if (!isMounted) {
    return null;
  }

  // This component doesn't render anything visible
  return null;
}
