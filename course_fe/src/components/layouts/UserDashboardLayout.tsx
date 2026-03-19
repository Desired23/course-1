import { ReactNode, useEffect } from 'react'
import { UserDashboardSidebar } from '../UserDashboardSidebar'
import { useUIStore } from '../../stores'

interface UserDashboardLayoutProps {
  children: ReactNode
}

/**
 * Layout component for user dashboard pages
 * Automatically includes the user dashboard sidebar
 */
export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)

  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  return (
    <div className="flex min-h-screen bg-background">
      <UserDashboardSidebar />
      
      <main className="flex-1 overflow-y-auto w-full md:w-auto md:ml-16">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
