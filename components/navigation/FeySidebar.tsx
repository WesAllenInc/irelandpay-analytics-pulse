'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { animations } from '@/lib/animations';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Settings,
  Upload,
  Menu,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Merchants', path: '/dashboard/merchants', icon: Users },
  { name: 'Analytics', path: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Upload', path: '/dashboard/upload', icon: Upload },
  { name: 'Settings', path: '/dashboard/settings', icon: Settings },
];

export function FeySidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial="hidden" animate="visible" variants={animations.fadeIn}
      className={`
        ${collapsed ? 'w-16' : 'w-64'}
        bg-background-secondary border-r border-card-border
        transition-all duration-300 ease-in-out
        flex flex-col h-full
      `}
    >
      {/* Logo */}
      <div className="p-6 border-b border-card-border flex items-center justify-between">
        <div className={`flex items-center space-x-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="
            w-10 h-10 bg-primary rounded-lg
            flex items-center justify-center
            hover:bg-primary-glow transition-colors
          ">
            <span className="text-white font-bold">IP</span>
          </div>
          {!collapsed && <span className="text-white font-semibold">IrelandPay</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-foreground-muted hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          <span className="sr-only">Toggle sidebar</span>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`
              flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
              ${collapsed ? 'justify-center' : ''}
              text-foreground-muted hover:text-white hover:bg-card-hover
              transition-colors
            `}
          >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            {collapsed ? <span className="sr-only">{item.name}</span> : item.name}
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-card-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-card-border" />
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-foreground-muted">admin@irelandpay.com</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
