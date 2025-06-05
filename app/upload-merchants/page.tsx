'use client';

import UploadMerchants from "@/components/UploadMerchants";

export default function UploadMerchantsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-3xl font-bold mb-6">Merchant Data Upload</h1>
      <div className="w-full max-w-2xl">
        <UploadMerchants />
      </div>
    </div>
  );
}
