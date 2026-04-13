import { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DashboardSidebar } from '../DashboardSidebar'
import { InstructorHeader } from '../InstructorHeader'
import { useRouter } from '../Router'
import { dashboardContentTransition, dashboardContentVariants, reducedDashboardContentVariants } from '../../lib/motion'

interface InstructorLayoutProps {
  children: ReactNode
  showHeader?: boolean
  headerTitle?: string
  headerSubtitle?: string
}





export function InstructorLayout({ children, showHeader = true, headerTitle, headerSubtitle }: InstructorLayoutProps) {
  const { currentRoute } = useRouter()
  const shouldReduceMotion = useReducedMotion()
  const currentPath = currentRoute.split('?')[0]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar type="instructor" />

      <main className="flex-1 h-screen overflow-y-auto w-full md:w-auto">
        {showHeader && <InstructorHeader title={headerTitle} subtitle={headerSubtitle} />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPath}
            className="min-h-full"
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
