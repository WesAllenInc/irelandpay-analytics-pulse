'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@supabase/ssr';
import { adminServiceClient, AdminUser } from '@/lib/auth/admin-service-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export function useAdminCheck() {
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminUser | null>(null);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user?.id) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const admin = await adminServiceClient.getCurrentAdmin();
        setIsAdmin(!!admin);
        setAdminData(admin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminStatus();
  }, [user?.id]);

  return { isAdmin, isLoading, adminData };
}

// Admin-only component wrapper
export function AdminOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAdmin, isLoading } = useAdminCheck();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">
          Loading admin status...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return fallback || (
      <Alert className="m-4 border-destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Admin Access Required</AlertTitle>
        <AlertDescription>
          This feature is restricted to administrators only. Please contact your system administrator if you believe you should have access.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

// Admin badge component
export function AdminBadge() {
  const { isAdmin, isLoading } = useAdminCheck();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-full">
      <ShieldAlert className="h-3 w-3" />
      Admin
    </div>
  );
} 