import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Database } from '@/types/database.types'

type MerchantData = Database['public']['Tables']['merchant_data']['Row'];
type ResidualData = Database['public']['Tables']['residual_data']['Row'];
type MasterData = Database['public']['Tables']['master_data_mv']['Row'];

interface DashboardState {
  // Selected date range
  dateRange: {
    from: Date
    to: Date
  }
  setDateRange: (from: Date, to: Date) => void
  
  // Selected merchants for comparison
  selectedMerchants: string[]
  addMerchant: (mid: string) => void
  removeMerchant: (mid: string) => void
  clearMerchants: () => void
  
  // Chart settings
  chartType: 'area' | 'line' | 'candlestick'
  setChartType: (type: 'area' | 'line' | 'candlestick') => void
  
  // View preferences
  showVolume: boolean
  toggleVolume: () => void
  
  // Comparison mode
  comparisonMode: boolean
  toggleComparisonMode: () => void

  // Dashboard state
  isLoading: boolean
  error: string | null
  
  // Merchants
  merchants: MerchantData[]
  selectedMerchant: MerchantData | null
  setMerchants: (merchants: MerchantData[]) => void
  setSelectedMerchant: (merchant: MerchantData | null) => void
  
  // Transactions
  residuals: ResidualData[]
  setResiduals: (residuals: ResidualData[]) => void
  
  // Master Data
  masterData: MasterData[]
  setMasterData: (masterData: MasterData[]) => void
  
  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useStore = create<DashboardState>()(devtools(persist((set) => ({
  // Initial state
  isLoading: false,
  error: null,
  
  // Merchants
  merchants: [],
  selectedMerchant: null,
  setMerchants: (merchants) => set({ merchants }),
  setSelectedMerchant: (selectedMerchant) => set({ selectedMerchant }),
  
  // Residuals
  residuals: [],
  setResiduals: (residuals) => set({ residuals }),
  
  // Master Data
  masterData: [],
  setMasterData: (masterData) => set({ masterData }),
  
  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  // Date range - default to last 90 days
  dateRange: {
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    to: new Date(),
  },
  setDateRange: (from, to) => set({ dateRange: { from, to } }),
  
  // Selected merchants for comparison
  selectedMerchants: [],
  addMerchant: (mid) =>
    set((state) => ({
      selectedMerchants: [...state.selectedMerchants, mid].slice(0, 5), // Max 5 merchants
    })),
  removeMerchant: (mid) =>
    set((state) => ({
      selectedMerchants: state.selectedMerchants.filter((m) => m !== mid),
    })),
  clearMerchants: () => set({ selectedMerchants: [] }),
  
  // Chart settings
  chartType: 'area',
  setChartType: (type) => set({ chartType: type }),
  
  // View preferences
  showVolume: false,
  toggleVolume: () => set((state) => ({ showVolume: !state.showVolume })),
  
  // Comparison mode
  comparisonMode: false,
  toggleComparisonMode: () =>
    set((state) => ({ comparisonMode: !state.comparisonMode })),
}), {
  name: 'dashboard-storage',
})));