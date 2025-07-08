import { useEffect, useState } from 'react';

/**
 * A hook that returns whether the current viewport is mobile or not.
 * @param breakpoint The breakpoint to use for the mobile check (default: 768)
 * @returns A boolean indicating if the screen size is below the breakpoint
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Initial check
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // Set the initial value
    checkIsMobile();
    
    // Add event listener for resize events
    window.addEventListener('resize', checkIsMobile);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [breakpoint]);
  
  return isMobile;
}
