import { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DashboardSidebar } from '../DashboardSidebar'
import { AdminHeader } from '../AdminHeader'
import { useRouter } from '../Router'
import { dashboardContentTransition, dashboardContentVariants, reducedDashboardContentVariants } from '../../lib/motion'

export interface AdminLayoutProps {
  children: ReactNode
  showHeader?: boolean
  headerTitle?: string
  headerSubtitle?: string
  showRefresh?: boolean
  onRefresh?: () => void
  isRefreshing?: boolean
}





export function AdminLayout({
  children,
  showHeader = true,
  headerTitle,
  headerSubtitle,
  showRefresh,
  onRefresh,
  isRefreshing
}: AdminLayoutProps) {
  const { currentRoute } = useRouter()
  const shouldReduceMotion = useReducedMotion()
  const currentPath = currentRoute.split('?')[0]

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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPath}
            className="min-h-screen"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={shouldReduceMotion ? reducedDashboardContentVariants : dashboardContentVariants}
            transition={dashboardContentTransition}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
