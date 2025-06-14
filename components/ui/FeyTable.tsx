import React from 'react';
import type { ReactNode } from 'react';
import { ChevronsUpDown, MoreVertical } from 'lucide-react';
import Link from 'next/link';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
}

export interface FeyTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
}

export function FeyTable<T>({ data, columns, title }: FeyTableProps<T>) {
  return (
    <div className="
      bg-card border border-card-border rounded-xl
      hover:border-primary/20 transition-all duration-200
    ">
      {title && (
        <div className="px-6 py-4 border-b border-card-border">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className="
                    px-6 py-3 text-left text-xs font-medium
                    text-foreground-muted uppercase tracking-wider
                    hover:text-white transition-colors cursor-pointer
                  "
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    <ChevronsUpDown className="w-3 h-3 opacity-50" />
                  </div>
                </th>
              ))}
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr
                  key={`row-${rowIdx}`}
                  className="
                    border-b border-card-border/50
                    hover:bg-card-hover transition-colors
                    group cursor-pointer
                  "
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowIdx}-${column.key as string}`}
                      className="px-6 py-4 text-sm text-foreground"
                    >
                      {column.render ? column.render(row) : (row as any)[column.key]}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <button title="Actions" className="
                      opacity-0 group-hover:opacity-100
                      transition-opacity text-foreground-muted
                      hover:text-white
                    ">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr key="no-data" className="border-b border-card-border/50">
                <td 
                  colSpan={columns.length + 1} 
                  className="px-6 py-8 text-sm text-center text-muted-foreground"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
