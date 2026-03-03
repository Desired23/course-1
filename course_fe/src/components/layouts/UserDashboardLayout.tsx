import { ReactNode } from 'react'
import { UserDashboardSidebar } from '../UserDashboardSidebar'

interface UserDashboardLayoutProps {
  children: ReactNode
}

/**
 * Layout component for user dashboard pages
 * Automatically includes the user dashboard sidebar
 */
export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
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
