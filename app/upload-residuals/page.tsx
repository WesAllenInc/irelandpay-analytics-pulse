'use client';

import UploadResiduals from "@/components/UploadResiduals";

export default function UploadResidualsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-3xl font-bold mb-6">Residual Payouts Upload</h1>
      <div className="w-full max-w-2xl">
        <UploadResiduals />
      </div>
    </div>
  );
}
