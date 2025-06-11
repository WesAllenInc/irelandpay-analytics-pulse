"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardAnimationWrapperProps {
  children: React.ReactNode;
}

export function DashboardAnimationWrapper({ children }: DashboardAnimationWrapperProps) {
  return (
    <AnimatePresence>
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Export reusable motion components for dashboard sections
export function DashboardHeader({ children }: { children: React.ReactNode }) {
  return (
    <motion.div 
      className="flex items-center justify-between"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardSection({ 
  children, 
  className = "",
  delay = 0.3
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
