import { useState, useCallback } from "react"
import { createSupabaseBrowserClient } from "../lib/supabase-browser"
import { toast } from "../components/ui/use-toast"

type DataType = "merchants" | "residuals" | "agents"
type ValidationStatus = "pending" | "running" | "completed" | "failed"

export interface ValidationReport {
  id: string
  report_type: DataType
  report_scope?: string
  status: ValidationStatus
  total_records: number
  records_with_issues: number
  validation_timestamp: string
  execution_time_ms: number
  critical_issues?: number
  high_issues?: number
  medium_issues?: number
  low_issues?: number
  open_issues?: number
  resolved_issues?: number
  ignored_issues?: number
  created_at: string
}

export interface ValidationIssue {
  id: string
  report_id: string
  record_id: string
  record_type: string
  issue_type: string
  issue_severity: "critical" | "high" | "medium" | "low"
  field_path?: string
  description?: string
  api_value: any
  db_value: any
  resolution_status: "open" | "resolved" | "ignored"
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
  created_at: string
}

interface ValidationResult {
  success: boolean
  reportId?: string
  message?: string
}

interface ValidationOptions {
  dataType: DataType
  syncScope?: string
  sampleSize?: number
  validateAll?: boolean
}

export function useDataValidation() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<ValidationReport[]>([])
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [currentReport, setCurrentReport] = useState<ValidationReport | null>(null)

  // Trigger a new data validation
  const validateData = useCallback(async (options: ValidationOptions): Promise<ValidationResult> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke("validate-data", {
        body: options
      })

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Validation started",
        description: `Data validation for ${options.dataType} has been initiated.`
      })

      return {
        success: true,
        reportId: data?.reportId
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred"
      setError(message)
      
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: message
      })
      
      return {
        success: false,
        message
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Get validation reports
  const getValidationReports = useCallback(async (limit: number = 10): Promise<ValidationReport[]> => {
    setReportsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("validation_report_summaries")
        .select()
        .order("validation_timestamp", { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(error.message)
      }

      setReports(data || [])
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred"
      setError(message)
      return []
    } finally {
      setReportsLoading(false)
    }
  }, [supabase]);

  // Get validation issues for a report
  const getValidationIssues = useCallback(async (reportId: string): Promise<ValidationIssue[]> => {
    setIssuesLoading(true)
    setError(null)

    try {
      const { data: report, error: reportError } = await supabase
        .from("validation_report_summaries")
        .select()
        .eq("id", reportId)
        .single()

      if (reportError) {
        throw new Error(reportError.message)
      }

      setCurrentReport(report)

      const { data, error } = await supabase
        .from("data_validation_issues")
        .select()
        .eq("report_id", reportId)
        .order("issue_severity", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      setIssues(data || [])
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred"
      setError(message)
      return []
    } finally {
      setIssuesLoading(false)
    }
  }, [supabase]);

  // Resolve a validation issue
  const resolveIssue = useCallback(async (
    issueId: string, 
    resolutionStatus: "resolved" | "ignored",
    notes?: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error } = await supabase.rpc("resolve_validation_issue", {
        p_issue_id: issueId,
        p_resolution_status: resolutionStatus,
        p_resolved_by: user.id,
        p_resolution_notes: notes || null
      })

      if (error) {
        throw new Error(error.message)
      }

      // Update the local state
      setIssues(prev => prev.map(issue => {
        if (issue.id === issueId) {
          return {
            ...issue,
            resolution_status: resolutionStatus,
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            resolution_notes: notes || undefined
          } as ValidationIssue
        }
        return issue
      }))

      toast({
        title: "Issue updated",
        description: `Validation issue marked as ${resolutionStatus}`
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred"
      setError(message)
      
      toast({
        variant: "destructive",
        title: "Failed to update issue",
        description: message
      })
      
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase]);

  // Check validation report status
  const checkReportStatus = useCallback(async (reportId: string): Promise<ValidationStatus> => {
    try {
      const { data, error } = await supabase
        .from("data_validation_reports")
        .select("status")
        .eq("id", reportId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data?.status || "pending"
    } catch (err) {
      console.error("Error checking report status:", err)
      return "pending"
    }
  }, [supabase])

  return {
    validateData,
    getValidationReports,
    getValidationIssues,
    resolveIssue,
    checkReportStatus,
    reports,
    issues,
    currentReport,
    loading,
    reportsLoading,
    issuesLoading,
    error
  }
}
