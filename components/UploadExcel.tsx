"use client";

import { useState, useRef, ChangeEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ExcelUploadStatus } from "@/components/ExcelUploadStatus";
import { FileSpreadsheet, Upload, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface ProcessingResult {
  success: boolean;
  message: string;
  merchants?: number;
  metrics?: number;
  residuals?: number;
  error?: string;
}

type DatasetType = "merchants" | "residuals";

interface UploadExcelProps {
  datasetType?: DatasetType;
}

const UploadExcel = ({ datasetType: initialDatasetType = "merchants" }: UploadExcelProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [datasetType, setDatasetType] = useState<DatasetType>(initialDatasetType);
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
    
    // Validate file size (max 10 MB)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSizeInBytes) {
      toast({
        title: "File Too Large",
        description: `File size exceeds 10MB. Please optimize your Excel file before uploading.`,
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
      
      // Upload file to Supabase Storage - use the correct bucket based on dataset type
      const bucketName = datasetType; // Use 'merchants' or 'residuals' bucket directly
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `${timestamp}-${selectedFile.name}`;
      
      const supabase = createSupabaseBrowserClient();
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
      
      // Call the API endpoint to process the Excel file
      try {
        const apiPath = "/api/process-excel"; // Using the unified API endpoint
        
        // Start timeout monitoring - set 30 sec timeout for processing
        const timeoutId = setTimeout(() => {
          if (uploadStatus === "processing") {
            setUploadStatus("error");
            setErrorMessage("Processing timed out. The file may be too large or complex. Please try again with a smaller file.");
            setIsProcessing(false);
          }
        }, 30000); // 30 seconds timeout
        
        const response = await fetch(apiPath, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            path: filePath, 
            datasetType,
            requestTime: new Date().toISOString() // Add timestamp for tracking
          }),
        });
        
        // Clear timeout since we got a response
        clearTimeout(timeoutId);
        
        const result = await response.json();
        
        if (result.success) {
          setProcessingResult({
            success: true,
            message: "File processed successfully",
            merchants: result.merchants || 0,
            metrics: result.metrics || 0,
            residuals: result.residuals || 0
          });
          setUploadStatus("success");
          
          // Log success analytics
          const header = response.headers.get('x-request-time');
          const requestTime = header ? new Date(header).getTime() : Date.now();
          console.info(`Successfully processed ${datasetType} file:`, {
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            merchants: result.merchants || 0,
            metrics: datasetType === "merchants" ? (result.metrics || 0) : 0,
            residuals: datasetType === "residuals" ? (result.residuals || 0) : 0,
            processingTime: Date.now() - requestTime
          });
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
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
          <FileSpreadsheet className="h-6 w-6" />
          Upload Excel
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Upload merchant or residual data from Excel files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="dataset-type" className="text-sm font-medium">Dataset Type</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {datasetType === "merchants" ? "Merchant Data" : "Residual Data"}
                <span className="sr-only">Select dataset type</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuItem onClick={() => setDatasetType("merchants")}>
                Merchant Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDatasetType("residuals")}>
                Residual Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <form onSubmit={handleFileUpload} className="space-y-6">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="excel-file" className="text-sm font-medium">Excel File</Label>
            <div className="flex flex-col gap-2">
              <input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                ref={fileInputRef}
                onChange={onFileChange}
                disabled={isProcessing}
                aria-describedby="file-format-info"
                aria-label="Select Excel file"
                title="Select an Excel file (.xlsx or .xls) to upload"
              />
              <p id="file-format-info" className="text-xs text-muted-foreground">
                Accepted formats: .xlsx, .xls
              </p>
            </div>
          </div>
          
          {selectedFile && (
            <Alert className="bg-muted/50 border">
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <span className="font-medium truncate max-w-[70%]">{selectedFile.name}</span>
                <span className="text-muted-foreground text-xs">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            type="submit"
            disabled={isProcessing || !selectedFile}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Skeleton className="h-4 w-4 rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {datasetType === "merchants" ? "Merchant" : "Residual"} Data
              </>
            )}
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
              processingResult={processingResult?.success ? {
                merchants: processingResult.merchants,
                metrics: processingResult.metrics,
                residuals: processingResult.residuals
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
