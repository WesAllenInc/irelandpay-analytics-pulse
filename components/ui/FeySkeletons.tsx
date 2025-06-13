import React from 'react';

export function ChartSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-xl p-6 animate-pulse">
      <div className="h-6 w-32 bg-card-hover rounded mb-6" />
      <div className="h-[400px] bg-card-hover rounded" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-card-border/50 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-card-hover rounded w-24" />
        </td>
      ))}
    </tr>
  );
}
