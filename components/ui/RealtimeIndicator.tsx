'use client';
import React from 'react';

export interface RealtimeIndicatorProps {
  status?: 'connected' | 'disconnected';
}

export function RealtimeIndicator({ status = 'connected' }: RealtimeIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={
          `w-2 h-2 rounded-full ${status === 'connected' ? 'bg-success' : 'bg-danger'}`
        } />
        {status === 'connected' && (
          <div className="
            absolute inset-0 rounded-full bg-success
            animate-ping opacity-75
          " />
        )}
      </div>
      <span className="text-xs text-foreground-muted">
        {status === 'connected' ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
