'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-8 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-destructive">Something went wrong</h2>
        <p className="mb-6 text-foreground-muted">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <Button 
          onClick={reset}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
