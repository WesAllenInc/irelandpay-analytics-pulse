'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { Database } from '@/types/database.types'

type MasterData = Database['public']['Tables']['master_data_mv']['Row']

interface FreshnessInfo {
  volumeDataAge: number
  profitDataAge: number
  isProfitDataStale: boolean
}

interface MerchantHeaderProps {
  merchant: MasterData
  freshness: FreshnessInfo
}

export function MerchantHeader({ merchant, freshness }: MerchantHeaderProps) {
  const { addMerchant, selectedMerchants, toggleComparisonMode } = useStore()
  const [showExportOptions, setShowExportOptions] = useState(false)
  
  const handleAddToComparison = () => {
    addMerchant(merchant.mid)
    toggleComparisonMode()
  }
  
  const handleExportReport = () => {
    // This would be implemented with a PDF generation library
    console.log('Exporting report for merchant:', merchant.mid)
  }
  
  const handleExportCSV = () => {
    // This would download the raw data as CSV
    console.log('Exporting CSV for merchant:', merchant.mid)
  }
  
  const handleScheduleReport = () => {
    // This would open a modal to schedule automated reports
    console.log('Scheduling report for merchant:', merchant.mid)
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{merchant.merchant_dba}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-400">MID: {merchant.mid}</span>
            <span className="text-sm text-gray-400">Source: {merchant.datasource}</span>
            
            {/* Data freshness indicators */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${freshness.volumeDataAge <= 1 ? 'bg-green-500' : freshness.volumeDataAge <= 3 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">Volume</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${freshness.isProfitDataStale ? 'bg-red-500' : freshness.profitDataAge <= 30 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-xs text-gray-400">Profit</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/dashboard" 
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
          >
            Back to Dashboard
          </Link>
          
          <button 
            onClick={handleAddToComparison}
            disabled={selectedMerchants.includes(merchant.mid)}
            className={`px-4 py-2 ${
              selectedMerchants.includes(merchant.mid) 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } rounded-md text-sm transition-colors`}
          >
            {selectedMerchants.includes(merchant.mid) ? 'Added to Comparison' : 'Add to Comparison'}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportOptions(prev => !prev)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm transition-colors flex items-center gap-2"
            >
              Export
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                <div className="py-1">
                  <button 
                    onClick={handleExportReport}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                  >
                    Export as PDF
                  </button>
                  <button 
                    onClick={handleExportCSV}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                  >
                    Export as CSV
                  </button>
                  <button 
                    onClick={handleScheduleReport}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                  >
                    Schedule Reports
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <Link 
            href={`/dashboard/merchants/compare?ids=${merchant.mid}`}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-sm transition-colors"
          >
            Compare View
          </Link>
        </div>
      </div>
    </div>
  )
}
