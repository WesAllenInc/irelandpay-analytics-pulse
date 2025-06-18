import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { CheckIcon, Spinner, XIcon } from "lucide-react";

interface ExcelUploadStatusProps {
  fileName?: string;
  fileSize?: number;
  status: "idle" | "uploading" | "processing" | "success" | "error";
  uploadProgress: number;
  processingResult?: {
    merchants: number;
    metrics?: number;
    residuals?: number;
  };
  datasetType?: "merchants" | "residuals";
  error?: string;
  onClose?: () => void;
}

export const ExcelUploadStatus: React.FC<ExcelUploadStatusProps> = ({
  fileName,
  fileSize = 0,
  status,
  uploadProgress,
  processingResult,
  datasetType = "merchants",
  error,
  onClose,
}) => {
  const { toast } = useToast();
  const [showCard, setShowCard] = useState(true);

  useEffect(() => {
    if (status === "success") {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded and processed ${fileName}`,
        variant: "default",
      });
    } else if (status === "error") {
      toast({
        title: "Upload Failed",
        description: error || "An unknown error occurred",
        variant: "destructive",
      });
    }
  }, [status, fileName, error, toast]);

  const handleClose = () => {
    setShowCard(false);
    if (onClose) onClose();
  };

  if (!showCard) {
    return null;
  }

  // Format file size to KB, MB, etc.
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          Excel Upload Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-2 pb-4">
        {fileName && (
          <div className="flex justify-between text-sm mb-4">
            <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%]">{fileName}</span>
            <span className="text-muted-foreground">{formatFileSize(fileSize)}</span>
          </div>
        )}
        
        {status === "uploading" && (
          <div>
            <Progress value={uploadProgress} className="h-2 mb-1" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
          </div>
        )}

        {status === "processing" && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3">
            <div className="flex items-center">
              <Spinner className="mr-3 h-4 w-4 animate-spin text-blue-500" />
              <div>
                <p className="font-bold">Processing Excel Data</p>
                <p className="text-sm">
                  Your file is being processed. This may take a moment...
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "success" && processingResult && (
          <div className="rounded-md bg-green-50 dark:bg-green-950 p-3">
            <div className="flex items-start">
              <div className="text-green-500 mt-1 mr-3">
                <CheckIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold">Upload Successful</p>
                <p className="mb-2">Successfully processed:</p>
                <div className="pl-2 mt-1">
                  <div className="mb-1 flex items-center">
                    <CheckIcon className="text-green-500 mr-2 h-3 w-3" />
                    <span>{processingResult.merchants} merchants</span>
                  </div>
                  {datasetType === "residuals" ? (
                    <div className="flex items-center">
                      <CheckIcon className="text-green-500 mr-2 h-3 w-3" />
                      <span>{processingResult.residuals} residual records</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <CheckIcon className="text-green-500 mr-2 h-3 w-3" />
                      <span>{processingResult.metrics} transaction metrics</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
            <div className="flex items-start">
              <div className="text-red-500 mt-1 mr-3">
                <XIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold">Upload Failed</p>
                <p>
                  {error || "An unknown error occurred while processing your file."}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-end">
        <Button 
          onClick={handleClose}
          variant={status === "error" ? "destructive" : "ghost"}
          size="sm"
        >
          {status === "error" ? "Dismiss" : "Close"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ExcelUploadStatus;
