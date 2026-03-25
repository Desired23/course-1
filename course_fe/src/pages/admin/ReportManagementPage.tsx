import React, { useEffect, useMemo, useState } from 'react'
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

const getResolveActions = (report: ReportItem): Array<{ label: string; action: AdminReportAction }> => {
  if (report.reported_type === 'forum_post') {
    return [
      { label: 'Phe duyet', action: 'approve' },
      { label: 'Khoa chu de', action: 'lock' },
      { label: 'Xoa chu de', action: 'delete' },
    ]
  }
  if (report.reported_type === 'qa_question') {
    return [
      { label: 'Phe duyet Q&A', action: 'approve' },
      { label: 'Dong Q&A', action: 'close' },
      { label: 'Xoa Q&A', action: 'delete' },
    ]
  }
  if (report.reported_type === 'message') {
    return [
      { label: 'Phe duyet tin nhan', action: 'approve' },
      { label: 'Thu hoi tin nhan', action: 'revoke' },
      { label: 'Xoa tin nhan', action: 'delete' },
    ]
  }
  return [
    { label: 'Phe duyet review', action: 'approve' },
    { label: 'An review', action: 'hide' },
    { label: 'Xoa review', action: 'delete' },
  ]
}

export function ReportManagementPage() {
  const { hasPermission } = useAuth()
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
    confirmLabel: 'Confirm',
    destructive: false,
    loading: false,
    action: null,
  })

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
        toast.error('Khong tai duoc danh sach report')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'search',
      label: 'Tim kiem',
      type: 'search',
      placeholder: 'Tim theo tac gia, tieu de, ly do...',
    },
    {
      key: 'status',
      label: 'Trang thai',
      type: 'select',
      options: [
        { label: 'Cho xu ly', value: 'pending', count: reports.filter(r => r.status === 'pending').length },
        { label: 'Dang xem', value: 'reviewing', count: reports.filter(r => r.status === 'reviewing').length },
        { label: 'Da xu ly', value: 'resolved', count: reports.filter(r => r.status === 'resolved').length },
        { label: 'Bo qua', value: 'dismissed', count: reports.filter(r => r.status === 'dismissed').length },
      ],
    },
    {
      key: 'type',
      label: 'Loai',
      type: 'select',
      options: [
        { label: 'Forum post', value: 'forum_post', count: reports.filter(r => r.reported_type === 'forum_post').length },
        { label: 'Review', value: 'review', count: reports.filter(r => r.reported_type === 'review').length },
        { label: 'Q&A', value: 'qa_question', count: reports.filter(r => r.reported_type === 'qa_question').length },
        { label: 'Message', value: 'message', count: reports.filter(r => r.reported_type === 'message').length },
      ],
    },
    {
      key: 'priority',
      label: 'Muc do',
      type: 'select',
      options: [
        { label: 'Critical', value: 'critical', count: reports.filter(r => r.priority === 'critical').length },
        { label: 'High', value: 'high', count: reports.filter(r => r.priority === 'high').length },
        { label: 'Medium', value: 'medium', count: reports.filter(r => r.priority === 'medium').length },
        { label: 'Low', value: 'low', count: reports.filter(r => r.priority === 'low').length },
      ],
    },
    {
      key: 'date',
      label: 'Ngay report',
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
        confirmLabel: 'Confirm',
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
          reason: resolutionText || report.reason || 'Dismissed by admin',
          resolution_notes: resolutionText,
        })
        syncReport(report.id, item => ({
          ...item,
          status: 'dismissed',
          resolution: resolutionText || 'Dismissed by admin',
          action_taken: 'dismiss',
          resolved_at: new Date(),
          updated_at: new Date(),
        }))
        return
      }

      if (nextStatus === 'resolved' && action) {
        await resolveAdminReport(report.reported_type, report.reported_id, {
          action,
          reason: resolutionText || report.reason || 'Resolved by admin',
          resolution_notes: resolutionText,
        })
        syncReport(report.id, item => ({
          ...item,
          status: 'resolved',
          resolution: resolutionText || `Resolved with ${action}`,
          action_taken: action,
          resolved_at: new Date(),
          updated_at: new Date(),
        }))
      }
    } catch {
      toast.error('Xu ly report that bai')
    }
  }

  const handleDeleteReport = async (report: ReportItem) => {
    try {
      await resolveAdminReport(report.reported_type, report.reported_id, {
        action: 'delete',
        reason: 'Deleted from report management',
      })
      syncReport(report.id, () => null)
    } catch {
      toast.error('Khong the xoa noi dung bi report')
    }
  }

  const getStatusBadge = (status: UiReportStatus) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'Cho xu ly', icon: Flag },
      reviewing: { variant: 'default' as const, label: 'Dang xem', icon: Eye },
      resolved: { variant: 'default' as const, label: 'Da xu ly', icon: CheckCircle },
      dismissed: { variant: 'outline' as const, label: 'Bo qua', icon: XCircle },
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
    return <Badge variant="outline" className={variants[priority]}>{priority}</Badge>
  }

  const getTypeBadge = (type: ReportItem['reported_type']) => {
    const icons = {
      forum_post: MessageSquare,
      review: BookOpen,
      qa_question: MessageSquare,
      message: MessageSquare,
    }
    const labels = {
      forum_post: 'Forum post',
      review: 'Review',
      qa_question: 'Q&A',
      message: 'Message',
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
      toast.error('Bulk report action that bai')
    }
  }

  if (!hasPermission('admin.reports.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Khong co quyen truy cap</h2>
          <p className="text-muted-foreground">Ban khong co quyen quan ly reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">Report Management</h1>
          <p className="text-muted-foreground">Hub report hop nhat cho forum post, review, Q&A va message.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tong report</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.length}</div>
            <p className="text-xs text-muted-foreground">Noi dung dang bi report tren cac domain da noi that</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cho xu ly</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Can moderator xu ly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High/Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.priority === 'high' || r.priority === 'critical').length}</div>
            <p className="text-xs text-muted-foreground">Uu tien xu ly som</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Da xu ly</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reports.filter(r => r.status === 'resolved').length}</div>
            <p className="text-xs text-muted-foreground">Trong session hien tai</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Tat ca ({reports.length})</TabsTrigger>
          <TabsTrigger value="pending">Cho xu ly ({reports.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="reviewing">Dang xem ({reports.filter(r => r.status === 'reviewing').length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({reports.filter(r => r.priority === 'critical').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <TableFilter title="Bo loc report" configs={filterConfigs} onFilterChange={handleFilter} />

          <AdminBulkActionBar
            count={selectedReportIds.length}
            label="reports selected"
            onClear={() => setSelectedReportIds([])}
            actions={[
              {
                key: 'review',
                label: 'Mark reviewing',
                onClick: () => openConfirm(
                  'Mark selected reports as reviewing',
                  `Move ${selectedReportIds.length} selected reports into reviewing?`,
                  'Mark reviewing',
                  () => bulkUpdateReports(selectedReportIds, (report) => handleStatusChange(report, 'reviewing'), 'Da chuyen report sang dang xem'),
                ),
              },
              {
                key: 'dismiss',
                label: 'Dismiss',
                destructive: true,
                onClick: () => openConfirm(
                  'Dismiss selected reports',
                  `Dismiss ${selectedReportIds.length} selected reports?`,
                  'Dismiss',
                  () => bulkUpdateReports(selectedReportIds, (report) => handleStatusChange(report, 'dismissed'), 'Da bo qua report da chon'),
                  true,
                ),
              },
              {
                key: 'delete',
                label: 'Delete content',
                destructive: true,
                onClick: () => openConfirm(
                  'Delete reported content',
                  `Delete content for ${selectedReportIds.length} selected reports? This action may be irreversible.`,
                  'Delete content',
                  () => bulkUpdateReports(selectedReportIds, handleDeleteReport, 'Da xoa noi dung bi report'),
                  true,
                ),
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>Danh sach report ({filteredReports.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Dang tai reports...</p>
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
                      <TableHead>Nguoi bi report</TableHead>
                      <TableHead>Loai</TableHead>
                      <TableHead>Noi dung</TableHead>
                      <TableHead>Ly do</TableHead>
                      <TableHead>Muc do</TableHead>
                      <TableHead>Trang thai</TableHead>
                      <TableHead>Ngay</TableHead>
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
                            <p className="font-medium text-sm">{report.reported_user_name || 'Unknown user'}</p>
                            <p className="text-xs text-muted-foreground">{report.report_count} bao cao</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(report.reported_type)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{report.reported_content_title || 'Khong co tieu de'}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{report.description || 'Khong co mo ta'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{report.reason || 'Khong ro'}</TableCell>
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
                                Xem chi tiet
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {report.status === 'pending' && (
                                <DropdownMenuItem onClick={() => openConfirm(
                                  'Start reviewing report',
                                  `Move report ${report.id} into reviewing?`,
                                  'Start reviewing',
                                  () => handleStatusChange(report, 'reviewing'),
                                )}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Bat dau xem
                                </DropdownMenuItem>
                              )}
                              {(report.status === 'pending' || report.status === 'reviewing') && (
                                <>
                                  <DropdownMenuItem onClick={() => setSelectedReport(report)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Xu ly
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openConfirm(
                                    'Dismiss report',
                                    `Dismiss report ${report.id}?`,
                                    'Dismiss',
                                    () => handleStatusChange(report, 'dismissed'),
                                    true,
                                  )}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Bo qua
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem className="text-red-600" onClick={() => openConfirm(
                                'Delete reported content',
                                `Delete content associated with report ${report.id}? This action may be irreversible.`,
                                'Delete content',
                                () => handleDeleteReport(report),
                                true,
                              )}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Xoa noi dung
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
                  {tab === 'pending' ? 'Reports cho xu ly' : tab === 'reviewing' ? 'Reports dang xem' : 'Reports critical'}
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
                            <p className="font-medium">{report.reported_content_title || 'Khong co tieu de'}</p>
                            <p className="text-sm text-muted-foreground">Tac gia: {report.reported_user_name || 'Unknown'}</p>
                            <p className="text-sm">Ly do: {report.reason || 'Khong ro'}</p>
                            <p className="text-sm text-muted-foreground">{report.description || 'Khong co mo ta chi tiet'}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" onClick={() => setSelectedReport(report)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Chi tiet
                            </Button>
                            {report.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => openConfirm(
                                'Start reviewing report',
                                `Move report ${report.id} into reviewing?`,
                                'Start reviewing',
                                () => handleStatusChange(report, 'reviewing'),
                              )}>
                                Bat dau xem
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

      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => {
          setSelectedReport(null)
          setResolutionText('')
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Chi tiet report</DialogTitle>
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
                  <p className="text-sm font-medium mb-1">Nguoi bi report</p>
                  <p className="text-sm">{selectedReport.reported_user_name || 'Unknown user'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Ngay report</p>
                  <p className="text-sm">{selectedReport.created_at.toLocaleString('vi-VN')}</p>
                </div>
              </div>

              {selectedReport.reported_type === 'forum_post' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Chu de</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Noi dung bai viet</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || 'Khong co noi dung'}</p>
                  </div>
                </div>
              ) : selectedReport.reported_type === 'qa_question' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Khoa hoc / Q&A</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Cau hoi</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || 'Khong co noi dung'}</p>
                  </div>
                </div>
              ) : selectedReport.reported_type === 'message' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Cuoc tro chuyen</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Tin nhan</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || 'Khong co noi dung'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Khoa hoc</p>
                    <p className="text-sm">{selectedReport.reported_content_title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Noi dung review</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedReport.description || 'Khong co noi dung'}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Ly do gan nhat</p>
                <Badge variant="outline">{selectedReport.reason || 'Khong ro'}</Badge>
              </div>

              {selectedReport.resolution && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium mb-1 text-green-600">Ket qua xu ly</p>
                  <p className="text-sm">{selectedReport.resolution}</p>
                </div>
              )}

              {(selectedReport.status === 'pending' || selectedReport.status === 'reviewing') && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium mb-2">Ghi chu xu ly</p>
                    <Textarea
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="Nhap ghi chu moderation neu can"
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
                      Danh dau da xu ly
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
                      Bo qua report
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
    </div>
  )
}
