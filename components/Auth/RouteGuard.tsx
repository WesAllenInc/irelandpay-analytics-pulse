'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type RouteGuardProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
};

/**
 * Route guard component to protect routes based on authentication and role
 * 
 * @param children - Components to render if authorized
 * @param requireAuth - Whether route requires authentication
 * @param requireAdmin - Whether route requires admin role
 */
export default function RouteGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
}: RouteGuardProps) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip checks if loading
    if (loading) return;

    // If authentication is required and user is not authenticated
    if (requireAuth && !user) {
      router.push('/auth');
      return;
    }

    // If admin rights are required and user is not admin
    if (requireAdmin && !isAdmin) {
      // Redirect to agent dashboard or leaderboard
      router.push('/leaderboard');
      return;
    }
  }, [user, isAdmin, loading, requireAuth, requireAdmin, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-primary">Verifying credentials...</span>
      </div>
    );
  }

  // Only render children if:
  // 1. No auth required, or
  // 2. Auth required and user is authenticated, and
  // 3. No admin required or user is admin
  if (!requireAuth || (user && (!requireAdmin || isAdmin))) {
    return <>{children}</>;
  }

  // Don't render anything while redirecting
  return null;
}
