'use client'

import React from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-white mb-2">Loading Leaderboard...</h2>
        <p className="text-gray-300">Please wait while we fetch the latest rankings.</p>
      </div>
    </div>
  )
} 