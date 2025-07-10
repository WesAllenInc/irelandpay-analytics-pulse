'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, BarChart3, RefreshCw } from 'lucide-react';
import { Root as RadioGroup, Item as RadioGroupItem } from '@radix-ui/react-radio-group';
import { ExcelUploadStatus } from './ExcelUploadStatus';
import { formatFileSize } from '@/lib/utils/file-utils';

// Initialize Supabase client
const supabase = createSupabaseBrowserClient();

// Types
type DatasetType = 'merchants' | 'residuals';

interface ProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  merchants?: number;
  metrics?: number;
  residuals?: number;
}

// Utility function now imported from shared utility file

export const UploadExcel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [datasetType, setDatasetType] = useState<DatasetType>("merchants");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (file) {
      toast({
        title: "File Selected",
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        variant: "default",
      });
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
      
      // Validate file extension
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        throw new Error("Invalid file format. Please upload an Excel file (.xlsx or .xls)");
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 300);
      
      // Upload file to Supabase Storage
      const bucketName = "uploads";
      const folderPath = datasetType === "merchants" ? "merchant" : "residual";
      const filePath = `${folderPath}/${selectedFile.name}`;
      
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, selectedFile, {
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
      
      // Get the URL for the uploaded file
      const { data: fileUrlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      const fileUrl = fileUrlData.publicUrl;

      // Process the file with the API endpoint
      const apiUrl = `/api/process-excel`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          filePath: filePath,
          fileUrl: fileUrl,
          datasetType: datasetType
        }),
      });
      
      const result: ProcessingResult = await response.json();
      
      setProcessingResult(result);
      setUploadStatus(result.success ? "success" : "error");
      
      if (!result.success) {
        setErrorMessage(result.error || "Failed to process file");
      }
      
    } catch (error: unknown) {
      setUploadStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
      console.error("Upload error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusClose = () => {
    if (uploadStatus === "success") {
      resetForm();
    }
    setProcessingResult(null);
  };

  return (
    <Card className="shadow-md border border-card-border overflow-hidden">
      <CardHeader className="pb-2 bg-muted/30 border-b border-border">
        <div className="flex items-center">
          <div className="mr-2 bg-primary/10 p-2 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Upload Excel Data</CardTitle>
            <CardDescription>Upload merchant or residual data for analysis</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
              <Label htmlFor="dataset-type" className="font-medium">Dataset Type</Label>
            </div>
            <RadioGroup
              value={datasetType}
              onValueChange={(value: string) => setDatasetType(value as DatasetType)}
              className="flex space-x-4"
              id="dataset-type"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merchants" id="merchants" />
                <Label htmlFor="merchants">Merchant Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="residuals" id="residuals" />
                <Label htmlFor="residuals">Residual Data</Label>
              </div>
            </RadioGroup>
          </div>
          
          <form onSubmit={handleFileUpload} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="excel-file">Excel File</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                className="cursor-pointer"
                ref={fileInputRef}
                onChange={onFileChange}
                disabled={isProcessing}
                aria-describedby="file-format-info"
                aria-label="Select Excel file" 
              />
              <p id="file-format-info" className="text-xs text-muted-foreground">
                Accepted formats: .xlsx, .xls
              </p>
            </div>
            
            {selectedFile && (
              <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950">
                <div className="flex justify-between w-full items-center">
                  <span className="font-medium truncate max-w-[70%]">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </span>
                </div>
              </div>
            )}
            
            <Button
              type="submit"
              disabled={isProcessing || !selectedFile}
              className="w-full sm:w-auto"
            >
              {isProcessing ? "Processing..." : `Upload ${datasetType === "merchants" ? "Merchant" : "Residual"} Data`}
            </Button>
          </form>
          
          {uploadStatus !== "idle" && (
            <div className="mt-6">
              <ExcelUploadStatus
                fileName={selectedFile?.name}
                fileSize={selectedFile?.size}
                uploadProgress={uploadProgress}
                status={uploadStatus}
                datasetType={datasetType}
                processingResult={processingResult?.success && processingResult.merchants ? {
                  merchants: processingResult.merchants || 0,
                  metrics: processingResult.metrics,
                  residuals: processingResult.residuals
                } : undefined}
                error={errorMessage}
                onClose={handleStatusClose}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadExcel;
