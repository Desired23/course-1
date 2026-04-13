import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, BookOpen, CheckCircle, Eye, Flag, MessageSquare, MoreVertical, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { TableFilter, type FilterConfig } from '../../components/FilterComponents'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Textarea } from '../../components/ui/textarea'
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  type AdminReport,
  type AdminReportAction,
  type AdminReportPriority,
  getAdminReports,
  resolveAdminReport,
} from '../../services/report.api'

type UiReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

interface ReportItem extends Omit<AdminReport, 'created_at' | 'updated_at'> {
  status: UiReportStatus
  created_at: Date
  updated_at: Date
  resolved_at?: Date
}

const toUiStatus = (report: AdminReport): UiReportStatus => {
  if (report.status === 'pending') return 'pending'
  return 'pending'
}

const toDate = (value: string | null) => value ? new Date(value) : new Date()

const getPriorityFromCount = (count: number): AdminReportPriority => {
  if (count >= 5) return 'critical'
  if (count >= 3) return 'high'
  if (count >= 2) return 'medium'
  return 'low'
}

const mapReport = (report: AdminReport): ReportItem => ({
  ...report,
  priority: report.priority || getPriorityFromCount(report.report_count),
  status: toUiStatus(report),
  created_at: toDate(report.created_at),
  updated_at: toDate(report.updated_at),
})

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

export function ReportManagementPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewing' | 'critical'>('all')
  const [reports, setReports] = useState<ReportItem[]>([])
  const [filteredReports, setFilteredReports] = useState<ReportItem[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null)
  const [resolutionText, setResolutionText] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([])
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: '',
    destructive: false,
    loading: false,
    action: null,
  })

  const getResolveActions = (report: ReportItem): Array<{ label: string; action: AdminReportAction }> => {
    if (report.reported_type === 'forum_post') {
      return [
        { label: t('admin_reports.resolve_actions.approve_forum'), action: 'approve' },
        { label: t('admin_reports.resolve_actions.lock_topic'), action: 'lock' },
        { label: t('admin_reports.resolve_actions.delete_topic'), action: 'delete' },
      ]
    }
    if (report.reported_type === 'qa_question') {
      return [
        { label: t('admin_reports.resolve_actions.approve_qa'), action: 'approve' },
        { label: t('admin_reports.resolve_actions.close_qa'), action: 'close' },
        { label: t('admin_reports.resolve_actions.delete_qa'), action: 'delete' },
      ]
    }
    if (report.reported_type === 'message') {
      return [
        { label: t('admin_reports.resolve_actions.approve_message'), action: 'approve' },
        { label: t('admin_reports.resolve_actions.revoke_message'), action: 'revoke' },
        { label: t('admin_reports.resolve_actions.delete_message'), action: 'delete' },
      ]
    }
    return [
      { label: t('admin_reports.resolve_actions.approve_review'), action: 'approve' },
      { label: t('admin_reports.resolve_actions.hide_review'), action: 'hide' },
      { label: t('admin_reports.resolve_actions.delete_review'), action: 'delete' },
    ]
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const all: AdminReport[] = []
        let page = 1
        while (true) {
          const response = await getAdminReports({ page, page_size: 100 })
          all.push(...response.results)
          if (!response.next) break
          page += 1
        }
        const mapped = all.map(mapReport)
        setReports(mapped)
        setFilteredReports(mapped)
      } catch {
        toast.error(t('admin_reports.toasts.load_failed'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'search',
      label: t('admin_reports.filters.search'),
      type: 'search',
      placeholder: t('admin_reports.filters.search_placeholder'),
    },
    {
      key: 'status',
      label: t('admin_reports.filters.status'),
      type: 'select',
      options: [
        { label: t('admin_reports.status.pending'), value: 'pending', count: reports.filter(r => r.status === 'pending').length },
        { label: t('admin_reports.status.reviewing'), value: 'reviewing', count: reports.filter(r => r.status === 'reviewing').length },
        { label: t('admin_reports.status.resolved'), value: 'resolved', count: reports.filter(r => r.status === 'resolved').length },
        { label: t('admin_reports.status.dismissed'), value: 'dismissed', count: reports.filter(r => r.status === 'dismissed').length },
      ],
    },
    {
      key: 'type',
      label: t('admin_reports.filters.type'),
      type: 'select',
      options: [
        { label: t('admin_reports.types.forum_post'), value: 'forum_post', count: reports.filter(r => r.reported_type === 'forum_post').length },
        { label: t('admin_reports.types.review'), value: 'review', count: reports.filter(r => r.reported_type === 'review').length },
        { label: t('admin_reports.types.qa_question'), value: 'qa_question', count: reports.filter(r => r.reported_type === 'qa_question').length },
        { label: t('admin_reports.types.message'), value: 'message', count: reports.filter(r => r.reported_type === 'message').length },
      ],
    },
    {
      key: 'priority',
      label: t('admin_reports.filters.priority'),
      type: 'select',
      options: [
        { label: t('admin_reports.priorities.critical'), value: 'critical', count: reports.filter(r => r.priority === 'critical').length },
        { label: t('admin_reports.priorities.high'), value: 'high', count: reports.filter(r => r.priority === 'high').length },
        { label: t('admin_reports.priorities.medium'), value: 'medium', count: reports.filter(r => r.priority === 'medium').length },
        { label: t('admin_reports.priorities.low'), value: 'low', count: reports.filter(r => r.priority === 'low').length },
      ],
    },
    {
      key: 'date',
      label: t('admin_reports.filters.report_date'),
      type: 'daterange',
    },
  ], [reports])

  const handleFilter = (filters: any) => {
    let next = reports

    if (filters.search) {
      const query = filters.search.toLowerCase()
      next = next.filter(report =>
        (report.reported_user_name || '').toLowerCase().includes(query) ||
        (report.reported_content_title || '').toLowerCase().includes(query) ||
        (report.reason || '').toLowerCase().includes(query) ||
        (report.description || '').toLowerCase().includes(query)
      )
    }

    if (filters.status) {
      next = next.filter(report => report.status === filters.status)
    }

    if (filters.type) {
      next = next.filter(report => report.reported_type === filters.type)
    }

    if (filters.priority) {
      next = next.filter(report => report.priority === filters.priority)
    }

    if (filters.date?.from || filters.date?.to) {
      const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
      const to = filters.date?.to ? new Date(filters.date.to) : new Date()
      next = next.filter(report => report.created_at >= from && report.created_at <= to)
    }

    setFilteredReports(next)
  }

  const syncReport = (reportId: string, updater: (report: ReportItem) => ReportItem | null) => {
    setReports(prev => prev.map(item => item.id === reportId ? updater(item) : item).filter(Boolean) as ReportItem[])
    setFilteredReports(prev => prev.map(item => item.id === reportId ? updater(item) : item).filter(Boolean) as ReportItem[])
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: '',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleStatusChange = async (
    report: ReportItem,
    nextStatus: UiReportStatus,
    action?: AdminReportAction
  ) => {
    if (nextStatus === 'reviewing') {
      syncReport(report.id, item => ({ ...item, status: 'reviewing', updated_at: new Date() }))
      return
    }

    try {
      if (nextStatus === 'dismissed') {
        await resolveAdminReport(report.reported_type, report.reported_id, {
          action: 'dismiss',
          reason: resolutionText || report.reason || t('admin_reports.system_notes.dismissed_by_admin'),
          resolution_notes: resolutionText,
        })
        syncReport(report.id, item => ({
          ...item,
          status: 'dismissed',
          resolution: resolutionText || t('admin_reports.system_notes.dismissed_by_admin'),
          action_taken: 'dismiss',
          resolved_at: new Date(),
          updated_at: new Date(),
        }))
        return
      }

      if (nextStatus === 'resolved' && action) {
        await resolveAdminReport(report.reported_type, report.reported_id, {
          action,
          reason: resolutionText || report.reason || t('admin_reports.system_notes.resolved_by_admin'),
          resolution_notes: resolutionText,
        })
        syncReport(report.id, item => ({
          ...item,
          status: 'resolved',
          resolution: resolutionText || t('admin_reports.system_notes.resolved_with_action', { action }),
          action_taken: action,
          resolved_at: new Date(),
          updated_at: new Date(),
        }))
      }
    } catch {
      toast.error(t('admin_reports.toasts.resolve_failed'))
    }
  }

  const handleDeleteReport = async (report: ReportItem) => {
    try {
      await resolveAdminReport(report.reported_type, report.reported_id, {
        action: 'delete',
        reason: t('admin_reports.system_notes.deleted_from_management'),
      })
      syncReport(report.id, () => null)
    } catch {
      toast.error(t('admin_reports.toasts.delete_content_failed'))
    }
  }

  const getStatusBadge = (status: UiReportStatus) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: t('admin_reports.status.pending'), icon: Flag },
      reviewing: { variant: 'default' as const, label: t('admin_reports.status.reviewing'), icon: Eye },
      resolved: { variant: 'default' as const, label: t('admin_reports.status.resolved'), icon: CheckCircle },
      dismissed: { variant: 'outline' as const, label: t('admin_reports.status.dismissed'), icon: XCircle },
    }
    const config = variants[status]
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: AdminReportPriority) => {
    const variants = {
      low: 'border-blue-500 text-blue-600',
      medium: 'border-yellow-500 text-yellow-600',
      high: 'border-orange-500 text-orange-600',
      critical: 'border-red-500 text-red-600',
    }
    return <Badge variant="outline" className={variants[priority]}>{t(`admin_reports.priorities.${priority}`)}</Badge>
  }

  const getTypeBadge = (type: ReportItem['reported_type']) => {
    const icons = {
      forum_post: MessageSquare,
      review: BookOpen,
      qa_question: MessageSquare,
      message: MessageSquare,
    }
    const labels = {
      forum_post: t('admin_reports.types.forum_post'),
      review: t('admin_reports.types.review'),
      qa_question: t('admin_reports.system_notes.qa_question'),
      message: t('admin_reports.types.message'),
    }
    const Icon = icons[type]
    return (
      <Badge variant="secondary" className="gap-1">
        <Icon className="h-3 w-3" />
        {labels[type]}
      </Badge>
    )
  }

  const toggleReportSelection = (reportId: string, checked: boolean) => {
    setSelectedReportIds(prev => checked ? [...prev, reportId] : prev.filter(id => id !== reportId))
  }

  const toggleAllFilteredReports = (checked: boolean) => {
    setSelectedReportIds(checked ? filteredReports.map(report => report.id) : [])
  }

  const bulkUpdateReports = async (
    ids: string[],
    updater: (report: ReportItem) => Promise<void>,
    successMessage: string
  ) => {
    try {
      for (const id of ids) {
        const report = reports.find(item => item.id === id)
        if (report) {
          await updater(report)
        }
      }
      setSelectedReportIds([])
      toast.success(successMessage)
    } catch {
      toast.error(t('admin_reports.toasts.bulk_failed'))
    }
  }

  if (!hasPermission('admin.reports.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('admin_reports.permission_denied_title')}</h2>
          <p className="text-muted-foreground">{t('admin_reports.permission_denied_description')}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="p-6 space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl mb-2">{t('admin_reports.title')}</h1>
          <p className="text-muted-foreground">{t('admin_reports.subtitle')}</p>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={fadeInUp}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reports.cards.total_reports')}</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.length}</div>
            <p className="text-xs text-muted-foreground">{t('admin_reports.cards.total_reports_hint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reports.cards.pending')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">{t('admin_reports.cards.pending_hint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reports.cards.high_critical')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.priority === 'high' || r.priority === 'critical').length}</div>
            <p className="text-xs text-muted-foreground">{t('admin_reports.cards.high_critical_hint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin_reports.cards.resolved')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.status === 'resolved').length}</div>
            <p className="text-xs text-muted-foreground">{t('admin_reports.cards.resolved_hint')}</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'pending' | 'reviewing' | 'critical')} className="space-y-6">
        <TabsList className="relative p-1">
          <TabsTrigger value="all" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'all' && <motion.span layoutId="report-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_reports.tabs.all', { count: reports.length })}</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'pending' && <motion.span layoutId="report-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_reports.tabs.pending', { count: reports.filter(r => r.status === 'pending').length })}</span>
          </TabsTrigger>
          <TabsTrigger value="reviewing" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'reviewing' && <motion.span layoutId="report-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_reports.tabs.reviewing', { count: reports.filter(r => r.status === 'reviewing').length })}</span>
          </TabsTrigger>
          <TabsTrigger value="critical" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'critical' && <motion.span layoutId="report-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_reports.tabs.critical', { count: reports.filter(r => r.priority === 'critical').length })}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <TableFilter title={t('admin_reports.filter_title')} configs={filterConfigs} onFilterChange={handleFilter} />

          <AdminBulkActionBar
            count={selectedReportIds.length}
            label={t('admin_reports.bulk.selected_label')}
            onClear={() => setSelectedReportIds([])}
            actions={[
              {
                key: 'review',
                label: t('admin_reports.bulk.mark_reviewing'),
                onClick: () => openConfirm(
                  t('admin_reports.bulk.mark_reviewing_title'),
                  t('admin_reports.bulk.mark_reviewing_description', { count: selectedReportIds.length }),
                  t('admin_reports.bulk.mark_reviewing'),
                  () => bulkUpdateReports(selectedReportIds, (report) => handleStatusChange(report, 'reviewing'), t('admin_reports.toasts.bulk_reviewing_success')),
                ),
              },
              {
                key: 'dismiss',
                label: t('admin_reports.bulk.dismiss'),
                destructive: true,
                onClick: () => openConfirm(
                  t('admin_reports.bulk.dismiss_title'),
                  t('admin_reports.bulk.dismiss_description', { count: selectedReportIds.length }),
                  t('admin_reports.bulk.dismiss'),
                  () => bulkUpdateReports(selectedReportIds, (report) => handleStatusChange(report, 'dismissed'), t('admin_reports.toasts.bulk_dismiss_success')),
                  true,
                ),
              },
              {
                key: 'delete',
                label: t('admin_reports.bulk.delete_content'),
                destructive: true,
                onClick: () => openConfirm(
                  t('admin_reports.bulk.delete_content_title'),
                  t('admin_reports.bulk.delete_content_description', { count: selectedReportIds.length }),
                  t('admin_reports.bulk.delete_content'),
                  () => bulkUpdateReports(selectedReportIds, handleDeleteReport, t('admin_reports.toasts.bulk_delete_success')),
                  true,
                ),
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('admin_reports.list_title', { count: filteredReports.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{t('admin_reports.loading')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[48px]">
                        <Checkbox
                          checked={filteredReports.length > 0 && selectedReportIds.length === filteredReports.length}
                          onCheckedChange={(checked) => toggleAllFilteredReports(Boolean(checked))}
                        />
                      </TableHead>
                      <TableHead>{t('admin_reports.table.reported_user')}</TableHead>
                      <TableHead>{t('admin_reports.table.type')}</TableHead>
                      <TableHead>{t('admin_reports.table.content')}</TableHead>
                      <TableHead>{t('admin_reports.table.reason')}</TableHead>
                      <TableHead>{t('admin_reports.table.priority')}</TableHead>
                      <TableHead>{t('admin_reports.table.status')}</TableHead>
                      <TableHead>{t('admin_reports.table.date')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReportIds.includes(report.id)}
                            onCheckedChange={(checked) => toggleReportSelection(report.id, Boolean(checked))}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{report.reported_user_name || t('admin_reports.unknown_user')}</p>
                            <p className="text-xs text-muted-foreground">{t('admin_reports.report_count', { count: report.report_count })}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(report.reported_type)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{report.reported_content_title || t('admin_reports.no_title')}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{report.description || t('admin_reports.no_description')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{report.reason || t('admin_reports.unknown_reason')}</TableCell>
                        <TableCell>{getPriorityBadge(report.priority)}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-sm">{report.created_at.toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('admin_reports.actions.view_details')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {report.status === 'pending' && (
                                <DropdownMenuItem onClick={() => openConfirm(
                                  t('admin_reports.actions.start_reviewing_title'),
                                  t('admin_reports.actions.start_reviewing_description', { id: report.id }),
                                  t('admin_reports.actions.start_reviewing'),
                                  () => handleStatusChange(report, 'reviewing'),
                                )}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('admin_reports.actions.start_reviewing')}
                                </DropdownMenuItem>
                              )}
                              {(report.status === 'pending' || report.status === 'reviewing') && (
                                <>
                                  <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {t('admin_reports.actions.resolve')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openConfirm(
                                    t('admin_reports.actions.dismiss_title'),
                                    t('admin_reports.actions.dismiss_description', { id: report.id }),
                                    t('admin_reports.bulk.dismiss'),
                                    () => handleStatusChange(report, 'dismissed'),
                                    true,
                                  )}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('admin_reports.actions.dismiss')}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem className="text-red-600" onClick={() => openConfirm(
                                t('admin_reports.actions.delete_content_title'),
                                t('admin_reports.actions.delete_content_description', { id: report.id }),
                                t('admin_reports.bulk.delete_content'),
                                () => handleDeleteReport(report),
                                true,
                              )}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('admin_reports.actions.delete_content')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(['pending', 'reviewing', 'critical'] as const).map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {tab === 'pending' ? t('admin_reports.section_titles.pending') : tab === 'reviewing' ? t('admin_reports.section_titles.reviewing') : t('admin_reports.section_titles.critical')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports
                    .filter(report => tab === 'critical' ? report.priority === 'critical' : report.status === tab)
                    .map(report => (
                      <div key={report.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(report.priority)}
                              {getTypeBadge(report.reported_type)}
                              {getStatusBadge(report.status)}
                            </div>
                            <p className="font-medium">{report.reported_content_title || t('admin_reports.no_title')}</p>
                            <p className="text-sm text-muted-foreground">{t('admin_reports.author_label', { name: report.reported_user_name || t('admin_reports.unknown_user') })}</p>
                            <p className="text-sm">{t('admin_reports.reason_label', { reason: report.reason || t('admin_reports.unknown_reason') })}</p>
                            <p className="text-sm text-muted-foreground">{report.description || t('admin_reports.no_detailed_description')}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" onClick={() => setSelectedReport(report)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('admin_reports.actions.details')}
                            </Button>
                            {report.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => openConfirm(
                                t('admin_reports.actions.start_reviewing_title'),
                                t('admin_reports.actions.start_reviewing_description', { id: report.id }),
                                t('admin_reports.actions.start_reviewing'),
                                () => handleStatusChange(report, 'reviewing'),
                              )}>
                                {t('admin_reports.actions.start_reviewing')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      </motion.div>

      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => {
          setSelectedReport(null)
          setResolutionText('')
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('admin_reports.detail.title')}</DialogTitle>
              <DialogDescription>{selectedReport.id}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                {getStatusBadge(selectedReport.status)}
                {getPriorityBadge(selectedReport.priority)}
                {getTypeBadge(selectedReport.reported_type)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin_reports.detail.reported_user')}</p>
                  <p className="text-sm">{selectedReport.reported_user_name || t('admin_reports.unknown_user')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">{t('admin_reports.detail.report_date')}</p>
                  <p className="text-sm">{selectedReport.created_at.toLocaleString('vi-VN')}</p>
                </div>
              </div>

              {selectedReport.reported_type === 'forum_post' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.topic')}</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.post_content')}</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || t('admin_reports.no_content')}</p>
                  </div>
                </div>
              ) : selectedReport.reported_type === 'qa_question' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.course_or_qa')}</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.question')}</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || t('admin_reports.no_content')}</p>
                  </div>
                </div>
              ) : selectedReport.reported_type === 'message' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.conversation')}</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.message')}</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || t('admin_reports.no_content')}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.course')}</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t('admin_reports.detail.review_content')}</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || t('admin_reports.no_content')}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">{t('admin_reports.detail.latest_reason')}</p>
                <Badge variant="outline">{selectedReport.reason || t('admin_reports.unknown_reason')}</Badge>
              </div>

              {selectedReport.resolution && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium mb-1 text-green-600">{t('admin_reports.detail.resolution_result')}</p>
                  <p className="text-sm">{selectedReport.resolution}</p>
                </div>
              )}

              {(selectedReport.status === 'pending' || selectedReport.status === 'reviewing') && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium mb-2">{t('admin_reports.detail.resolution_notes')}</p>
                    <Textarea
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder={t('admin_reports.detail.resolution_placeholder')}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {getResolveActions(selectedReport).map(option => (
                      <Button
                        key={option.action}
                        variant={option.action === 'delete' ? 'destructive' : 'outline'}
                        onClick={() => {
                          void handleStatusChange(selectedReport, 'resolved', option.action)
                          setSelectedReport(null)
                          setResolutionText('')
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        void handleStatusChange(selectedReport, 'resolved', 'approve')
                        setSelectedReport(null)
                        setResolutionText('')
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('admin_reports.actions.mark_resolved')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        void handleStatusChange(selectedReport, 'dismissed')
                        setSelectedReport(null)
                        setResolutionText('')
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('admin_reports.actions.dismiss')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </motion.div>
  )
}
