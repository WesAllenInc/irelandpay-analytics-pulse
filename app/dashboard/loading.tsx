'use client'

import React from 'react'

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="h-8 w-1/3 bg-gray-700 animate-pulse rounded-md" />

      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-700 animate-pulse rounded-lg" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-72 bg-gray-700 animate-pulse rounded-lg" />
        <div className="h-72 bg-gray-700 animate-pulse rounded-lg" />
      </div>

      {/* TradingView skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-80 bg-gray-700 animate-pulse rounded-lg" />
        <div className="h-80 bg-gray-700 animate-pulse rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="h-64 bg-gray-700 animate-pulse rounded-lg" />
    </div>
  )
}
