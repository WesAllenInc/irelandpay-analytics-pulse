'use client';
import { useState, useEffect } from 'react';

export interface DashboardDataOptions {
  selectedMerchant: { mid: string; merchant_dba: string } | null;
  dateRange: { from: string; to: string };
}

/**
 * Stub hook for dashboard data.
 * Replace with real data fetching logic.
 */
export function useDashboardData(
  selectedMerchant: DashboardDataOptions['selectedMerchant'],
  dateRange: DashboardDataOptions['dateRange']
) {
  const [volumeData, setVolumeData] = useState<{ value: number; time: string }[]>([]);
  const [netData, setNetData] = useState<{ value: number; time: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No-op stub: implement fetch here
    setLoading(false);
    setVolumeData([]);
    setNetData([]);
  }, [selectedMerchant, dateRange]);

  return { volumeData, netData, loading, error };
}
