import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
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
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'
import {
  REPORT_REASON_LABELS,
  getAdminReports,
  getReportCaseDetail,
  resolveAdminReport,
  reopenAdminReport,
  type ReportAction,
  type ReportCase,
  type ReportCaseDetail,
  type ReportPriority,
  type ReportStatus,
  type ReportTargetType,
} from '../../services/report.api'

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  review: 'Đánh giá',
  question: 'Câu hỏi',
  answer: 'Câu trả lời',
  blog_post: 'Bài viết blog',
  blog_comment: 'Bình luận blog',
  lesson_comment: 'Bình luận bài học',
  course: 'Khóa học',
  message: 'Tin nhắn',
}

const PRIORITY_STYLES: Record<ReportPriority, string> = {
  low: 'border-blue-500 text-blue-600',
  medium: 'border-yellow-500 text-yellow-600',
  high: 'border-orange-500 text-orange-600',
  critical: 'border-red-500 text-red-600',
}

const STATUS_ACTIONS: Record<string, Array<{ label: string; action: ReportAction; destructive?: boolean }>> = {
  message: [
    { label: 'Chấp nhận (giữ tin nhắn)', action: 'approve' },
    { label: 'Thu hồi tin nhắn', action: 'revoke' },
    { label: 'Xóa tin nhắn', action: 'delete', destructive: true },
  ],
  course: [
    { label: 'Chấp nhận (giữ khóa học)', action: 'approve' },
    { label: 'Ẩn khóa học', action: 'hide' },
    { label: 'Xóa khóa học', action: 'delete', destructive: true },
  ],
  default: [
    { label: 'Chấp nhận (giữ nội dung)', action: 'approve' },
    { label: 'Ẩn nội dung', action: 'hide' },
    { label: 'Xóa nội dung', action: 'delete', destructive: true },
  ],
}

function getResolveActions(targetType: ReportTargetType) {
  return STATUS_ACTIONS[targetType] ?? STATUS_ACTIONS.default
}

export function ReportManagementPage() {
  const { hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewing' | 'resolved' | 'dismissed'>('pending')
  const [cases, setCases] = useState<ReportCase[]>([])
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

  const openCaseDetail = async (reportCase: ReportCase) => {
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng case', value: cases.length, icon: Flag, color: 'text-muted-foreground' },
          { label: 'Critical', value: criticalCount, icon: AlertTriangle, color: 'text-red-500' },
          { label: 'High', value: highCount, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Tab hiện tại', value: activeTab, icon: CheckCircle, color: 'text-green-500' },
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
                <CardTitle>
                  {cases.length} nội dung bị báo cáo
                  {criticalCount > 0 && tab === 'pending' && (
                    <Badge variant="destructive" className="ml-2">{criticalCount} critical</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Đang tải...</p>
                ) : cases.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Không có báo cáo nào.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nội dung</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Người tạo</TableHead>
                        <TableHead className="text-center">Báo cáo</TableHead>
                        <TableHead>Lý do chính</TableHead>
                        <TableHead>Ưu tiên</TableHead>
                        <TableHead>Ngày gần nhất</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map(c => (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell onClick={() => openCaseDetail(c)}>
                            <div>
                              <p className="font-medium text-sm line-clamp-1">
                                {c.title ?? `#${c.target_id}`}
                              </p>
                              {c.snippet && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
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
                                  Xem chi tiết
                                </DropdownMenuItem>
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
                  <div className="flex flex-wrap gap-2">
                    {getResolveActions(selectedCase.target_type).map(opt => (
                      <Button
                        key={opt.action}
                        variant={opt.destructive ? 'destructive' : 'outline'}
                        size="sm"
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
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
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
