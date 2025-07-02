import { useEffect } from "react";

/**
 * Legacy NotFound component replaced by app/not-found.tsx
 * This file remains for backward compatibility and redirects to the root
 */
const NotFound = () => {
  useEffect(() => {
    // Redirect to the homepage, which will show the proper 404 if needed
    window.location.href = '/';
  }, []);

  // Simple loading state while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p>Redirecting...</p>
      </div>
    </div>
  );
};

export default NotFound;
