/**
 * Excel Processing Coordination Module
 * 
 * This module provides a unified interface for processing Excel files,
 * coordinating between API routes and Edge Functions based on file type and context.
 */

import { supabaseClient } from '@/lib/supabaseClient';

// Supported dataset types
export type DatasetType = 'merchants' | 'residuals';

// Response interface aligned between API route and Edge Function
export interface ProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  merchants?: number;
  metrics?: number;
  residuals?: number;
  fileName?: string;
}

/**
 * Process an uploaded Excel file based on its dataset type
 * 
 * @param path The path of the file in Supabase storage
 * @param datasetType The type of data contained in the Excel file
 * @param useEdgeFunction Whether to use Edge Function or API route for processing
 * @returns Processing result with counts of processed records
 */
export async function processExcelFile(
  path: string, 
  datasetType: DatasetType, 
  useEdgeFunction = false
): Promise<ProcessingResult> {
  try {
    if (useEdgeFunction) {
      // Use the appropriate Edge Function based on dataset type
      const functionName = datasetType === 'residuals' 
        ? 'processResidualExcel'
        : 'processMerchantExcel';
        
      // Call Edge Function
      const { data, error } = await supabaseClient.functions.invoke(functionName, {
        body: { path }
      });
      
      if (error) {
        console.error('Edge Function error:', error);
        return { 
          success: false, 
          error: `Error processing file through Edge Function: ${error.message || 'Unknown error'}` 
        };
      }
      
      return data as ProcessingResult;
    } else {
      // Use API route
      const response = await fetch('/api/process-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, datasetType }),
      });
      
      const result = await response.json();
      return result as ProcessingResult;
    }
  } catch (error: any) {
    console.error('Error in excel processing:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Upload an Excel file to Supabase storage
 * 
 * @param file The file to upload
 * @param datasetType The type of dataset being uploaded
 * @param onProgress Optional callback for upload progress
 * @returns The path of the uploaded file and success status
 */
export async function uploadExcelFile(
  file: File, 
  datasetType: DatasetType,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const bucketName = "uploads";
    const folderPath = datasetType === "merchants" ? "merchant" : "residual";
    const filePath = `${folderPath}/${file.name}`;
    
    const { data, error } = await supabaseClient
      .storage
      .from(bucketName)
      .upload(filePath, file, { 
        cacheControl: "3600", 
        upsert: true,
        // @ts-ignore - Progress option is available but not in types
        onUploadProgress: (progress: { loaded: number; total: number }) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          if (onProgress) onProgress(percent);
        }
      });
      
    if (error) {
      return { 
        success: false, 
        error: `Upload failed: ${error.message}` 
      };
    }
    
    return {
      success: true,
      path: filePath
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Unexpected error: ${error.message || 'Unknown error'}`
    };
  }
}
