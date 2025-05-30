"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { 
  LayoutDashboard, 
  Store, 
  BarChart3, 
  Settings, 
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
}

const NavItem = ({ href, icon, title, isActive }: NavItemProps) => {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-slate-800",
        isActive ? "bg-slate-800 text-white" : "text-slate-300"
      )}
    >
      {icon}
      <span>{title}</span>
    </Link>
  );
};

export default function NavSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useStore();
  
  const navItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      title: "Dashboard",
    },
    {
      href: "/dashboard/merchants",
      icon: <Store size={20} />,
      title: "Merchants",
    },
    {
      href: "/dashboard/analytics",
      icon: <BarChart3 size={20} />,
      title: "Analytics",
    },
    {
      href: "/dashboard/settings",
      icon: <Settings size={20} />,
      title: "Settings",
    },
  ];

  return (
    <aside className={cn(
      "bg-slate-900 text-white transition-all duration-300 ease-in-out",
      sidebarOpen ? "w-64" : "w-20"
    )}>
      <div className="flex h-16 items-center justify-between px-4">
        <div className={cn(
          "flex items-center gap-2 transition-all",
          sidebarOpen ? "opacity-100" : "opacity-0"
        )}>
          <div className="h-8 w-8 rounded-full bg-green-500"></div>
          <span className="font-bold">Ireland Pay</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>
      <nav className="flex flex-col gap-2 px-2 py-4">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            title={item.title}
            isActive={pathname === item.href}
          />
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className={cn(
          "flex items-center gap-3 rounded-lg bg-slate-800 p-3 transition-all",
          sidebarOpen ? "opacity-100" : "opacity-0"
        )}>
          <div className="h-10 w-10 rounded-full bg-slate-700"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Admin User</span>
            <span className="text-xs text-slate-400">admin@irelandpay.com</span>
          </div>
        </div>
      </div>
    </aside>
  );
}