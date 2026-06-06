import { CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"
import { cn } from "./ui/utils"
import { useState, useEffect } from "react"
import { useRouter } from "./Router"
import { useTranslation } from "react-i18next"
import { getAdminDashboardStats } from '../services/admin.api'
import { getAdminRefunds } from '../services/payment.api'
import { getAdminReports } from '../services/report.api'

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  dueDate?: Date
  actionUrl?: string
  category: string
}

interface PendingTasksProps {
  userRole: 'admin' | 'instructor' | 'user'
  className?: string
}

export function PendingTasks({ userRole, className }: PendingTasksProps) {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent'>('all')
  const [adminTasks, setAdminTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(userRole === 'admin')

  useEffect(() => {
    if (userRole !== 'admin') return
    let cancelled = false

    const fetchAdminTasks = async () => {
      try {
        const [stats, refundsRes, reportsRes] = await Promise.all([
          getAdminDashboardStats(),
          getAdminRefunds({ status: 'pending', page: 1, page_size: 1 }),
          getAdminReports({ page: 1, page_size: 1 }),
        ])
        if (cancelled) return

        const tasks: Task[] = []

        if (stats.pending_courses > 0) {
          tasks.push({
            id: 'pending-courses',
            title: t('pending_tasks.mock.admin.review_pending_courses_title'),
            description: t('pending_tasks.mock.admin.review_pending_courses_description', { count: stats.pending_courses }),
            priority: 'high',
            status: 'pending',
            actionUrl: '/admin/courses',
            category: 'Courses',
          })
        }

        if (refundsRes.count > 0) {
          tasks.push({
            id: 'pending-refunds',
            title: t('pending_tasks.mock.admin.process_refunds_title'),
            description: t('pending_tasks.mock.admin.process_refunds_description', { count: refundsRes.count }),
            priority: 'urgent',
            status: 'pending',
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
            actionUrl: '/admin/refunds',
            category: 'Payments',
          })
        }

        if (reportsRes.count > 0) {
          tasks.push({
            id: 'reported-content',
            title: t('pending_tasks.mock.admin.review_reported_content_title'),
            description: t('pending_tasks.mock.admin.review_reported_content_description', { count: reportsRes.count }),
            priority: 'high',
            status: 'in_progress',
            actionUrl: '/admin/reports',
            category: 'Moderation',
          })
        }

        setAdminTasks(tasks)
      } catch {
        // fail silently — show empty state
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchAdminTasks()
    return () => { cancelled = true }
  }, [userRole, t])

  const tasks = userRole === 'admin' ? adminTasks : []

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status === 'pending'
    if (filter === 'urgent') return task.priority === 'urgent' || task.priority === 'high'
    return true
  })

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Clock },
      medium: { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', icon: Clock },
      high: { color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: AlertCircle },
      urgent: { color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: AlertCircle },
    }
    return configs[priority as keyof typeof configs] || configs.low
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: t('pending_tasks.status.pending'), color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
      in_progress: { label: t('pending_tasks.status.in_progress'), color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
      completed: { label: t('pending_tasks.status.completed'), color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  const formatDueDate = (date: Date) => {
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 24) return t('pending_tasks.time.hours_left', { count: diffHours })
    return t('pending_tasks.time.days_left', { count: diffDays })
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const urgentCount = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-medium mb-1">{t('pending_tasks.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pending • {urgentCount} urgent
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            {t('pending_tasks.filters.all')}
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            {t('pending_tasks.filters.pending')}
          </Button>
          <Button
            variant={filter === 'urgent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('urgent')}
          >
            {t('pending_tasks.filters.urgent')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('common.loading', 'Đang tải...')}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('pending_tasks.empty_title')}</p>
            <p className="text-sm mt-1">{t('pending_tasks.empty_description')}</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityConfig = getPriorityConfig(task.priority)
            const statusConfig = getStatusConfig(task.status)
            const PriorityIcon = priorityConfig.icon

            return (
              <div
                key={task.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => task.actionUrl && navigate(task.actionUrl)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center border",
                    priorityConfig.color
                  )}>
                    <PriorityIcon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm">{task.title}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {task.description}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {task.category}
                      </Badge>
                      <Badge variant="outline" className={cn("capitalize", priorityConfig.color)}>
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          ⏰ {formatDueDate(task.dueDate)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {filteredTasks.length > 0 && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => {
            if (userRole === 'admin') navigate('/admin/reports')
            else if (userRole === 'instructor') navigate('/instructor')
            else navigate('/my-learning')
          }}
        >
          {t('pending_tasks.view_all')}
        </Button>
      )}
    </Card>
  )
}
