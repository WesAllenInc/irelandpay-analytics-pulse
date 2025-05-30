import React from 'react';
import { Metadata } from 'next';
import NavSidebar from '@/components/dashboard/nav-sidebar';

export const metadata: Metadata = {
  title: 'Ireland Pay - Dashboard',
  description: 'Ireland Pay Analytics Dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <NavSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}