'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { ingestResiduals, ingestVolumes } from '@/lib/legacy-ingestion';
import { CheckCircle, AlertCircle, Upload, FileSpreadsheet } from 'lucide-react';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadResult {
  fileName: string;
  fileType: 'residuals' | 'volumes' | 'unknown';
  status: 'success' | 'error' | 'partial';
  totalRows: number;
  rowsSuccess: number;
  rowsFailed: number;
  errors?: Record<number, string>;
}

const UploadPanel = () => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Set isMounted to true after component mounts
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setStatus('uploading');
    setProgress(10);
    setError(null);
    
    const newResults: UploadResult[] = [];
    
    for (const file of acceptedFiles) {
      try {
        // Check file type
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
          throw new Error(`File ${file.name} is not an Excel file`);
        }
        
        // Read file as array buffer
        const buffer = await file.arrayBuffer();
        setProgress(30);
        setStatus('processing');
        
        // Process file based on name
        let result: UploadResult;
        
        if (file.name.toLowerCase().includes('residual')) {
          // Process as residuals file
          const ingestResult = await ingestResiduals(buffer, file.name);
          
          result = {
            fileName: file.name,
            fileType: 'residuals',
            status: ingestResult.rowsFailed > 0 ? 'partial' : 'success',
            totalRows: ingestResult.totalRows,
            rowsSuccess: ingestResult.rowsSuccess,
            rowsFailed: ingestResult.rowsFailed,
            errors: ingestResult.errorLog
          };
        } 
        else if (file.name.toLowerCase().includes('merchant') || file.name.toLowerCase().includes('volume')) {
          // Process as merchant volume file
          const ingestResult = await ingestVolumes(buffer, file.name);
          
          result = {
            fileName: file.name,
            fileType: 'volumes',
            status: ingestResult.rowsFailed > 0 ? 'partial' : 'success',
            totalRows: ingestResult.totalRows,
            rowsSuccess: ingestResult.rowsSuccess,
            rowsFailed: ingestResult.rowsFailed,
            errors: ingestResult.errorLog
          };
        } 
        else {
          throw new Error(`File ${file.name} could not be identified as either a residuals or merchant volume file`);
        }
        
        newResults.push(result);
        setProgress(90);
      } 
      catch (err: any) {
        console.error('Upload error:', err);
        newResults.push({
          fileName: file.name,
          fileType: 'unknown',
          status: 'error',
          totalRows: 0,
          rowsSuccess: 0,
          rowsFailed: 0,
          errors: { 0: err.message || 'Unknown error occurred' }
        });
        setError(err.message || 'An error occurred while processing the file');
      }
    }
    
    setResults(prev => [...newResults, ...prev]);
    setStatus(error ? 'error' : 'success');
    setProgress(100);
    
    // Reset progress after 3 seconds
    setTimeout(() => {
      setProgress(0);
      setStatus('idle');
    }, 3000);
    
  }, [error]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true,
    disabled: !isMounted // Disable until mounted
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Excel Files</CardTitle>
        <CardDescription>
          Upload residual or merchant volume Excel files for processing. Files will be automatically detected and processed based on their names.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={dropzoneRef}
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors min-h-[200px] ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              {isDragActive ? (
                <FileSpreadsheet className="h-10 w-10 text-primary" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 text-center">
              <h3 className="font-medium text-lg">
                {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload Excel files for residuals or merchant volumes
              </p>
            </div>
          </div>
        </div>

        {(status === 'uploading' || status === 'processing') && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">
                {status === 'uploading' ? 'Uploading...' : 'Processing...'}
              </p>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results.length > 0 && (
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-medium">Upload History</h3>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{result.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        Type: {result.fileType === 'residuals' ? 'Residuals' : result.fileType === 'volumes' ? 'Merchant Volumes' : 'Unknown'}
                      </p>
                    </div>
                    {result.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : result.status === 'partial' ? (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Rows: {result.totalRows}</span>
                      <span>Success: {result.rowsSuccess}</span>
                      <span>Failed: {result.rowsFailed}</span>
                    </div>
                  </div>
                  
                  {result.rowsFailed > 0 && result.errors && (
                    <div className="mt-2 border-t pt-2">
                      <details className="text-sm">
                        <summary className="font-medium cursor-pointer">
                          Show Errors ({Object.keys(result.errors).length})
                        </summary>
                        <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                          {Object.entries(result.errors).map(([row, error]) => (
                            <div key={row} className="py-1">
                              <span className="font-medium">Row {row}:</span> {error}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadPanel;
