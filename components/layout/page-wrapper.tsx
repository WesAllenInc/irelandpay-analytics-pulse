"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}

export function PageWrapper({
  children,
  className,
  fullWidth = false,
}: PageWrapperProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className={cn(
        "flex-1 container mx-auto py-6 px-4 md:px-6",
        fullWidth ? "max-w-full" : "max-w-7xl",
        className
      )}>
        {children}
      </main>
    </div>
  )
}
