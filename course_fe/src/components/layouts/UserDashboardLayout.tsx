import { ReactNode, useEffect } from 'react'
import { UserDashboardSidebar } from '../UserDashboardSidebar'
import { useUIStore } from '../../stores'
import { useMinWidth } from '../../hooks/useMinWidth'

interface UserDashboardLayoutProps {
  children: ReactNode
}

/**
 * Layout component for user dashboard pages
 * Automatically includes the user dashboard sidebar
 */
export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
  const isDesktopSidebar = useMinWidth(1024)

  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  return (
    <div className="flex min-h-screen bg-background">
      <UserDashboardSidebar />
      
      <main className="w-full flex-1 overflow-y-auto" style={isDesktopSidebar ? { marginLeft: "16rem" } : undefined}>
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
