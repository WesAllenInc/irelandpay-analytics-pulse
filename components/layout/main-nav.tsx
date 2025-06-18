"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  BarChart2,
  Upload,
  Users,
  Settings,
  Menu,
  X,
  Home,
  LogOut,
  User
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MainNavProps {
  className?: string
  children?: React.ReactNode
}

export function MainNav({ className, children }: MainNavProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  
  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/merchants",
      label: "Merchants",
      icon: Users,
      active: pathname?.includes("/dashboard/merchants"),
    },
    {
      href: "/dashboard/metrics",
      label: "Metrics",
      icon: BarChart2,
      active: pathname?.includes("/dashboard/metrics"),
    },
    {
      href: "/dashboard/upload",
      label: "Upload",
      icon: Upload,
      active: pathname?.includes("/dashboard/upload"),
    },
    {
      href: "/upload-residuals",
      label: "Residuals",
      icon: Upload,
      active: pathname === "/upload-residuals",
    },
    {
      href: "/upload-merchants",
      label: "Merchants Data",
      icon: Upload,
      active: pathname === "/upload-merchants",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      active: pathname?.includes("/dashboard/settings"),
    },
  ]

  return (
    <nav className={cn("flex items-center justify-between py-4", className)}>
      <div className="flex items-center gap-6 lg:gap-10">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="relative h-8 w-28 md:h-10 md:w-36">
            <Image 
              src="/kairos-logo.png" 
              alt="Kairos Logo" 
              fill 
              style={{ objectFit: 'contain' }} 
              priority 
            />
          </div>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-md">Analytics</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center text-sm font-medium transition-colors hover:text-primary",
                route.active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <route.icon className="w-4 h-4 mr-2" />
              {route.label}
            </Link>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {children}
        {/* User dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/user.png" alt="User" />
                <AvatarFallback>IP</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Mobile menu button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[240px] sm:w-[300px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className="relative h-6 w-20">
                  <Image 
                    src="/kairos-logo.png" 
                    alt="Kairos Logo" 
                    fill 
                    style={{ objectFit: 'contain' }} 
                    priority 
                  />
                </div>
                <span>Analytics</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-6">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center py-2 text-base font-medium transition-colors hover:text-primary",
                    route.active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <route.icon className="w-5 h-5 mr-3" />
                  {route.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
