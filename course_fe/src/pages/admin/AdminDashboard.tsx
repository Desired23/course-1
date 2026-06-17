import { useEffect, useState } from "react"
import { motion } from 'motion/react'
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "sonner"
import { PendingTasks } from "../../components/PendingTasks"
import { formatCurrency } from "../../utils/formatters"
import { getAdminDashboardStats, type AdminDashboardStats } from '../../services/admin.api'
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip"
import {
  BookOpen,
  DollarSign,
  MessageSquare,
  RefreshCw,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNotificationRefetch } from "../../hooks/useNotificationRefetch"

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

function RevenueTooltip({
  estimated,
  realized,
}: {
  estimated: number
  realized: number
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-6">
        <span>{t('admin_dashboard.estimated_revenue')}</span>
        <span className="font-medium">{formatCurrency(estimated)}</span>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span>{t('admin_dashboard.realized_revenue')}</span>
        <span className="font-medium">{formatCurrency(realized)}</span>
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const { hasRole } = useAuth()
  const { t } = useTranslation()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null)

  const fetchDashboard = async () => {
    try {
      const stats = await getAdminDashboardStats()
      setDashboardStats(stats)
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  useNotificationRefetch(
    ['payment_completed', 'enrollment_created', 'new_enrollment_received', 'course_status_changed_by_admin'],
    () => { fetchDashboard() },
  )

  const handleRefreshStats = async () => {
    setIsRefreshing(true)
    await fetchDashboard()
    setIsRefreshing(false)
    toast.success(t('admin_dashboard.toasts.refresh_success'))
  }

  if (!hasRole('admin')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">{t('admin_dashboard.access_denied')}</h2>
          <p className="text-muted-foreground mb-4">{t('admin_dashboard.access_denied_desc')}</p>
          <Button onClick={() => window.history.back()}>
            {t('admin_dashboard.go_back')}
          </Button>
        </div>
      </div>
    )
  }

  const stats = dashboardStats

  return (
    <motion.div className="p-4 md:p-8" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex items-center justify-end mb-4" variants={fadeInUp}>
        <Button variant="outline" size="sm" onClick={handleRefreshStats} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? t('admin_dashboard.refreshing') : t('admin_dashboard.refresh_dashboard')}
        </Button>
      </motion.div>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6" variants={fadeInUp}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="min-w-0 cursor-help">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-1">
                <CardTitle className="text-xs font-medium">{t('admin_dashboard.today_revenue')}</CardTitle>
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="break-words text-lg font-semibold leading-tight">{formatCurrency(stats?.today_realized_revenue || 0)}</div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            <RevenueTooltip
              estimated={stats?.today_estimated_revenue || 0}
              realized={stats?.today_realized_revenue || 0}
            />
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="min-w-0 cursor-help">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-1">
                <CardTitle className="text-xs font-medium">{t('admin_dashboard.monthly_revenue')}</CardTitle>
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="break-words text-lg font-semibold leading-tight">{formatCurrency(stats?.this_month_realized_revenue || 0)}</div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            <RevenueTooltip
              estimated={stats?.this_month_estimated_revenue || 0}
              realized={stats?.this_month_realized_revenue || 0}
            />
          </TooltipContent>
        </Tooltip>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-1">
            <CardTitle className="text-xs font-medium">{t('admin_dashboard.pending_courses')}</CardTitle>
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-semibold leading-tight">{(stats?.pending_courses || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-1">
            <CardTitle className="text-xs font-medium">{t('admin_dashboard.pending_reviews')}</CardTitle>
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-semibold leading-tight">{(stats?.pending_reviews || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

      </motion.div>

      <motion.div className="mb-8" variants={fadeInUp}>
        <PendingTasks userRole="admin" />
      </motion.div>
    </motion.div>
  )
}
