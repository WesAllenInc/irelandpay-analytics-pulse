import React from 'react';
import UploadExcel from '@/components/upload/UploadExcel';

export default function UploadsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Data Upload</h1>
      <div className="grid gap-6">
        <UploadExcel />
      </div>
    </div>
  );
}
