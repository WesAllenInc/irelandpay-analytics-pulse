'use client';
import React, { ReactNode, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface FeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function FeyModal({ isOpen, onClose, title, children }: FeyModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLElement | null>(null);
  
  // Handle escape key press to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    
    // Store the previously focused element so we can restore focus when modal closes
    const previouslyFocusedElement = document.activeElement as HTMLElement;
    
    // Find all focusable elements within the modal
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length) {
      // Store the first focusable element
      initialFocusRef.current = focusableElements[0];
      // Focus the first element
      initialFocusRef.current.focus();
    }
    
    // Handle tab key to cycle through focusable elements within the modal
    const handleTabKey = (e: KeyboardEvent) => {
      if (!isOpen || !modalRef.current) return;
      
      // Only handle tab key
      if (e.key !== 'Tab') return;
      
      // If there are no focusable elements, do nothing
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // If shift + tab on the first element, cycle to the last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // If tab on the last element, cycle to the first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    window.addEventListener('keydown', handleTabKey);
    
    // Clean up: restore focus when the modal closes
    return () => {
      window.removeEventListener('keydown', handleTabKey);
      
      if (isOpen && previouslyFocusedElement) {
        // Restore focus when component unmounts or modal closes
        previouslyFocusedElement.focus();
      }
    };
  }, [isOpen]);
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 cursor-pointer"
          />
          {/* Modal */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-card-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <h3 id="modal-title" className="text-lg font-semibold text-white">{title}</h3>
              <button 
                aria-label="Close modal"
                onClick={onClose} 
                className="text-foreground-muted hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {/* Content */}
            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
