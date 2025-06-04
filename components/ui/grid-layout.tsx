"use client"

import React, { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface GridLayoutProps {
  children: ReactNode
  className?: string
  cols?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: "none" | "sm" | "md" | "lg"
}

export function GridLayout({
  children,
  className,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = "md",
}: GridLayoutProps) {
  // Generate grid template columns classes based on breakpoints
  const colsClasses = [
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean)

  const gapClasses = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4 md:gap-6",
    lg: "gap-6 md:gap-8",
  }

  return (
    <div
      className={cn(
        "grid w-full",
        colsClasses,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  )
}
