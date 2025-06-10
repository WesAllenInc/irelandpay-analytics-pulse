import React, { ReactNode, useState } from "react";
import { FiMenu, FiUser, FiChevronDown, FiUpload, FiUsers, FiFileText, FiSettings, FiHome } from "react-icons/fi";
import Link from "next/link";
import clsx from "clsx";

interface DashboardLayoutProps {
  children: ReactNode;
  breadcrumbs?: ReactNode;
}

const navLinks = [
  { name: "Overview", icon: <FiHome />, href: "/dashboard" },
  { name: "Merchants", icon: <FiUsers />, href: "/dashboard/merchants" },
  { name: "Upload Data", icon: <FiUpload />, href: "/dashboard/upload" },
  { name: "Reports", icon: <FiFileText />, href: "/dashboard/reports" },
  { name: "Settings", icon: <FiSettings />, href: "/dashboard/settings" },
];

export default function DashboardLayout({ children, breadcrumbs }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e6f4ea] dark:from-[#101a14] dark:to-[#1a2e23]">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white/50 dark:bg-[#101a14]/60 backdrop-blur-sm shadow-sm flex items-center justify-between px-4 py-2 h-16">
        <div className="flex items-center gap-2">
          {/* Hamburger for mobile */}
          <button
            className="lg:hidden mr-2 p-2 rounded-md hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FiMenu size={22} />
          </button>
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary text-lg">
            <span className="rounded bg-primary p-1 text-white">IP</span>
            <span className="hidden sm:inline">IrelandPay</span>
          </Link>
          {/* Breadcrumbs */}
          {breadcrumbs && <nav className="ml-4 text-sm text-muted-foreground">{breadcrumbs}</nav>}
        </div>
        {/* User menu */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 px-3 py-1 rounded-md hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary">
            <FiUser />
            <span className="hidden md:inline">Account</span>
            <FiChevronDown size={16} />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:static z-40 top-0 left-0 h-full w-64 bg-white/80 dark:bg-[#101a14]/80 backdrop-blur-md border-r border-border transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Sidebar navigation"
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <span className="font-bold text-primary text-lg">IrelandPay</span>
        </div>
        <nav className="flex flex-col gap-1 mt-4 px-2">
          {navLinks.map(link => (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-4 px-4 pb-8 transition-all">
        {children}
      </main>
    </div>
  );
}
