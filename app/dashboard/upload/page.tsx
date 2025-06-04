"use client";

import UploadExcel from "@/components/UploadExcel";

export default function UploadPage() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Upload Excel Data</h1>
        <UploadExcel />
      </div>
    </div>
  );
}
