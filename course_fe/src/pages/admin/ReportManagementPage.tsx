import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import { TableFilter, FilterConfig } from '../../components/FilterComponents'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { 
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  User,
  BookOpen,
  MoreVertical,
  Ban,
  Trash2,
  Mail
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { toast } from 'sonner'
import { getSupportTickets } from '../../services/support.api'
import { useTranslation } from 'react-i18next'

interface Report {
  id: string
  reporter_id: string
  reporter_name: string
  reporter_email: string
  reported_type: 'user' | 'course' | 'review' | 'forum_post' | 'qa_answer' | 'message'
  reported_id: string
  reported_user_name?: string
  reported_content_title?: string
  reason: string
  reason_category: 'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'misinformation' | 'other'
  description: string
  evidence_urls?: string[]
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_to?: string
  created_at: Date
  updated_at: Date
  resolved_at?: Date
  resolution?: string
  action_taken?: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned'
}



export function ReportManagementPage() {
  const { user, hasPermission } = useAuth()
  const { t } = useTranslation()
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [resolutionText, setResolutionText] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const tickets = await getSupportTickets({ page: 1, page_size: 200 })
        const mapped: Report[] = (tickets.results || []).map(t => ({
          id: String(t.id),
          reporter_id: String(t.user || 0),
          reporter_name: t.name || 'Unknown',
          reporter_email: t.email,
          reported_type: 'other' as any,
          reported_id: String(t.id),
          reason: t.subject,
          reason_category: 'other' as any,
          description: t.message,
          status: t.status === 'open' ? 'pending' as const : t.status === 'in_progress' ? 'reviewing' as const : t.status === 'resolved' ? 'resolved' as const : 'dismissed' as const,
          priority: t.priority,
          created_at: new Date(t.created_at),
          updated_at: new Date(t.updated_at)
        }))
        setReports(mapped)
        setFilteredReports(mapped)
      } catch {
        toast.error(t('report_management.load_failed'))
      }
    }
    load()
  }, [])

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: t('report_management.filters.search'),
      type: 'search',
      placeholder: t('report_management.filters.search_placeholder')
    },
    {
      key: 'status',
      label: t('report_management.filters.status'),
      type: 'select',
      options: [
        { label: t('report_management.status.pending'), value: 'pending', count: reports.filter(r => r.status === 'pending').length },
        { label: t('report_management.status.reviewing'), value: 'reviewing', count: reports.filter(r => r.status === 'reviewing').length },
        { label: t('report_management.status.resolved'), value: 'resolved', count: reports.filter(r => r.status === 'resolved').length },
        { label: t('report_management.status.dismissed'), value: 'dismissed', count: reports.filter(r => r.status === 'dismissed').length }
      ]
    },
    {
      key: 'type',
      label: t('report_management.filters.type'),
      type: 'select',
      options: [
        { label: t('report_management.types.user'), value: 'user', count: reports.filter(r => r.reported_type === 'user').length },
        { label: t('report_management.types.course'), value: 'course', count: reports.filter(r => r.reported_type === 'course').length },
        { label: t('report_management.types.review'), value: 'review', count: reports.filter(r => r.reported_type === 'review').length },
        { label: t('report_management.types.forum_post'), value: 'forum_post', count: reports.filter(r => r.reported_type === 'forum_post').length },
        { label: t('report_management.types.qa_answer'), value: 'qa_answer', count: reports.filter(r => r.reported_type === 'qa_answer').length }
      ]
    },
    {
      key: 'priority',
      label: t('report_management.filters.priority'),
      type: 'select',
      options: [
        { label: t('report_management.priority.critical'), value: 'critical', count: reports.filter(r => r.priority === 'critical').length },
        { label: t('report_management.priority.high'), value: 'high', count: reports.filter(r => r.priority === 'high').length },
        { label: t('report_management.priority.medium'), value: 'medium', count: reports.filter(r => r.priority === 'medium').length },
        { label: t('report_management.priority.low'), value: 'low', count: reports.filter(r => r.priority === 'low').length }
      ]
    },
    {
      key: 'date',
      label: t('report_management.filters.date'),
      type: 'daterange'
    }
  ]

  const handleFilter = (filters: any) => {
    let filtered = reports

    if (filters.search) {
      filtered = filtered.filter(report => 
        report.reporter_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.reporter_email.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.reported_user_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.description.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.status) {
      filtered = filtered.filter(report => report.status === filters.status)
    }

    if (filters.type) {
      filtered = filtered.filter(report => report.reported_type === filters.type)
    }

    if (filters.priority) {
      filtered = filtered.filter(report => report.priority === filters.priority)
    }

    if (filters.date?.from || filters.date?.to) {
      filtered = filtered.filter(report => {
        const date = report.created_at
        const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
        const to = filters.date?.to ? new Date(filters.date.to) : new Date()
        return date >= from && date <= to
      })
    }

    setFilteredReports(filtered)
  }

  const handleStatusChange = (reportId: string, newStatus: 'reviewing' | 'resolved' | 'dismissed', action?: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned') => {
    setReports(prev => prev.map(report => 
      report.id === reportId 
        ? { 
            ...report, 
            status: newStatus,
            resolved_at: newStatus === 'resolved' || newStatus === 'dismissed' ? new Date() : undefined,
            resolution: resolutionText || undefined,
            action_taken: action,
            assigned_to: user?.id
          }
        : report
    ))
    setFilteredReports(prev => prev.map(report => 
      report.id === reportId 
        ? { 
            ...report, 
            status: newStatus,
            resolved_at: newStatus === 'resolved' || newStatus === 'dismissed' ? new Date() : undefined,
            resolution: resolutionText || undefined,
            action_taken: action,
            assigned_to: user?.id
          }
        : report
    ))
  }

  const handleDeleteReport = (reportId: string) => {
    setReports(prev => prev.filter(report => report.id !== reportId))
    setFilteredReports(prev => prev.filter(report => report.id !== reportId))
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: t('report_management.status.pending'), icon: Flag },
      reviewing: { variant: 'default' as const, label: t('report_management.status.reviewing'), icon: Eye },
      resolved: { variant: 'default' as const, label: t('report_management.status.resolved'), icon: CheckCircle },
      dismissed: { variant: 'outline' as const, label: t('report_management.status.dismissed'), icon: XCircle }
    }
    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: { variant: 'outline' as const, label: t('report_management.priority.low'), className: 'border-blue-500 text-blue-600' },
      medium: { variant: 'outline' as const, label: t('report_management.priority.medium'), className: 'border-yellow-500 text-yellow-600' },
      high: { variant: 'outline' as const, label: t('report_management.priority.high'), className: 'border-orange-500 text-orange-600' },
      critical: { variant: 'outline' as const, label: t('report_management.priority.critical'), className: 'border-red-500 text-red-600' }
    }
    const config = variants[priority as keyof typeof variants] || variants.low
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const icons = {
      user: User,
      course: BookOpen,
      review: MessageSquare,
      forum_post: MessageSquare,
      qa_answer: MessageSquare,
      message: Mail
    }
    const labels = {
      user: t('report_management.types.user'),
      course: t('report_management.types.course'),
      review: t('report_management.types.review'),
      forum_post: t('report_management.types.forum_post'),
      qa_answer: t('report_management.types.qa_answer'),
      message: t('report_management.types.message')
    }
    const Icon = icons[type as keyof typeof icons] || MessageSquare
    const label = labels[type as keyof typeof labels] || type

    return (
      <Badge variant="secondary" className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const getActionBadge = (action?: string) => {
    if (!action || action === 'none') return null

    const variants = {
      warning: { label: t('report_management.actions.warning'), className: 'bg-yellow-500/10 text-yellow-600' },
      content_removed: { label: t('report_management.actions.content_removed'), className: 'bg-orange-500/10 text-orange-600' },
      user_suspended: { label: t('report_management.actions.user_suspended'), className: 'bg-red-500/10 text-red-600' },
      user_banned: { label: t('report_management.actions.user_banned'), className: 'bg-red-500/10 text-red-600' }
    }
    const config = variants[action as keyof typeof variants]
    if (!config) return null

    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (!hasPermission('admin.reports.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('report_management.access_denied_title')}</h2>
          <p className="text-muted-foreground">{t('report_management.access_denied_description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">{t('report_management.title')}</h1>
          <p className="text-muted-foreground">{t('report_management.subtitle')}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('report_management.stats.total')}</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('report_management.stats.total_hint')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('report_management.stats.pending')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">
              {t('report_management.stats.pending_hint')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('report_management.stats.critical')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.priority === 'critical' || r.priority === 'high').length}</div>
            <p className="text-xs text-muted-foreground">
              {t('report_management.stats.critical_hint')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('report_management.stats.resolved')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.status === 'resolved').length}</div>
            <p className="text-xs text-muted-foreground">
              {t('report_management.stats.resolved_hint')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">{t('report_management.tabs.all', { count: reports.length })}</TabsTrigger>
          <TabsTrigger value="pending">{t('report_management.tabs.pending', { count: reports.filter(r => r.status === 'pending').length })}</TabsTrigger>
          <TabsTrigger value="reviewing">{t('report_management.tabs.reviewing', { count: reports.filter(r => r.status === 'reviewing').length })}</TabsTrigger>
          <TabsTrigger value="critical">{t('report_management.tabs.critical', { count: reports.filter(r => r.priority === 'critical').length })}</TabsTrigger>
        </TabsList>

        {/* All Reports Tab */}
        <TabsContent value="all" className="space-y-6">
          <TableFilter
            title={t('report_management.filter_title')}
            configs={filterConfigs}
            onFilterChange={handleFilter}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('report_management.list_title', { count: filteredReports.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('report_management.table.reporter')}</TableHead>
                    <TableHead>{t('report_management.table.type')}</TableHead>
                    <TableHead>{t('report_management.table.target')}</TableHead>
                    <TableHead>{t('report_management.table.reason')}</TableHead>
                    <TableHead>{t('report_management.table.priority')}</TableHead>
                    <TableHead>{t('report_management.table.status')}</TableHead>
                    <TableHead>{t('report_management.table.date')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{report.reporter_name}</p>
                          <p className="text-xs text-muted-foreground">{report.reporter_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(report.reported_type)}</TableCell>
                      <TableCell>
                        <div>
                          {report.reported_user_name && (
                            <p className="font-medium text-sm">{report.reported_user_name}</p>
                          )}
                          {report.reported_content_title && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{report.reported_content_title}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{report.reason}</p>
                      </TableCell>
                      <TableCell>{getPriorityBadge(report.priority)}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-sm">{report.created_at.toLocaleDateString()}</TableCell>
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
                              {t('report_management.view_details')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {report.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(report.id, 'reviewing')}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('report_management.start_review')}
                              </DropdownMenuItem>
                            )}
                            {(report.status === 'pending' || report.status === 'reviewing') && (
                              <>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedReport(report)
                                }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {t('report_management.resolve')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(report.id, 'dismissed')}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t('report_management.dismiss')}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteReport(report.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('report_management.delete_report')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('report_management.pending_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.filter(r => r.status === 'pending').map((report) => (
                  <div key={report.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getPriorityBadge(report.priority)}
                          {getTypeBadge(report.reported_type)}
                          <span className="text-xs text-muted-foreground">
                            {report.created_at.toLocaleString()}
                          </span>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground">{t('report_management.reporter_label')}</p>
                          <p className="font-medium">{report.reporter_name}</p>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground">{t('report_management.reported_target_label')}</p>
                          <p className="font-medium">{report.reported_user_name || report.reported_content_title}</p>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground">{t('report_management.reason_label')}</p>
                          <p className="font-medium">{report.reason}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('report_management.description_label')}</p>
                          <p className="text-sm">{report.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => setSelectedReport(report)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('report_management.details_short')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(report.id, 'reviewing')}
                        >
                          {t('report_management.review')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviewing Tab */}
        <TabsContent value="reviewing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('report_management.reviewing_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.filter(r => r.status === 'reviewing').map((report) => (
                  <div key={report.id} className="p-4 border border-blue-200 dark:border-blue-900 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(report.status)}
                          {getPriorityBadge(report.priority)}
                          {getTypeBadge(report.reported_type)}
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground">{t('report_management.target_label')}</p>
                          <p className="font-medium">{report.reported_user_name || report.reported_content_title}</p>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground">{t('report_management.reason_label')} {report.reason}</p>
                          <p className="text-sm">{report.description}</p>
                        </div>
                        {report.assigned_to && (
                          <p className="text-xs text-muted-foreground">
                            {t('report_management.assigned_to_label')}: {report.assigned_to}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => setSelectedReport(report)}>
                          {t('report_management.resolve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(report.id, 'dismissed')}
                        >
                          {t('report_management.dismiss')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Critical Tab */}
        <TabsContent value="critical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('report_management.critical_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.filter(r => r.priority === 'critical').map((report) => (
                  <div key={report.id} className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          {getPriorityBadge(report.priority)}
                          {getTypeBadge(report.reported_type)}
                          {getStatusBadge(report.status)}
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground">{t('report_management.target_label')}</p>
                          <p className="font-medium">{report.reported_user_name || report.reported_content_title}</p>
                        </div>
                        <div className="mb-2">
                          <p className="text-sm text-muted-foreground">{t('report_management.reason_label')} {report.reason}</p>
                          <p className="text-sm">{report.description}</p>
                        </div>
                        {report.evidence_urls && report.evidence_urls.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">{t('report_management.evidence_label')}</p>
                            <div className="flex gap-2">
                              {report.evidence_urls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  {t('report_management.view_evidence')} {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="destructive" onClick={() => setSelectedReport(report)}>
                          <Flag className="h-4 w-4 mr-2" />
                          {t('report_management.handle_now')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => {
          setSelectedReport(null)
          setResolutionText('')
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('report_management.detail_title')}</DialogTitle>
              <DialogDescription>ID: {selectedReport.id}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                {getStatusBadge(selectedReport.status)}
                {getPriorityBadge(selectedReport.priority)}
                {getTypeBadge(selectedReport.reported_type)}
                {getActionBadge(selectedReport.action_taken)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">{t('report_management.reporter')}</p>
                  <p className="text-sm">{selectedReport.reporter_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedReport.reporter_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">{t('report_management.report_date')}</p>
                  <p className="text-sm">{selectedReport.created_at.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">{t('report_management.reported_target')}</p>
                <p className="text-sm font-medium">{selectedReport.reported_user_name}</p>
                {selectedReport.reported_content_title && (
                  <p className="text-sm text-muted-foreground">{selectedReport.reported_content_title}</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-1">{t('report_management.reason')}</p>
                <Badge variant="outline">{selectedReport.reason}</Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">{t('report_management.detailed_description')}</p>
                <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description}</p>
              </div>

              {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t('report_management.attached_evidence')}</p>
                  <div className="space-y-1">
                    {selectedReport.evidence_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        {t('report_management.evidence_item', { index: idx + 1 })}: {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.resolution && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                  <p className="text-sm font-medium mb-1 text-green-600 dark:text-green-400">{t('report_management.resolution_result')}</p>
                  <p className="text-sm">{selectedReport.resolution}</p>
                  {selectedReport.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('report_management.resolved_at')}: {selectedReport.resolved_at.toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {(selectedReport.status === 'pending' || selectedReport.status === 'reviewing') && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium mb-2">{t('report_management.resolution_action')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleStatusChange(selectedReport.id, 'resolved', 'warning')
                          setSelectedReport(null)
                        }}
                      >
                        {t('report_management.actions.warning')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleStatusChange(selectedReport.id, 'resolved', 'content_removed')
                          setSelectedReport(null)
                        }}
                      >
                        {t('report_management.remove_content')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleStatusChange(selectedReport.id, 'resolved', 'user_suspended')
                          setSelectedReport(null)
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {t('report_management.actions.user_suspended')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleStatusChange(selectedReport.id, 'resolved', 'user_banned')
                          setSelectedReport(null)
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {t('report_management.actions.user_banned')}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">{t('report_management.resolution_notes')}</p>
                    <Textarea
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder={t('report_management.resolution_notes_placeholder')}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        handleStatusChange(selectedReport.id, 'resolved', 'none')
                        setSelectedReport(null)
                        setResolutionText('')
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('report_management.mark_resolved')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleStatusChange(selectedReport.id, 'dismissed')
                        setSelectedReport(null)
                        setResolutionText('')
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('report_management.dismiss_report')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}






