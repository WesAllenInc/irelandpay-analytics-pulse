"use client";

import { useState, useRef, ChangeEvent } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useCallback } from "react";

interface ProcessingResult {
  success: boolean;
  message: string;
  summary?: {
    totalRecords: number;
    fileName: string;
  };
  error?: string;
}

const UploadExcel = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusColor, setStatusColor] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setStatusMessage("Please select a file");
      setStatusColor("text-red-600");
      setProcessingResult(null);
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingResult(null);
      setStatusMessage("Uploading file...");
      setStatusColor("text-blue-600");
      
      // Upload file to Supabase Storage
      const { data, error } = await supabaseClient
        .storage
        .from("uploads")
        .upload(`merchant/${selectedFile.name}`, selectedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        setStatusMessage(`Upload error: ${error.message}`);
        setStatusColor("text-red-600");
        setIsProcessing(false);
        return;
      }
      
      // File uploaded successfully, now process it with the API endpoint
      setStatusMessage("Processing Excel data...");
      
      // Call the API endpoint to process the Excel file
      try {
        const response = await fetch('/api/process-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `merchant/${selectedFile.name}` }),
        });
        
        const result = await response.json();
        setProcessingResult(result);
        
        if (result.success) {
          setStatusMessage(`Processed ${result.inserted} rows from ${selectedFile.name}`);
          setStatusColor('text-green-600');
          resetForm();
        } else {
          setStatusMessage(`Processing error: ${result.error}`);
          setStatusColor('text-red-600');
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        setStatusMessage(`API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
        setStatusColor("text-red-600");
        setProcessingResult({
          success: false,
          message: `API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
          error: apiError instanceof Error ? apiError.message : 'Unknown error'
        });
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error("Error uploading file:", error);
      setStatusMessage(`Upload error: ${(error as Error).message}`);
      setStatusColor("text-red-600");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Merchant Excel</h2>
      
      <form onSubmit={handleFileUpload}>
        <div className="mb-4">
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
        
        <button
          type="submit"
          className={`${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded px-4 py-2 font-medium`}
          disabled={isProcessing || !selectedFile}
        >
          {isProcessing ? 'Processing...' : 'Upload'}
        </button>
      </form>
      
      {statusMessage && (
        <div className={`mt-4 p-3 rounded ${statusColor === "text-green-600" ? "bg-green-100" : statusColor === "text-blue-600" ? "bg-blue-100" : "bg-red-100"}`}>
          <p className={statusColor}>{statusMessage}</p>
          
          {processingResult?.success && processingResult.summary && (
            <div className="mt-2 text-sm text-gray-700">
              <p><span className="font-semibold">File:</span> {processingResult.summary.fileName}</p>
              <p><span className="font-semibold">Records processed:</span> {processingResult.summary.totalRecords}</p>
              <p className="mt-2 text-xs text-gray-500">Data has been stored in your database.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadExcel;
