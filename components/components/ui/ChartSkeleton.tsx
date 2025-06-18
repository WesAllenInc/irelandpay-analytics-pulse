import React from "react";

export default function ChartSkeleton() {
  return (
    <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-72 w-full flex flex-col gap-3">
      <div className="w-1/3 h-6 bg-gray-300 rounded" />
      <div className="w-full h-48 bg-gray-200 rounded mt-auto" />
    </div>
  );
}
