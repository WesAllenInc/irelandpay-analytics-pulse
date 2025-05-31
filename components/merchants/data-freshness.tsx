'use client'

import { format } from 'date-fns'

interface DataFreshnessProps {
  volumeDataAge: number
  profitDataAge: number
  isProfitDataStale: boolean
  lastVolumeUpdate: Date | null
  lastProfitUpdate: Date | null
}

export function DataFreshness({
  volumeDataAge,
  profitDataAge,
  isProfitDataStale,
  lastVolumeUpdate,
  lastProfitUpdate
}: DataFreshnessProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Data Freshness</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Volume data freshness */}
        <div className="flex items-start gap-4">
          <div className={`w-3 h-3 mt-1.5 rounded-full ${
            volumeDataAge <= 1 ? 'bg-green-500' : 
            volumeDataAge <= 3 ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} />
          
          <div>
            <h3 className="text-lg font-medium text-white">Transaction Volume Data</h3>
            <p className="text-sm text-gray-400 mt-1">
              Last updated: {lastVolumeUpdate ? format(lastVolumeUpdate, 'MMM d, yyyy') : 'Unknown'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Age: {volumeDataAge} day{volumeDataAge !== 1 ? 's' : ''}
            </p>
            <div className={`mt-2 px-3 py-1.5 rounded-md text-sm ${
              volumeDataAge <= 1 ? 'bg-green-900 bg-opacity-50 text-green-300' : 
              volumeDataAge <= 3 ? 'bg-yellow-900 bg-opacity-50 text-yellow-300' : 
              'bg-red-900 bg-opacity-50 text-red-300'
            }`}>
              {volumeDataAge <= 1 ? (
                'Data is current (updated daily)'
              ) : volumeDataAge <= 3 ? (
                'Data is slightly delayed'
              ) : (
                'Data is outdated'
              )}
            </div>
          </div>
        </div>
        
        {/* Profit data freshness */}
        <div className="flex items-start gap-4">
          <div className={`w-3 h-3 mt-1.5 rounded-full ${
            isProfitDataStale ? 'bg-red-500' : 
            profitDataAge <= 30 ? 'bg-green-500' : 
            'bg-yellow-500'
          }`} />
          
          <div>
            <h3 className="text-lg font-medium text-white">Profit Data</h3>
            <p className="text-sm text-gray-400 mt-1">
              Last updated: {lastProfitUpdate ? format(lastProfitUpdate, 'MMM d, yyyy') : 'Unknown'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Age: {profitDataAge} day{profitDataAge !== 1 ? 's' : ''}
            </p>
            <div className={`mt-2 px-3 py-1.5 rounded-md text-sm ${
              isProfitDataStale ? 'bg-red-900 bg-opacity-50 text-red-300' : 
              profitDataAge <= 30 ? 'bg-green-900 bg-opacity-50 text-green-300' : 
              'bg-yellow-900 bg-opacity-50 text-yellow-300'
            }`}>
              {isProfitDataStale ? (
                '⚠️ Profit data is stale (>35 days)'
              ) : profitDataAge <= 30 ? (
                'Data is current (updated monthly)'
              ) : (
                'Data update expected soon'
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">About Data Updates</h3>
        <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
          <li>Transaction volume data is updated <span className="text-white">daily</span></li>
          <li>Profit and residual data is updated <span className="text-white">monthly</span></li>
          <li>Basis points and efficiency metrics are calculated from both data sources</li>
          <li>When comparing metrics, be aware of potential data freshness differences</li>
        </ul>
      </div>
    </div>
  )
}
