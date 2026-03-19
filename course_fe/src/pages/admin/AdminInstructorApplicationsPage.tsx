import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import {
  getAdminApplicationDetail,
  getAdminApplications,
  getApplicationStatusLabel,
  reviewApplication,
  type Application,
  type ApplicationListItem,
  type ApplicationStatus,
} from '../../services/application.api'
import { toast } from 'sonner'
import { Download, ExternalLink, FileImage, FileText, Loader2 } from 'lucide-react'

function getFileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/').filter(Boolean)
    return parts[parts.length - 1] || 'download'
  } catch {
    return 'download'
  }
}

function getFileType(url: string): 'image' | 'pdf' | 'other' {
  const lower = url.toLowerCase()
  if (lower.endsWith('.pdf') || lower.includes('/pdf/')) return 'pdf'
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(lower) || lower.includes('/image/')) return 'image'
  return 'other'
}

export function AdminInstructorApplicationsPage() {
  const [items, setItems] = useState<ApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [count, setCount] = useState(0)

  const [selected, setSelected] = useState<Application | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes'>('approve')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadList = async () => {
      setLoading(true)
      try {
        const res = await getAdminApplications({ page, page_size: 10, status: statusFilter })
        if (cancelled) return
        let data = res.results
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          data = data.filter((it) => (it.user_full_name || '').toLowerCase().includes(q) || (it.user_email || '').toLowerCase().includes(q))
        }
        setItems(data)
        setTotalPages(res.total_pages || 1)
        setCount(res.count || 0)
      } catch (err: any) {
        toast.error(err?.message || 'Không thể tải danh sách đơn đăng ký')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadList()
    return () => {
      cancelled = true
    }
  }, [page, statusFilter, search])

  const openDetail = async (item: ApplicationListItem) => {
    try {
      const detail = await getAdminApplicationDetail(item.id)
      setSelected(detail)
      setShowDetail(true)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải chi tiết hồ sơ')
    }
  }

  const openReview = (action: 'approve' | 'reject' | 'request_changes') => {
    setReviewAction(action)
    setAdminNotes('')
    setRejectionReason('')
    setShowReview(true)
  }

  const submitReview = async () => {
    if (!selected) return
    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }

    setSubmitting(true)
    try {
      const updated = await reviewApplication(selected.id, {
        action: reviewAction,
        admin_notes: adminNotes.trim() || undefined,
        rejection_reason: reviewAction === 'reject' ? rejectionReason.trim() : undefined,
      })
      setSelected(updated)
      setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, status: updated.status, reviewed_at: updated.reviewed_at } : it)))
      setShowReview(false)
      toast.success('Đã cập nhật trạng thái hồ sơ')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xử lý hồ sơ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadFile = (url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.download = getFileNameFromUrl(url)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const statusCounts = useMemo(() => ({
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    changes_requested: items.filter((i) => i.status === 'changes_requested').length,
  }), [items])

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Quản lý đăng ký giảng viên</h1>
        <p className="text-sm text-muted-foreground">Duyệt hồ sơ instructor application theo dữ liệu thật từ backend.</p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên/email" />
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v as any) }}>
            <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Đang chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="rejected">Bị từ chối</SelectItem>
              <SelectItem value="changes_requested">Cần chỉnh sửa</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground flex items-center">Tổng: {count}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <span>Pending: {statusCounts.pending}</span>
            <span>Approved: {statusCounts.approved}</span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="min-h-[180px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Không có hồ sơ phù hợp.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.user_full_name || `User #${item.user}`}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.user_email}</p>
                  <p className="text-xs text-muted-foreground">Nộp lúc: {new Date(item.submitted_at).toLocaleString('vi-VN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getApplicationStatusLabel(item.status)}</Badge>
                  <Button variant="outline" size="sm" onClick={() => openDetail(item)}>Chi tiết</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Trang {page}/{totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trang trước</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Trang sau</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hồ sơ</DialogTitle>
            <DialogDescription>Thông tin câu trả lời theo form đăng ký từ backend.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>Người dùng:</strong> {selected.user_full_name || selected.user_email || selected.user}</p>
                <p><strong>Trạng thái:</strong> {getApplicationStatusLabel(selected.status)}</p>
                <p><strong>Nộp lúc:</strong> {new Date(selected.submitted_at).toLocaleString('vi-VN')}</p>
                {selected.reviewed_at && <p><strong>Duyệt lúc:</strong> {new Date(selected.reviewed_at).toLocaleString('vi-VN')}</p>}
                {selected.admin_notes && <p><strong>Ghi chú admin:</strong> {selected.admin_notes}</p>}
                {selected.rejection_reason && <p className="text-red-600"><strong>Lý do từ chối:</strong> {selected.rejection_reason}</p>}
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Câu trả lời</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {selected.responses.map((resp) => (
                    <div key={resp.id} className="rounded border p-3">
                      <p className="text-sm font-medium">{resp.question_detail?.label || `Question #${resp.id}`}</p>
                      <p className="text-xs text-muted-foreground mb-2">Loại: {resp.question_detail?.type || 'unknown'}</p>
                      {typeof resp.value === 'string' && resp.value.startsWith('http') ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(resp.value, '_blank', 'noopener,noreferrer')}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              Mở file
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFile(resp.value)}
                            >
                              <Download className="h-3.5 w-3.5 mr-2" />
                              Tải xuống
                            </Button>
                          </div>
                          <a href={resp.value} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all block">
                            {resp.value}
                          </a>
                          {getFileType(resp.value) === 'image' && (
                            <div className="rounded border p-2 bg-muted/30">
                              <p className="text-xs mb-2 flex items-center gap-1 text-muted-foreground">
                                <FileImage className="h-3.5 w-3.5" /> Preview ảnh
                              </p>
                              <img
                                src={resp.value}
                                alt={resp.question_detail?.label || 'Uploaded file'}
                                className="max-h-72 w-auto rounded object-contain"
                              />
                            </div>
                          )}
                          {getFileType(resp.value) === 'pdf' && (
                            <div className="rounded border p-2 bg-muted/30">
                              <p className="text-xs mb-2 flex items-center gap-1 text-muted-foreground">
                                <FileText className="h-3.5 w-3.5" /> Preview PDF
                              </p>
                              <iframe
                                src={resp.value}
                                title={`pdf-preview-${resp.id}`}
                                className="w-full h-80 rounded border bg-white"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs whitespace-pre-wrap break-all">{typeof resp.value === 'string' ? resp.value : JSON.stringify(resp.value, null, 2)}</pre>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>Đóng</Button>
            {selected && (selected.status === 'pending' || selected.status === 'changes_requested') && (
              <>
                <Button variant="outline" onClick={() => openReview('request_changes')}>Yêu cầu chỉnh sửa</Button>
                <Button variant="destructive" onClick={() => openReview('reject')}>Từ chối</Button>
                <Button onClick={() => openReview('approve')}>Duyệt</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý hồ sơ</DialogTitle>
            <DialogDescription>
              Hành động: {reviewAction === 'approve' ? 'Duyệt' : reviewAction === 'reject' ? 'Từ chối' : 'Yêu cầu chỉnh sửa'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ghi chú admin</Label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
            </div>
            {reviewAction === 'reject' && (
              <div>
                <Label>Lý do từ chối *</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)} disabled={submitting}>Hủy</Button>
            <Button onClick={submitReview} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
