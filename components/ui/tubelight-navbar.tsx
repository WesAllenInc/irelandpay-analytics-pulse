"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    window.addEventListener("scroll", handleScroll)
    
    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const getActiveItem = () => {
    return items.find(item => pathname.startsWith(item.url)) || items[0]
  }

  const activeItem = getActiveItem()

  return (
    <motion.div
      className={cn(
        "fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className={cn(
          "flex items-center gap-1 bg-background/80 border border-border/50 backdrop-blur-xl py-2 px-2 rounded-2xl shadow-2xl",
          isScrolled && "bg-background/90 border-border/70 shadow-3xl"
        )}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeItem.name === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-300",
                "text-foreground/70 hover:text-foreground hover:bg-muted/50",
                isActive && "text-primary bg-primary/10"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon size={18} strokeWidth={2.5} />
                <span className="hidden md:inline whitespace-nowrap">{item.name}</span>
              </div>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <div className="absolute w-8 h-4 bg-primary/30 rounded-full blur-md -top-1.5 -left-1" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
