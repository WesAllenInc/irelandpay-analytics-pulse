import { Home, Users, BarChart3, Upload, Settings } from 'lucide-react'
import { NavBar } from "@/components/ui/tubelight-navbar"

export function NavBarDemo() {
  // Using the same navigation items as in the top-navigation.tsx but with icons
  const navItems = [
    { name: 'Dashboard', url: '/dashboard', icon: Home },
    { name: 'Merchants', url: '/dashboard/merchants', icon: Users },
    { name: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Upload', url: '/dashboard/upload', icon: Upload },
    { name: 'Settings', url: '/dashboard/settings', icon: Settings }
  ]

  return <NavBar items={navItems} />
}
