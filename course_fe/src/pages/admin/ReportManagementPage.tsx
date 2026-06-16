import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Eye,
  Flag,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Textarea } from '../../components/ui/textarea'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { useRouter } from '../../components/Router'
import { useAuth } from '../../contexts/AuthContext'
import {
  REPORT_REASON_LABELS,
  downloadCopyrightCaseExport,
  downloadReportExport,
  getAdminCopyrightCase,
  getAdminReports,
  getReportCaseDetail,
  getReportStatistics,
  runAdminCopyrightAction,
  resolveAdminReport,
  reopenAdminReport,
  type CopyrightAdminAction,
  type CopyrightCase,
  type CopyrightSeverity,
  type ReportAction,
  type ReportCase,
  type ReportCaseDetail,
  type ReportPriority,
  type ReportReason,
  type ReportStatus,
  type ReportStats,
  type ReportStatsFilters,
  type ReportTargetType,
} from '../../services/report.api'

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  review: 'Đánh giá',
  question: 'Câu hỏi',
  answer: 'Câu trả lời',
  blog_post: 'Bài viết blog',
  blog_comment: 'Bình luận blog',
  lesson_comment: 'Bình luận bài học',
  lesson: 'Bài học',
  course: 'Khóa học',
  message: 'Tin nhắn',
}

const REPORT_METADATA_LABELS: Record<string, string> = {
  infringing_part: 'Phần bị nghi vi phạm',
  original_work_url: 'Nguồn/tác phẩm gốc',
  ownership_statement: 'Quan hệ với chủ sở hữu',
  evidence_urls: 'Link bằng chứng',
  lesson_id: 'Mã bài học',
  lesson_title: 'Bài học',
  timestamp_seconds: 'Mốc thời gian (giây)',
  good_faith_confirmed: 'Xác nhận thiện chí',
}

function ReportExtraDetails({
  metadata,
  attachments,
}: {
  metadata?: Record<string, any>
  attachments?: Array<Record<string, any>>
}) {
  const hiddenKeys = new Set(['report_id', 'lesson_id'])
  const entries = Object.entries(metadata ?? {}).filter(
    ([key, value]) =>
      !hiddenKeys.has(key) &&
      value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0),
  )
  const hasAttachments = (attachments?.length ?? 0) > 0
  if (entries.length === 0 && !hasAttachments) return null

  const renderValue = (value: any) => {
    if (typeof value === 'boolean') return value ? 'Có' : 'Không'
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-4">
          {value.map((item, i) => (
            <li key={i} className="break-all">{String(item)}</li>
          ))}
        </ul>
      )
    }
    return <span className="break-all">{String(value)}</span>
  }

  return (
    <div className="mt-2 space-y-1 rounded bg-muted/60 p-2 text-xs">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className="font-medium">{REPORT_METADATA_LABELS[key] ?? key}: </span>
          {renderValue(value)}
        </div>
      ))}
      {hasAttachments && (
        <div>
          <span className="font-medium">Tệp đính kèm ({attachments!.length}): </span>
          <span className="inline-flex flex-wrap gap-2">
            {attachments!.map((file, i) => (
              <a
                key={i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline"
              >
                <ExternalLink className="h-3 w-3" />
                {file.public_id?.split('/').pop() || `Tệp ${i + 1}`}
              </a>
            ))}
          </span>
        </div>
      )}
    </div>
  )
}

const PRIORITY_STYLES: Record<ReportPriority, string> = {
  low: 'border-blue-500 text-blue-600',
  medium: 'border-yellow-500 text-yellow-600',
  high: 'border-orange-500 text-orange-600',
  critical: 'border-red-500 text-red-600',
}

const STATUS_ACTIONS: Record<string, Array<{ label: string; action: ReportAction; destructive?: boolean; desc?: string }>> = {
  message: [
    { label: 'Chấp nhận (giữ tin nhắn)', action: 'approve', desc: 'Giữ nguyên tin nhắn, đóng báo cáo.' },
    { label: 'Thu hồi tin nhắn', action: 'revoke', desc: 'Gỡ tin nhắn khỏi cuộc trò chuyện nhưng không xóa hẳn.' },
    { label: 'Xóa tin nhắn', action: 'delete', destructive: true, desc: 'Xóa mềm tin nhắn.' },
  ],
  course: [
    { label: 'Chấp nhận (giữ khóa học)', action: 'approve', desc: 'Hiện lại & cho bán bình thường. Không tác động earning/payout.' },
    { label: 'Ẩn khóa học', action: 'hide', desc: 'Ẩn khỏi marketplace (ngừng bán). Học viên đã mua vẫn học được. Không tác động earning/payout.' },
    { label: 'Xóa khóa học', action: 'delete', destructive: true, desc: 'Xóa mềm khóa học; bị chặn nếu đã có học viên/giao dịch. Không tác động earning/payout.' },
  ],
  default: [
    { label: 'Chấp nhận (giữ nội dung)', action: 'approve', desc: 'Hiển thị lại nội dung, đóng báo cáo.' },
    { label: 'Ẩn nội dung', action: 'hide', desc: 'Ẩn nội dung khỏi người xem (chưa xóa).' },
    { label: 'Xóa nội dung', action: 'delete', destructive: true, desc: 'Xóa mềm nội dung.' },
  ],
}

function getResolveActions(targetType: ReportTargetType) {
  return STATUS_ACTIONS[targetType] ?? STATUS_ACTIONS.default
}

export function ReportManagementPage() {
  const { hasPermission } = useAuth()
  const { currentRoute } = useRouter()
  const [activeTab, setActiveTab] = useState<ReportStatus>('pending')
  const [cases, setCases] = useState<ReportCase[]>([])
  const [selectedCopyrightCase, setSelectedCopyrightCase] = useState<CopyrightCase | null>(null)
  const [copyrightDetail, setCopyrightDetail] = useState<CopyrightCase | null>(null)
  const [copyrightActionLoading, setCopyrightActionLoading] = useState(false)
  const [copyrightMessage, setCopyrightMessage] = useState('')
  const [copyrightSeverity, setCopyrightSeverity] = useState<CopyrightSeverity>('low')
  const [selectedCopyrightAction, setSelectedCopyrightAction] = useState<CopyrightAdminAction | ''>('')
  const [countAsStrike, setCountAsStrike] = useState(true)
  const [withRefund, setWithRefund] = useState(true)
  const [withHold, setWithHold] = useState(true)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [statsFilters, setStatsFilters] = useState<ReportStatsFilters>({ group_by: 'day' })
  const [loading, setLoading] = useState(false)
  const [selectedCase, setSelectedCase] = useState<ReportCase | null>(null)
  const [caseDetail, setCaseDetail] = useState<ReportCaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false, title: '', description: '', confirmLabel: '',
    destructive: false, loading: false, action: null,
  })

  const loadCases = async (status: ReportStatus) => {
    setLoading(true)
    try {
      const all: ReportCase[] = []
      let page = 1
      while (true) {
        const response = await getAdminReports({ status, page, page_size: 100 })
        all.push(...response.results)
        if (!response.next) break
        page += 1
      }
      setCases(all)
    } catch {
      toast.error('Không thể tải danh sách báo cáo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCases(activeTab)
  }, [activeTab])

  const loadStats = async () => {
    try {
      setStats(await getReportStatistics(statsFilters))
    } catch {
      /* stats là phụ trợ; lỗi không chặn trang */
    }
  }

  useEffect(() => {
    void loadStats()
  }, [
    statsFilters.date_from,
    statsFilters.date_to,
    statsFilters.type,
    statsFilters.reason,
    statsFilters.status,
    statsFilters.group_by,
  ])

  const setStatsFilter = <K extends keyof ReportStatsFilters>(key: K, value: ReportStatsFilters[K] | '') => {
    setStatsFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }))
  }

  useEffect(() => {
    const qs = currentRoute.split('?')[1] || ''
    const sp = new URLSearchParams(qs)
    const caseId = Number(sp.get('case'))
    if (caseId) {
      void openCopyrightDetailById(caseId)
    }
  }, [currentRoute])

  const openCaseDetail = async (reportCase: ReportCase) => {
    // Báo cáo bản quyền có quy trình xử lý riêng — mở thẳng modal bản quyền.
    if (reportCase.copyright_case_id) {
      await openCopyrightDetailById(reportCase.copyright_case_id)
      return
    }
    setSelectedCase(reportCase)
    setResolutionNotes('')
    setDetailLoading(true)
    try {
      const detail = await getReportCaseDetail(reportCase.target_type, reportCase.target_id)
      setCaseDetail(detail)
    } catch {
      toast.error('Không thể tải chi tiết báo cáo.')
    } finally {
      setDetailLoading(false)
    }
  }

  const openCopyrightDetailById = async (caseId: number) => {
    setCopyrightActionLoading(false)
    try {
      const detail = await getAdminCopyrightCase(caseId)
      setSelectedCopyrightCase(detail)
      setCopyrightDetail(detail)
      setCopyrightSeverity(detail.severity)
      setCopyrightMessage('')
    } catch {
      toast.error('Không thể tải chi tiết case bản quyền.')
    }
  }

  const handleCopyrightAction = async (action: CopyrightAdminAction) => {
    const target = copyrightDetail || selectedCopyrightCase
    if (!target) return
    setCopyrightActionLoading(true)
    try {
      const updated = await runAdminCopyrightAction(target.id, {
        action,
        message: copyrightMessage,
        severity: copyrightSeverity,
        count_as_strike: action === 'takedown' ? countAsStrike : undefined,
        with_refund: action === 'takedown' ? withRefund : undefined,
        with_hold: (action === 'suspend_sale' || action === 'freeze' || action === 'takedown') ? withHold : undefined,
      })
      setSelectedCopyrightCase(updated)
      setCopyrightDetail(updated)
      setCopyrightMessage('')
      setSelectedCopyrightAction('')
      toast.success('Đã cập nhật case bản quyền.')
    } catch {
      toast.error('Không thể thực hiện action bản quyền.')
    } finally {
      setCopyrightActionLoading(false)
    }
  }

  const handleResolve = async (reportCase: ReportCase, action: ReportAction) => {
    try {
      await resolveAdminReport(reportCase.target_type, reportCase.target_id, {
        action,
        resolution_notes: resolutionNotes,
      })
      toast.success('Đã xử lý báo cáo thành công.')
      setSelectedCase(null)
      setCaseDetail(null)
      setCases(prev => prev.filter(c => c.id !== reportCase.id))
    } catch {
      toast.error('Xử lý báo cáo thất bại.')
    }
  }

  const handleReopen = async (reportCase: ReportCase) => {
    try {
      await reopenAdminReport(reportCase.target_type, reportCase.target_id)
      toast.success('Đã mở lại báo cáo. Chuyển về đang xem xét.')
      setCases(prev => prev.filter(c => c.id !== reportCase.id))
    } catch {
      toast.error('Không thể mở lại báo cáo.')
    }
  }

  const handleExportReports = async () => {
    try {
      await downloadReportExport(statsFilters)
    } catch {
      toast.error('Không thể xuất báo cáo.')
    }
  }

  const handleExportCopyrightCases = async () => {
    try {
      await downloadCopyrightCaseExport(statsFilters)
    } catch {
      toast.error('Không thể xuất case bản quyền.')
    }
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false,
  ) => {
    setConfirmState({ open: true, title, description, confirmLabel, destructive, loading: false, action })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    setConfirmState(prev => ({ ...prev, loading: true }))
    try {
      await confirmState.action()
      setConfirmState({ open: false, title: '', description: '', confirmLabel: '', destructive: false, loading: false, action: null })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  if (!hasPermission('admin.reports.manage')) {
    return (
      <div className="container mx-auto p-6 text-center py-12">
        <h2 className="text-2xl mb-4">Không có quyền truy cập</h2>
        <p className="text-muted-foreground">Bạn không có quyền quản lý báo cáo.</p>
      </div>
    )
  }

  const criticalCount = cases.filter(c => c.priority === 'critical').length
  const highCount = cases.filter(c => c.priority === 'high').length
  const displayedCases = cases

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-1">Quản lý báo cáo</h1>
          <p className="text-muted-foreground">
            Xem xét và xử lý nội dung bị người dùng báo cáo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleExportReports()}>
            Xuất báo cáo (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleExportCopyrightCases()}>
            Xuất case bản quyền (CSV)
          </Button>
        </div>
      </div>

      {/* Stats — toàn hệ thống (không đếm theo trang) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng báo cáo', value: stats?.summary.total_reports ?? '—', icon: Flag, color: 'text-muted-foreground' },
          { label: 'Case đang mở', value: stats?.summary.open_cases ?? '—', icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Đã xử lý', value: stats?.summary.resolved_cases ?? '—', icon: CheckCircle, color: 'text-green-500' },
          { label: 'Nghiêm trọng', value: stats?.summary.critical_cases ?? '—', icon: CheckCircle, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <div className="space-y-1">
            <Label className="text-xs">Từ ngày</Label>
            <Input
              type="date"
              value={statsFilters.date_from ?? ''}
              onChange={(event) => setStatsFilter('date_from', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Đến ngày</Label>
            <Input
              type="date"
              value={statsFilters.date_to ?? ''}
              onChange={(event) => setStatsFilter('date_to', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Loại</Label>
            <Select
              value={statsFilters.type ?? 'all'}
              onValueChange={(value) => setStatsFilter('type', value === 'all' ? '' : value as ReportTargetType)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {(Object.keys(TARGET_TYPE_LABELS) as ReportTargetType[]).map(type => (
                  <SelectItem key={type} value={type}>{TARGET_TYPE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lý do</Label>
            <Select
              value={statsFilters.reason ?? 'all'}
              onValueChange={(value) => setStatsFilter('reason', value === 'all' ? '' : value as ReportReason)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map(reason => (
                  <SelectItem key={reason} value={reason}>{REPORT_REASON_LABELS[reason]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Trạng thái</Label>
            <Select
              value={statsFilters.status ?? 'all'}
              onValueChange={(value) => setStatsFilter('status', value === 'all' ? '' : value as ReportStatus)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="reviewing">Đang xem xét</SelectItem>
                <SelectItem value="resolved">Đã xử lý</SelectItem>
                <SelectItem value="dismissed">Đã bỏ qua</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nhóm</Label>
            <Select
              value={statsFilters.group_by ?? 'day'}
              onValueChange={(value) => setStatsFilter('group_by', value as 'day' | 'week' | 'month')}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Ngày</SelectItem>
                <SelectItem value="week">Tuần</SelectItem>
                <SelectItem value="month">Tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStatsFilters({ group_by: 'day' })}
            >
              Xóa lọc
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportStatus)}>
        <TabsList>
          <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
          <TabsTrigger value="reviewing">Đang xem xét</TabsTrigger>
          <TabsTrigger value="resolved">Đã xử lý</TabsTrigger>
          <TabsTrigger value="dismissed">Đã bỏ qua</TabsTrigger>
        </TabsList>

        {(['pending', 'reviewing', 'resolved', 'dismissed'] as const).map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    {displayedCases.length} nội dung bị báo cáo
                    {criticalCount > 0 && tab === 'pending' && (
                      <Badge variant="destructive" className="ml-2">{criticalCount} critical</Badge>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Đang tải...</p>
                ) : displayedCases.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Không có báo cáo nào.
                  </p>
                ) : (
                  <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nội dung</TableHead>
                        <TableHead style={{ width: 110 }}>Loại</TableHead>
                        <TableHead style={{ width: 150 }}>Người tạo</TableHead>
                        <TableHead style={{ width: 90 }} className="text-center">Báo cáo</TableHead>
                        <TableHead style={{ width: 160 }}>Lý do chính</TableHead>
                        <TableHead style={{ width: 110 }}>Ưu tiên</TableHead>
                        <TableHead style={{ width: 130 }}>Ngày gần nhất</TableHead>
                        <TableHead style={{ width: 56 }} />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCases.map(c => (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell onClick={() => openCaseDetail(c)}>
                            <div style={{ minWidth: 0 }}>
                              <p className="font-medium text-sm truncate">
                                {c.title ?? `#${c.target_id}`}
                              </p>
                              {c.snippet && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {c.snippet}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                              {c.target_type === 'message' ? (
                                <MessageSquare className="h-3 w-3" />
                              ) : c.target_type === 'course' ? (
                                <BookOpen className="h-3 w-3" />
                              ) : (
                                <Flag className="h-3 w-3" />
                              )}
                              {TARGET_TYPE_LABELS[c.target_type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {c.owner_name ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={c.report_count >= 5 ? 'destructive' : c.report_count >= 3 ? 'default' : 'secondary'}
                            >
                              {c.report_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.top_reason ? REPORT_REASON_LABELS[c.top_reason] ?? c.top_reason : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={PRIORITY_STYLES[c.priority]}>
                              {c.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.last_reported_at
                              ? new Date(c.last_reported_at).toLocaleDateString('vi-VN')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openCaseDetail(c)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {c.copyright_case_id ? 'Mở case bản quyền' : 'Xem chi tiết'}
                                </DropdownMenuItem>
                                {!c.copyright_case_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  {getResolveActions(c.target_type).map(opt => (
                                    <DropdownMenuItem
                                      key={opt.action}
                                      className={opt.destructive ? 'text-red-600' : ''}
                                      onClick={() =>
                                        openConfirm(
                                          `${opt.label}?`,
                                          `Hành động này sẽ áp dụng cho "${c.title ?? c.target_id}" và đóng toàn bộ báo cáo liên quan.`,
                                          opt.label,
                                          () => handleResolve(c, opt.action),
                                          opt.destructive,
                                        )
                                      }
                                    >
                                      {opt.destructive ? <Trash2 className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                      {opt.label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openConfirm(
                                        'Bỏ qua báo cáo?',
                                        `Bỏ qua tất cả báo cáo về "${c.title ?? c.target_id}". Nội dung vẫn được giữ nguyên.`,
                                        'Bỏ qua',
                                        () => handleResolve(c, 'dismiss'),
                                      )
                                    }
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Bỏ qua
                                  </DropdownMenuItem>
                                </>
                                )}
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
        ))}
      </Tabs>

      {/* Case Detail Modal */}
      {selectedCase && (
        <Dialog open={!!selectedCase} onOpenChange={(open) => { if (!open) { setSelectedCase(null); setCaseDetail(null) } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-red-500" />
                Chi tiết báo cáo
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Content info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{TARGET_TYPE_LABELS[selectedCase.target_type]}</Badge>
                  <Badge variant="outline" className={PRIORITY_STYLES[selectedCase.priority]}>
                    {selectedCase.priority}
                  </Badge>
                  <Badge variant={selectedCase.report_count >= 5 ? 'destructive' : 'default'}>
                    {selectedCase.report_count} báo cáo
                  </Badge>
                </div>
                <p className="font-semibold">{selectedCase.title ?? `${selectedCase.target_type} #${selectedCase.target_id}`}</p>
                {selectedCase.owner_name && (
                  <p className="text-sm text-muted-foreground">Người tạo: {selectedCase.owner_name}</p>
                )}
                {selectedCase.snippet && (
                  <p className="text-sm bg-background rounded p-2 border">{selectedCase.snippet}</p>
                )}
                {caseDetail?.context?.course_id && caseDetail.context.lesson_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const ctx = caseDetail.context!
                      const commentId = ctx.comment_id ?? selectedCase.target_id
                      window.open(
                        `/course-player/${ctx.course_id}?lesson=${ctx.lesson_id}&comment=${commentId}`,
                        '_blank',
                      )
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Mở bình luận trong bài học
                  </Button>
                )}
              </div>

              {/* Reason breakdown */}
              {selectedCase.reason_breakdown && Object.keys(selectedCase.reason_breakdown).length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Phân bổ lý do báo cáo</p>
                  <div className="space-y-1">
                    {(Object.entries(selectedCase.reason_breakdown) as [string, number][])
                      .sort(([, a], [, b]) => b - a)
                      .map(([reason, count]) => (
                        <div key={reason} className="flex items-center justify-between text-sm">
                          <span>{REPORT_REASON_LABELS[reason as keyof typeof REPORT_REASON_LABELS] ?? reason}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Individual reports */}
              {detailLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Đang tải chi tiết...</p>
              ) : caseDetail && caseDetail.reports.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold mb-2">Danh sách báo cáo ({caseDetail.reports.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {caseDetail.reports.map(r => (
                      <div key={r.report_id} className="text-sm border rounded p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{r.reporter_name ?? 'Ẩn danh'}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{r.reason_label}</Badge>
                        </div>
                        {r.description && (
                          <p className="text-muted-foreground text-xs">{r.description}</p>
                        )}
                        <ReportExtraDetails metadata={r.metadata} attachments={r.attachments} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Resolution actions */}
              {(activeTab === 'pending' || activeTab === 'reviewing') && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium mb-1">Ghi chú xử lý (tuỳ chọn)</p>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Lý do xử lý, ghi chú nội bộ..."
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {getResolveActions(selectedCase.target_type).map(opt => (
                      <div key={opt.action} className="space-y-1">
                        <Button
                          variant={opt.destructive ? 'destructive' : 'outline'}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            openConfirm(
                              `${opt.label}?`,
                              `Xác nhận "${opt.label}" đối với nội dung này. Toàn bộ ${selectedCase.report_count} báo cáo sẽ được đóng.`,
                              opt.label,
                              () => handleResolve(selectedCase, opt.action),
                              opt.destructive,
                            )
                          }}
                        >
                          {opt.label}
                        </Button>
                        {opt.desc && <p className="text-xs text-muted-foreground">{opt.desc}</p>}
                      </div>
                    ))}
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          openConfirm(
                            'Bỏ qua báo cáo?',
                            `Nội dung vẫn được giữ nguyên. ${selectedCase.report_count} báo cáo sẽ được đóng.`,
                            'Bỏ qua',
                            () => handleResolve(selectedCase, 'dismiss'),
                          )
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Bỏ qua
                      </Button>
                      <p className="text-xs text-muted-foreground">Đóng báo cáo, giữ nguyên nội dung. Không xử lý gì thêm.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedCopyrightCase && (
        <Dialog
          open={!!selectedCopyrightCase}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCopyrightCase(null)
              setCopyrightDetail(null)
              setCopyrightMessage('')
              setSelectedCopyrightAction('')
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '72rem' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-red-500" />
                Case bản quyền #{selectedCopyrightCase.id}
              </DialogTitle>
            </DialogHeader>

            {(() => {
              const detail = copyrightDetail || selectedCopyrightCase
              const actions: Array<{ label: string; action: CopyrightAdminAction; destructive?: boolean; hidden?: boolean; desc?: string; fields?: Array<'severity'> }> = [
                { label: 'Ngừng bán', action: 'suspend_sale', fields: ['severity'], desc: 'Ẩn khóa khỏi marketplace (ngừng bán); học viên đã mua vẫn học. Tuỳ chọn hold earning.' },
                { label: 'Đóng băng truy cập', action: 'freeze', fields: ['severity'], desc: 'Chặn cứng cả học viên đã mua (block access). Tuỳ chọn hold earning.' },
                { label: 'Xác nhận vi phạm / takedown', action: 'takedown', destructive: true, desc: 'Gỡ bỏ vĩnh viễn (block cứng). Tuỳ chọn: hủy earning chưa trả + HOÀN TIỀN 100% cho người mua trong 30 ngày (trên 30 ngày vào danh sách đền bù thủ công) + tính 1 gậy vi phạm (gậy thứ 3 tự ban giảng viên). Bỏ tick để xử lý riêng ở trang refund/earning.' },
                { label: 'Khôi phục', action: 'restore', desc: 'Khôi phục nội dung (bỏ ẩn/bỏ block) và giải phóng toàn bộ hold earning về khả dụng.' },
              ]
              const visibleActions = actions.filter(item => !item.hidden)
              const selected = visibleActions.find(item => item.action === selectedCopyrightAction)
              const showField = (f: 'severity') => !!selected?.fields?.includes(f)
              return (
                <div className="space-y-5">
                  <div className="grid gap-3 rounded-md bg-muted p-4 text-sm md:grid-cols-2">
                    <div><span className="text-muted-foreground">Nội dung:</span> {detail.title}</div>
                    <div><span className="text-muted-foreground">Target:</span> {detail.target_type} #{detail.target_id}</div>
                    <div><span className="text-muted-foreground">Instructor:</span> {detail.instructor_name || '-'}</div>
                    <div><span className="text-muted-foreground">Reporter:</span> {detail.reporter_name || '-'}</div>
                    <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{detail.status}</Badge></div>
                    <div><span className="text-muted-foreground">Severity:</span> <Badge variant="outline">{detail.severity}</Badge></div>
                    <div><span className="text-muted-foreground">Content action:</span> {detail.content_action}</div>
                    <div><span className="text-muted-foreground">Financial action:</span> {detail.financial_action}</div>
                    <div><span className="text-muted-foreground">Held:</span> {Number(detail.held_amount || 0).toLocaleString('vi-VN')} VND</div>
                    <div><span className="text-muted-foreground">Manual follow-up:</span> {detail.manual_follow_up ? 'Có' : 'Không'}</div>
                  </div>

                  <div className="space-y-3 rounded-md border p-4">
                    <p className="text-sm font-semibold">Xử lý báo cáo bản quyền</p>
                    <div className="space-y-2">
                      <Label>Biện pháp xử lý</Label>
                      <Select
                        value={selectedCopyrightAction}
                        onValueChange={(value) => setSelectedCopyrightAction(value as CopyrightAdminAction)}
                      >
                        <SelectTrigger><SelectValue placeholder="Chọn biện pháp..." /></SelectTrigger>
                        <SelectContent>
                          {visibleActions.map(item => (
                            <SelectItem key={item.action} value={item.action}>{item.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selected && (
                      <>
                        {selected.desc && (
                          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                            {selected.desc}
                          </div>
                        )}

                        {showField('severity') && (
                          <div className="space-y-2">
                            <Label>Mức độ vi phạm</Label>
                            <Select value={copyrightSeverity} onValueChange={(value) => setCopyrightSeverity(value as CopyrightSeverity)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {([
                                  ['low', 'Thấp'],
                                  ['medium', 'Trung bình'],
                                  ['high', 'Cao'],
                                  ['confirmed', 'Đã xác nhận'],
                                  ['legal', 'Pháp lý'],
                                ] as [CopyrightSeverity, string][]).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {(selected.action === 'suspend_sale' || selected.action === 'freeze' || selected.action === 'takedown') && (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={withHold} onCheckedChange={(value) => setWithHold(value === true)} />
                            <span>{selected.action === 'takedown' ? 'Hủy earning chưa trả của khóa' : 'Hold earning pending/available'}</span>
                          </label>
                        )}

                        {selected.action === 'takedown' && (
                          <>
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox checked={withRefund} onCheckedChange={(value) => setWithRefund(value === true)} />
                              <span>Tự hoàn tiền 100% cho người mua trong 30 ngày (bỏ tick để xử lý riêng ở trang refund)</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox checked={countAsStrike} onCheckedChange={(value) => setCountAsStrike(value === true)} />
                              <span>Tính vụ này là 1 gậy vi phạm bản quyền (gậy thứ 3 sẽ tự ban giảng viên)</span>
                            </label>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label>Ghi chú / nội dung gửi đi (tuỳ chọn)</Label>
                          <Textarea
                            value={copyrightMessage}
                            onChange={(e) => setCopyrightMessage(e.target.value)}
                            rows={3}
                            placeholder="Thông tin gửi cho reporter/instructor hoặc ghi chú quyết định..."
                          />
                        </div>

                        <Button
                          variant={selected.destructive ? 'destructive' : 'default'}
                          disabled={copyrightActionLoading}
                          onClick={() => {
                            openConfirm(
                              `${selected.label}?`,
                              selected.desc || 'Xác nhận thực hiện biện pháp này.',
                              selected.label,
                              () => handleCopyrightAction(selected.action),
                              selected.destructive,
                            )
                          }}
                        >
                          {copyrightActionLoading ? 'Đang xử lý...' : 'Xử lý'}
                        </Button>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Timeline</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(detail.messages || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Chưa có timeline.</p>
                      ) : detail.messages?.map(item => (
                        <div key={item.id} className="rounded-md border p-3 text-sm">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{item.actor_role}</Badge>
                            <span className="font-medium">{item.response_type || 'message'}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleString('vi-VN')}
                            </span>
                            <Badge variant="secondary">{item.visibility}</Badge>
                          </div>
                          {item.message && <p className="whitespace-pre-wrap">{item.message}</p>}
                          <ReportExtraDetails metadata={item.metadata} attachments={item.attachments} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {detail.reports && detail.reports.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Reports gốc</p>
                      <div className="space-y-2 max-h-44 overflow-y-auto">
                        {detail.reports.map(report => (
                          <div key={report.report_id} className="rounded border p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{report.reporter_name || 'Ẩn danh'}</span>
                              <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString('vi-VN')}</span>
                            </div>
                            {report.description && <p className="mt-1 text-muted-foreground">{report.description}</p>}
                            <ReportExtraDetails metadata={report.metadata} attachments={report.attachments} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
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
