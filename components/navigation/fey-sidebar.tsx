import React from "react";
import Link from "next/link";
import { Home, TrendingUp, FileText, Upload, Settings } from "lucide-react";

export function FeySidebar() {
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: TrendingUp, label: 'Analytics', path: '/analytics' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: Upload, label: 'Upload', path: '/upload' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="w-64 bg-[#050505] border-r border-[#1A1A1A] h-full flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">IP</span>
          </div>
          <span className="text-white font-semibold text-lg">IrelandPay</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#888888] hover:text-white hover:bg-[#0A0A0A] transition-all duration-200 mb-1"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-[#1A1A1A]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-[#1A1A1A] rounded-full" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">Sam Lee</p>
            <p className="text-xs text-[#666666]">samlee@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
