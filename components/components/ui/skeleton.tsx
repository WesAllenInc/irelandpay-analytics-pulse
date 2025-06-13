import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// MetricCardSkeleton
export function MetricCardSkeleton() {
  return (
    <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-5 h-32 w-full flex flex-col gap-2">
      <div className="w-1/3 h-4 bg-gray-300 rounded shimmer" />
      <div className="w-1/2 h-8 bg-gray-300 rounded shimmer" />
      <div className="w-full h-6 bg-gray-200 rounded mt-auto shimmer" />
    </div>
  );
}

// ChartSkeleton
export function ChartSkeleton() {
  return (
    <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-72 w-full flex flex-col gap-3">
      <div className="w-1/3 h-6 bg-gray-300 rounded shimmer" />
      <div className="w-full h-48 bg-gray-200 rounded mt-auto shimmer" />
    </div>
  );
}

// TableRowSkeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, idx) => (
        <td key={idx} className="px-2 py-2">
          <div className="h-5 w-full bg-gray-200 rounded shimmer animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export { Skeleton }
