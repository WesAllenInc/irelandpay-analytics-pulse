'use client';

import React from 'react';
import UploadPanel from '@/components/upload/UploadPanel';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Excel File Upload</h1>
      
      <div className="mb-8">
        <p className="text-muted-foreground">
          Upload Excel files for residual payouts and merchant volume data. Files will be automatically detected and processed based on their names.
        </p>
        <div className="mt-4 p-4 bg-muted rounded-md text-sm">
          <h3 className="font-medium mb-2">File naming conventions:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Residual files</strong>: Files containing "Residual" in the name (e.g., "Residual_May2025.xlsx")</li>
            <li><strong>Merchant Volume files</strong>: Files containing "Merchant" or "Volume" in the name (e.g., "Merchant_Data_May2025.xlsx")</li>
          </ul>
        </div>
      </div>
      
      <div className="mb-8">
        <UploadPanel />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
        <h3 className="font-medium mb-2">File Processing Information:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Residual files should include: MID, Merchant Name, Month, Net Profit, Residual Paid</li>
          <li>Merchant Volume files should include: MID, Merchant Name, Month, Total Volume</li>
          <li>The ingestion process will create or update merchants and agents as needed</li>
          <li>If a residual or volume entry already exists for the same merchant and month, it will be skipped</li>
          <li>Detailed error logs will be displayed for any rows that could not be processed</li>
        </ul>
      </div>
    </div>
  );
}
