"use client"

import * as React from "react"
import { Download, FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type ExportFormat = "csv" | "excel" | "json" | "pdf"

interface DataExportButtonProps {
  data: any[] | (() => Promise<any[]>)
  filename?: string
  formats?: ExportFormat[]
  onExport?: (format: ExportFormat) => void
  className?: string
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
  disabled?: boolean
}

export function DataExportButton({
  data,
  filename = "export",
  formats = ["csv", "excel", "json"],
  onExport,
  className,
  variant = "outline",
  size = "sm",
  disabled = false,
}: DataExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false)
  const [exportFormat, setExportFormat] = React.useState<ExportFormat | null>(null)
  const { toast } = useToast()

  const handleExport = async (format: ExportFormat) => {
    try {
      setIsExporting(true)
      setExportFormat(format)
      
      // Call custom export handler if provided
      if (onExport) {
        onExport(format)
        setIsExporting(false)
        setExportFormat(null)
        return
      }
      
      // Get data (either direct or from async function)
      const exportData = typeof data === "function" ? await data() : data
      
      if (!exportData || !exportData.length) {
        toast({
          title: "No data to export",
          description: "There is no data available to export.",
          variant: "destructive",
        })
        return
      }
      
      // Process data based on format
      let content: string | Blob
      let mimeType: string
      let fileExtension: string
      
      switch (format) {
        case "csv":
          content = convertToCSV(exportData)
          mimeType = "text/csv;charset=utf-8;"
          fileExtension = "csv"
          break
        case "excel":
          content = convertToCSV(exportData)
          mimeType = "application/vnd.ms-excel"
          fileExtension = "xls"
          break
        case "json":
          content = JSON.stringify(exportData, null, 2)
          mimeType = "application/json;charset=utf-8;"
          fileExtension = "json"
          break
        case "pdf":
          // PDF generation would typically require a library like jsPDF
          // This is a placeholder for demonstration
          toast({
            title: "PDF Export",
            description: "PDF export requires additional setup. Please implement with a PDF library.",
          })
          setIsExporting(false)
          setExportFormat(null)
          return
        default:
          content = convertToCSV(exportData)
          mimeType = "text/csv;charset=utf-8;"
          fileExtension = "csv"
      }
      
      // Create download
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${filename}.${fileExtension}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export successful",
        description: `Data has been exported as ${fileExtension.toUpperCase()}.`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
      setExportFormat(null)
    }
  }
  
  // Helper function to convert data to CSV
  const convertToCSV = (data: any[]): string => {
    if (!data.length) return ""
    
    const headers = Object.keys(data[0])
    const csvRows = []
    
    // Add headers
    csvRows.push(headers.join(","))
    
    // Add rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header]
        // Handle values that need quotes (strings with commas, quotes, or newlines)
        if (typeof value === "string") {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      csvRows.push(values.join(","))
    }
    
    return csvRows.join("\n")
  }
  
  // If only one format is available, show a simple button
  if (formats.length === 1) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport(formats[0])}
        disabled={disabled || isExporting}
        className={cn("gap-1", className)}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        <span>Export</span>
      </Button>
    )
  }
  
  // Otherwise show a dropdown with format options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className={cn("gap-1", className)}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format)}
            disabled={isExporting}
            className="cursor-pointer"
          >
            {isExporting && exportFormat === format ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Export as {format.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
