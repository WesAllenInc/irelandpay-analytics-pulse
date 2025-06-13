'use client';
import React from 'react';

export interface MerchantSelectorProps {
  selectedMerchant: { mid: string; merchant_dba: string } | null;
  onMerchantSelect: (merchant: { mid: string; merchant_dba: string }) => void;
}

export function MerchantSelector({ selectedMerchant, onMerchantSelect }: MerchantSelectorProps) {
  // Stub selector: no-op
  return null;
}
