"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChartTooltipProps {
  children: React.ReactNode
  className?: string
  visible?: boolean
  x?: number
  y?: number
}

export const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  ChartTooltipProps
>(({ children, className, visible = false, x = 0, y = 0, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
      {...props}
    >
      {children}
    </div>
  )
})
ChartTooltip.displayName = "ChartTooltip"

interface ChartTooltipItemProps {
  label: string
  value: string | number
  color?: string
  className?: string
}

export function ChartTooltipItem({
  label,
  value,
  color,
  className,
}: ChartTooltipItemProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex items-center gap-1">
        {color && (
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-xs text-muted-foreground">{label}:</span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  )
}

interface ChartTooltipTitleProps {
  children: React.ReactNode
  className?: string
}

export function ChartTooltipTitle({
  children,
  className,
}: ChartTooltipTitleProps) {
  return (
    <div className={cn("mb-1 font-medium", className)}>
      {children}
    </div>
  )
}

export function useChartTooltip() {
  const [visible, setVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [content, setContent] = React.useState<React.ReactNode>(null)
  
  const show = React.useCallback((x: number, y: number, content: React.ReactNode) => {
    setPosition({ x, y })
    setContent(content)
    setVisible(true)
  }, [])
  
  const hide = React.useCallback(() => {
    setVisible(false)
  }, [])
  
  const tooltipComponent = React.useMemo(() => (
    <ChartTooltip visible={visible} x={position.x} y={position.y}>
      {content}
    </ChartTooltip>
  ), [visible, position.x, position.y, content])
  
  return {
    show,
    hide,
    tooltipComponent,
  }
}
