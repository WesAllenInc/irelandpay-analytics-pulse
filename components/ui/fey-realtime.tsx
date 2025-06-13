import React from "react";

// Adding a custom animation duration via Tailwind's extended classes
// This avoids inline styles and follows CSS best practices
export function FeyRealtimeIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-2 h-2 bg-[#00CC66] rounded-full" />
        <div className="absolute inset-0 bg-[#00CC66] rounded-full animate-ping opacity-75 [animation-duration:2s]" />
      </div>
      <span className="text-xs text-[#666666] font-medium">LIVE</span>
    </div>
  );
}
