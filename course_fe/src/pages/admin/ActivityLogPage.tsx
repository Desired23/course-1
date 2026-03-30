import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { TableFilter, FilterConfig } from '../../components/FilterComponents'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import {
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  Settings,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  ShoppingCart,
  CreditCard,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { cleanupActivityLogs, getActivityLogs as getActivityLogsApi } from '../../services/admin.api'
import type { ActivityLog as ApiActivityLog } from '../../services/admin.api'
import { useTranslation } from 'react-i18next'

interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_avatar?: string
  action_type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'download' | 'upload' | 'purchase' | 'payment' | 'review' | 'comment' | 'settings'
  action: string
  description: string
  resource_type?: 'user' | 'course' | 'blog' | 'forum' | 'payment' | 'review' | 'comment' | 'settings'
  resource_id?: string
  ip_address: string
  user_agent: string
  status: 'success' | 'warning' | 'error'
  created_at: Date
  metadata?: Record<string, any>
}

export function ActivityLogPage() {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const data = await getActivityLogsApi()
      const mapped: ActivityLog[] = data.map((log: ApiActivityLog) => {
        const actionLower = (log.action || '').toLowerCase()
        let actionType: ActivityLog['action_type'] = 'view'

        if (actionLower.includes('login')) actionType = 'login'
        else if (actionLower.includes('logout')) actionType = 'logout'
        else if (actionLower.includes('create') || actionLower.includes('tạo')) actionType = 'create'
        else if (actionLower.includes('update') || actionLower.includes('cập nhật')) actionType = 'update'
        else if (actionLower.includes('delete') || actionLower.includes('xóa')) actionType = 'delete'
        else if (actionLower.includes('purchase') || actionLower.includes('mua')) actionType = 'purchase'
        else if (actionLower.includes('payment') || actionLower.includes('thanh toán')) actionType = 'payment'
        else if (actionLower.includes('review') || actionLower.includes('đánh giá')) actionType = 'review'

        return {
          id: String(log.id),
          user_id: String(log.user || ''),
          user_name: log.user_name || t('activity_log_page.unknown_user'),
          user_email: '',
          action_type: actionType,
          action: log.action,
          description: log.description,
          ip_address: log.ip_address || '',
          user_agent: log.user_agent || '',
          status: 'success',
          created_at: new Date(log.created_at),
        }
      })

      setLogs(mapped)
      setFilteredLogs(mapped)
    } catch {
      toast.error(t('activity_log_page.toasts.load_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [t])

  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: t('activity_log_page.filters.search'),
      type: 'search',
      placeholder: t('activity_log_page.filters.search_placeholder'),
    },
    {
      key: 'action_type',
      label: t('activity_log_page.filters.action_type'),
      type: 'select',
      options: [
        { label: t('activity_log_page.filters.login_logout'), value: 'login,logout', count: logs.filter((log) => ['login', 'logout'].includes(log.action_type)).length },
        { label: t('activity_log_page.filters.create'), value: 'create', count: logs.filter((log) => log.action_type === 'create').length },
        { label: t('activity_log_page.filters.update'), value: 'update', count: logs.filter((log) => log.action_type === 'update').length },
        { label: t('activity_log_page.filters.delete'), value: 'delete', count: logs.filter((log) => log.action_type === 'delete').length },
        { label: t('activity_log_page.filters.purchase'), value: 'purchase', count: logs.filter((log) => log.action_type === 'purchase').length },
        { label: t('activity_log_page.filters.payment'), value: 'payment', count: logs.filter((log) => log.action_type === 'payment').length },
        { label: t('activity_log_page.filters.review'), value: 'review', count: logs.filter((log) => log.action_type === 'review').length },
      ],
    },
    {
      key: 'status',
      label: t('activity_log_page.filters.status'),
      type: 'select',
      options: [
        { label: t('activity_log_page.filters.status_success'), value: 'success', count: logs.filter((log) => log.status === 'success').length },
        { label: t('activity_log_page.filters.status_warning'), value: 'warning', count: logs.filter((log) => log.status === 'warning').length },
        { label: t('activity_log_page.filters.status_error'), value: 'error', count: logs.filter((log) => log.status === 'error').length },
      ],
    },
    {
      key: 'resource_type',
      label: t('activity_log_page.filters.resource_type'),
      type: 'select',
      options: [
        { label: t('activity_log_page.filters.resource_user'), value: 'user', count: logs.filter((log) => log.resource_type === 'user').length },
        { label: t('activity_log_page.filters.resource_course'), value: 'course', count: logs.filter((log) => log.resource_type === 'course').length },
        { label: t('activity_log_page.filters.resource_payment'), value: 'payment', count: logs.filter((log) => log.resource_type === 'payment').length },
        { label: t('activity_log_page.filters.resource_review'), value: 'review', count: logs.filter((log) => log.resource_type === 'review').length },
        { label: t('activity_log_page.filters.resource_settings'), value: 'settings', count: logs.filter((log) => log.resource_type === 'settings').length },
      ],
    },
    {
      key: 'date',
      label: t('activity_log_page.filters.date'),
      type: 'daterange',
    },
  ]

  const handleFilter = (filters: any) => {
    let filtered = logs

    if (filters.search) {
      filtered = filtered.filter((log) =>
        log.user_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.user_email.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.description.toLowerCase().includes(filters.search.toLowerCase()),
      )
    }

    if (filters.action_type) {
      const types = filters.action_type.split(',')
      filtered = filtered.filter((log) => types.includes(log.action_type))
    }

    if (filters.status) {
      filtered = filtered.filter((log) => log.status === filters.status)
    }

    if (filters.resource_type) {
      filtered = filtered.filter((log) => log.resource_type === filters.resource_type)
    }

    if (filters.date?.from || filters.date?.to) {
      filtered = filtered.filter((log) => {
        const date = log.created_at
        const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
        const to = filters.date?.to ? new Date(filters.date.to) : new Date()
        return date >= from && date <= to
      })
    }

    setFilteredLogs(filtered)
  }

  const getActionIcon = (actionType: string) => {
    const icons = {
      login: LogIn,
      logout: LogOut,
      create: UserPlus,
      update: Edit,
      delete: Trash2,
      view: Eye,
      download: Download,
      upload: Upload,
      purchase: ShoppingCart,
      payment: CreditCard,
      review: Star,
      comment: MessageSquare,
      settings: Settings,
    }

    const Icon = icons[actionType as keyof typeof icons] || Activity
    return <Icon className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: {
        variant: 'default' as const,
        label: t('activity_log_page.filters.status_success'),
        icon: CheckCircle,
        className: 'bg-green-500/10 text-green-600 border-green-500/20',
      },
      warning: {
        variant: 'outline' as const,
        label: t('activity_log_page.filters.status_warning'),
        icon: AlertTriangle,
        className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      },
      error: {
        variant: 'destructive' as const,
        label: t('activity_log_page.filters.status_error'),
        icon: XCircle,
        className: 'bg-red-500/10 text-red-600 border-red-500/20',
      },
    }

    const config = variants[status as keyof typeof variants] || variants.success
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const exportLogs = () => {
    const csv = [
      [
        'ID',
        t('activity_log_page.table.user'),
        t('activity_log_page.table.action'),
        t('activity_log_page.table.description'),
        t('activity_log_page.table.status'),
        t('activity_log_page.table.ip_address'),
        t('activity_log_page.table.time'),
      ].join(','),
      ...filteredLogs.map((log) => [
        log.id,
        log.user_name,
        log.action,
        log.description,
        log.status,
        log.ip_address,
        log.created_at.toLocaleString(),
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleCleanupLogs = async () => {
    try {
      setIsCleaning(true)
      await cleanupActivityLogs()
      await fetchLogs()
      setConfirmOpen(false)
      toast.success(t('activity_log_page.toasts.cleanup_success'))
    } catch {
      toast.error(t('activity_log_page.toasts.cleanup_failed'))
    } finally {
      setIsCleaning(false)
    }
  }

  if (!hasPermission('admin.logs.view')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('activity_log_page.no_access_title')}</h2>
          <p className="text-muted-foreground">{t('activity_log_page.no_access_description')}</p>
        </div>
      </div>
    )
  }

  const successCount = logs.filter((log) => log.status === 'success').length
  const warningCount = logs.filter((log) => log.status === 'warning').length
  const errorCount = logs.filter((log) => log.status === 'error').length
  const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(0) : '0'

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">{t('activity_log_page.title')}</h1>
          <p className="text-muted-foreground">{t('activity_log_page.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={isCleaning || isLoading}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('activity_log_page.cleanup_logs')}
          </Button>
          <Button onClick={exportLogs} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t('activity_log_page.export_csv')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activity_log_page.stats.total')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{logs.length}</div>
            <p className="text-xs text-muted-foreground">{t('activity_log_page.stats.total_hint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activity_log_page.stats.success')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{successCount}</div>
            <p className="text-xs text-muted-foreground">{t('activity_log_page.stats.success_hint', { value: successRate })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activity_log_page.stats.warning')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{warningCount}</div>
            <p className="text-xs text-muted-foreground">{t('activity_log_page.stats.warning_hint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activity_log_page.stats.error')}</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{errorCount}</div>
            <p className="text-xs text-muted-foreground">{t('activity_log_page.stats.error_hint')}</p>
          </CardContent>
        </Card>
      </div>

      <TableFilter
        title={t('activity_log_page.filters.title')}
        configs={filterConfigs}
        onFilterChange={handleFilter}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('activity_log_page.table.title', { count: filteredLogs.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t('activity_log_page.table.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('activity_log_page.table.user')}</TableHead>
                  <TableHead>{t('activity_log_page.table.action')}</TableHead>
                  <TableHead>{t('activity_log_page.table.description')}</TableHead>
                  <TableHead>{t('activity_log_page.table.ip_address')}</TableHead>
                  <TableHead>{t('activity_log_page.table.status')}</TableHead>
                  <TableHead>{t('activity_log_page.table.time')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={log.user_avatar} />
                          <AvatarFallback>{log.user_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{log.user_name}</p>
                          <p className="text-xs text-muted-foreground">{log.user_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action_type)}
                        <span className="text-sm">{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2">{log.description}</p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{JSON.stringify(log.metadata)}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{log.created_at.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                      {t('activity_log_page.table.empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AdminConfirmDialog
        open={confirmOpen}
        title={t('activity_log_page.confirm.title')}
        description={t('activity_log_page.confirm.description')}
        confirmLabel={t('activity_log_page.confirm.confirm_label')}
        destructive
        loading={isCleaning}
        onOpenChange={setConfirmOpen}
        onConfirm={handleCleanupLogs}
      />
    </div>
  )
}
