import React from "react";

export function FeyCard({ 
  children, 
  className = "", 
  hover = true 
}: { 
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`
      bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl
      ${hover ? 'hover:border-[#2A2A2A] hover:bg-[#0F0F0F]' : ''}
      transition-all duration-200
      ${className}
    `}>
      {children}
    </div>
  );
}
