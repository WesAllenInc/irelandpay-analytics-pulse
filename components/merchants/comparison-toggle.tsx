'use client'

import { useStore } from '@/lib/store'

export function ComparisonToggle() {
  const { comparisonMode, toggleComparisonMode } = useStore()
  
  return (
    <div className="flex items-center justify-end">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Comparison Mode:</span>
        <button
          onClick={toggleComparisonMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            comparisonMode ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              comparisonMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-white">
          {comparisonMode ? 'On' : 'Off'}
        </span>
      </div>
    </div>
  )
}
