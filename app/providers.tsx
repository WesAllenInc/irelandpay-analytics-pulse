'use client';

import React from 'react';
import { CSRFProvider } from '@/components/CSRFProvider';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CSRFProvider>
      {children}
    </CSRFProvider>
  );
}
