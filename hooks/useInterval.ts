import { useEffect, useRef } from 'react';

/**
 * Custom hook for setting up an interval that is properly cleaned up on unmount
 * @param callback Function to call at each interval
 * @param delay Delay in milliseconds, or null to pause
 */
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
    
    // No cleanup needed if delay is null
    return undefined;
  }, [delay]);
}

export default useInterval;
