"use client"

import React, { ReactNode, memo } from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { ArrowDown, ArrowUp } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  description?: string
  trend?: {
    value: number
    isPositive?: boolean
    isUpGood?: boolean
  }
  className?: string
  valueClassName?: string
  onClick?: () => void
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
  valueClassName,
  onClick,
}: MetricCardProps) {
  // Determine if the trend is good or bad based on the direction and isUpGood
  const isTrendPositive = trend?.isPositive ?? false
  const isUpGood = trend?.isUpGood ?? true
  const isTrendGood = isUpGood ? isTrendPositive : !isTrendPositive
  
  return (
    <Card
      className={cn(
        "flex flex-col p-5 transition-all hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        {icon && <div className="text-gray-400 dark:text-gray-500">{icon}</div>}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className={cn(
            "text-2xl font-bold",
            valueClassName
          )}>
            {value}
          </span>
          
          {description && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </span>
          )}
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center text-sm font-medium",
            isTrendGood ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
          )}>
            {isTrendPositive ? (
              <ArrowUp className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDown className="w-4 h-4 mr-1" />
            )}
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
      
      {/* Responsive design - adjust padding and text size based on screen size */}
      <style jsx>{`
        @media (max-width: 640px) {
          .text-2xl {
            font-size: 1.25rem;
          }
          .p-5 {
            padding: 1rem;
          }
        }
      `}</style>
    </Card>
  )
})
