import { create } from 'zustand';
import { Database } from '@/types/database';

type Merchant = Database['public']['Tables']['merchants']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];
type Analytics = Database['public']['Tables']['analytics']['Row'];

interface AppState {
  // Dashboard state
  isLoading: boolean;
  error: string | null;
  
  // Merchants
  merchants: Merchant[];
  selectedMerchant: Merchant | null;
  setMerchants: (merchants: Merchant[]) => void;
  setSelectedMerchant: (merchant: Merchant | null) => void;
  
  // Transactions
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  
  // Analytics
  analytics: Analytics[];
  setAnalytics: (analytics: Analytics[]) => void;
  
  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Date range for filtering
  dateRange: {
    from: Date;
    to: Date;
  };
  setDateRange: (range: { from: Date; to: Date }) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  isLoading: false,
  error: null,
  
  // Merchants
  merchants: [],
  selectedMerchant: null,
  setMerchants: (merchants) => set({ merchants }),
  setSelectedMerchant: (selectedMerchant) => set({ selectedMerchant }),
  
  // Transactions
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  
  // Analytics
  analytics: [],
  setAnalytics: (analytics) => set({ analytics }),
  
  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  // Date range - default to last 30 days
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  },
  setDateRange: (dateRange) => set({ dateRange }),
}));