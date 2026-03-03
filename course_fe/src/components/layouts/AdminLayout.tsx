import { ReactNode } from 'react'
import { DashboardSidebar } from '../DashboardSidebar'
import { AdminHeader } from '../AdminHeader'

interface AdminLayoutProps {
  children: ReactNode
  showHeader?: boolean
  headerTitle?: string
  headerSubtitle?: string
  showRefresh?: boolean
  onRefresh?: () => void
  isRefreshing?: boolean
}

/**
 * Layout component for admin pages
 * Automatically includes the admin sidebar and header
 */
export function AdminLayout({ 
  children, 
  showHeader = true, 
  headerTitle, 
  headerSubtitle,
  showRefresh,
  onRefresh,
  isRefreshing
}: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar type="admin" />
      
      <main className="flex-1 overflow-y-auto w-full md:w-auto">
        {showHeader && (
          <AdminHeader 
            title={headerTitle} 
            subtitle={headerSubtitle}
            showRefresh={showRefresh}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        )}
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}