"use client"

import React from "react"
import { MainNav } from "@/components/layout/main-nav"
import { GlobalSearch } from "@/components/ui/global-search"
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Toaster } from "@/components/ui/toaster"

interface DashboardLayoutProps {
  children: React.ReactNode
  fullWidth?: boolean
}

export function DashboardLayout({ 
  children,
  fullWidth = false
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container mx-auto px-4">
          <MainNav>
            <GlobalSearch className="ml-auto" />
          </MainNav>
        </div>
      </header>
      
      <PageWrapper fullWidth={fullWidth}>
        {children}
      </PageWrapper>
      
      <Toaster />
    </div>
  )
}
