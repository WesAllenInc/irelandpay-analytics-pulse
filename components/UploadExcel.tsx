"use client";

import { useState, useRef, ChangeEvent } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ExcelUploadStatus } from "@/components/ExcelUploadStatus";
import { FileSpreadsheet, Upload } from "lucide-react";

interface ProcessingResult {
  success: boolean;
  message: string;
  merchants?: number;
  metrics?: number;
  error?: string;
}

const UploadExcel = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (file) {
      toast({
        title: "File Selected",
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });
    }
  };

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingResult(null);
      setUploadStatus("uploading");
      setUploadProgress(0);
      
      // Create a custom upload with progress tracking
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        throw new Error("Invalid file format. Please upload an Excel file (.xlsx or .xls)");
      }

      // Simulate upload progress (Supabase doesn't provide upload progress natively)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 300);
      
      // Upload file to Supabase Storage
      const { data, error } = await supabaseClient
        .storage
        .from("uploads")
        .upload(`merchant/${selectedFile.name}`, selectedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        setUploadStatus("error");
        setErrorMessage(`Upload error: ${error.message}`);
        setIsProcessing(false);
        return;
      }
      
      // File uploaded successfully, now process it with the API endpoint
      setUploadStatus("processing");
      
      // Call the API endpoint to process the Excel file
      try {
        const response = await fetch('/api/process-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `merchant/${selectedFile.name}` }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setProcessingResult({
            success: true,
            message: "File processed successfully",
            merchants: result.merchants || 0,
            metrics: result.metrics || 0
          });
          setUploadStatus("success");
        } else {
          setProcessingResult({
            success: false,
            message: `Processing error: ${result.error}`,
            error: result.error
          });
          setErrorMessage(result.error || "Unknown processing error");
          setUploadStatus("error");
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown error';
        setProcessingResult({
          success: false,
          message: `API error: ${errorMsg}`,
          error: errorMsg
        });
        setErrorMessage(`API error: ${errorMsg}`);
        setUploadStatus("error");
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error("Error uploading file:", error);
      setErrorMessage((error as Error).message);
      setUploadStatus("error");
      setIsProcessing(false);
    }
  };

  const handleStatusClose = () => {
    if (uploadStatus === "success") {
      resetForm();
    } else {
      setUploadStatus("idle");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Merchant Excel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-slate-100 file:text-slate-700
                hover:file:bg-slate-200"
              ref={fileInputRef}
              onChange={onFileChange}
              disabled={isProcessing}
            />
          </div>
          
          <Button
            type="submit"
            disabled={isProcessing || !selectedFile}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Upload'}
          </Button>
        </form>
        
        {uploadStatus !== "idle" && (
          <div className="mt-6">
            <ExcelUploadStatus
              fileName={selectedFile?.name}
              fileSize={selectedFile?.size}
              uploadProgress={uploadProgress}
              status={uploadStatus}
              processingResult={processingResult?.success ? {
                merchants: processingResult.merchants,
                metrics: processingResult.metrics
              } : undefined}
              error={errorMessage}
              onClose={handleStatusClose}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadExcel;
