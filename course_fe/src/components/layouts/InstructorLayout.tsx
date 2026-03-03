import { ReactNode } from 'react'
import { DashboardSidebar } from '../DashboardSidebar'
import { InstructorHeader } from '../InstructorHeader'

interface InstructorLayoutProps {
  children: ReactNode
  showHeader?: boolean
  headerTitle?: string
  headerSubtitle?: string
}

/**
 * Layout component for instructor pages
 * Automatically includes the instructor sidebar and header
 */
export function InstructorLayout({ children, showHeader = true, headerTitle, headerSubtitle }: InstructorLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar type="instructor" />
      
      <main className="flex-1 overflow-y-auto w-full md:w-auto">
        {showHeader && <InstructorHeader title={headerTitle} subtitle={headerSubtitle} />}
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}