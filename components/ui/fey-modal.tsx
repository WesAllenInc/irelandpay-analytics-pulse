import React from 'react';
import { X } from 'lucide-react';

export function FeyModal({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0A0A0A]/90 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl max-w-lg w-full mx-4 shadow-2xl">
        <div className="border-b border-[#1A1A1A] px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[#666666] hover:text-white transition-colors"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
