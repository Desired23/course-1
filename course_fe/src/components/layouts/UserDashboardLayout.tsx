import { ReactNode, useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { UserDashboardSidebar } from '../UserDashboardSidebar'
import { useRouter } from '../Router'
import { dashboardContentTransition, dashboardContentVariants, reducedDashboardContentVariants } from '../../lib/motion'
import { useUIStore } from '../../stores'
import { useMinWidth } from '../../hooks/useMinWidth'

interface UserDashboardLayoutProps {
  children: ReactNode
}





export function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
  const isDesktopSidebar = useMinWidth(1024)
  const { currentRoute } = useRouter()
  const shouldReduceMotion = useReducedMotion()
  const currentPath = currentRoute.split('?')[0]

  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  return (
    <div className="flex min-h-screen bg-background">
      <UserDashboardSidebar />

      <main className="w-full flex-1 overflow-y-auto" style={isDesktopSidebar ? { marginLeft: "16rem" } : undefined}>
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
