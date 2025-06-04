"use client"

import React, { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ExcelUploadStatusProps {
  fileName?: string
  fileSize?: number
  uploadProgress?: number
  status: "idle" | "uploading" | "processing" | "success" | "error"
  processingResult?: {
    merchants?: number
    metrics?: number
  }
  error?: string
  onClose: () => void
}

export function ExcelUploadStatus({
  fileName,
  fileSize,
  uploadProgress = 0,
  status,
  processingResult,
  error,
  onClose,
}: ExcelUploadStatusProps) {
  const { toast } = useToast()
  const [showCard, setShowCard] = useState(true)

  useEffect(() => {
    // Show toast notification when upload completes
    if (status === "success") {
      toast({
        title: "Upload Complete",
        description: `Successfully processed ${processingResult?.merchants} merchants and ${processingResult?.metrics} metrics.`,
        variant: "success",
      })
    } else if (status === "error") {
      toast({
        title: "Upload Failed",
        description: error || "An unknown error occurred",
        variant: "destructive",
      })
    }
  }, [status, processingResult, error, toast])

  const handleClose = () => {
    setShowCard(false)
    onClose()
  }

  if (!showCard) return null

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    const kb = bytes / 1024
    return kb < 1024 ? `${kb.toFixed(2)} KB` : `${(kb / 1024).toFixed(2)} MB`
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileName && (
          <div className="flex justify-between text-sm">
            <span className="font-medium truncate max-w-[70%]">{fileName}</span>
            <span className="text-muted-foreground">{formatFileSize(fileSize)}</span>
          </div>
        )}

        {status === "uploading" && (
          <>
            <Progress value={uploadProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
          </>
        )}

        {status === "processing" && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Processing Excel Data</AlertTitle>
            <AlertDescription>
              Your file is being processed. This may take a moment...
            </AlertDescription>
          </Alert>
        )}

        {status === "success" && processingResult && (
          <Alert variant="success">
            <Check className="h-4 w-4" />
            <AlertTitle>Upload Successful</AlertTitle>
            <AlertDescription>
              <p>Successfully processed:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>{processingResult.merchants} merchants</li>
                <li>{processingResult.metrics} transaction metrics</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>
              {error || "An unknown error occurred while processing your file."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleClose}
          variant={status === "error" ? "destructive" : "secondary"}
          className="ml-auto"
        >
          {status === "error" ? "Dismiss" : "Close"}
        </Button>
      </CardFooter>
    </Card>
  )
}
