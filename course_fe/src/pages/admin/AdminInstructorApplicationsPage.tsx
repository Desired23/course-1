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
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
        toast.error(err?.message || t('admin_instructor_applications.toasts.load_failed'))
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
      toast.error(err?.message || t('admin_instructor_applications.toasts.detail_failed'))
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
      toast.error(t('admin_instructor_applications.toasts.rejection_reason_required'))
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
      toast.success(t('admin_instructor_applications.toasts.update_success'))
    } catch (err: any) {
      toast.error(err?.message || t('admin_instructor_applications.toasts.update_failed'))
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
        <h1 className="text-2xl font-semibold">{t('admin_instructor_applications.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin_instructor_applications.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin_instructor_applications.search_placeholder')} />
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v as any) }}>
            <SelectTrigger><SelectValue placeholder={t('admin_instructor_applications.status_placeholder')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin_instructor_applications.filters.all')}</SelectItem>
              <SelectItem value="pending">{t('admin_instructor_applications.filters.pending')}</SelectItem>
              <SelectItem value="approved">{t('admin_instructor_applications.filters.approved')}</SelectItem>
              <SelectItem value="rejected">{t('admin_instructor_applications.filters.rejected')}</SelectItem>
              <SelectItem value="changes_requested">{t('admin_instructor_applications.filters.changes_requested')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground flex items-center">{t('admin_instructor_applications.total', { count })}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <span>{t('admin_instructor_applications.pending_count', { count: statusCounts.pending })}</span>
            <span>{t('admin_instructor_applications.approved_count', { count: statusCounts.approved })}</span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="min-h-[180px] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t('admin_instructor_applications.empty')}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.user_full_name || t('admin_instructor_applications.user_fallback', { id: item.user })}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.user_email}</p>
                  <p className="text-xs text-muted-foreground">{t('admin_instructor_applications.submitted_at', { date: new Date(item.submitted_at).toLocaleString('vi-VN') })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getApplicationStatusLabel(item.status)}</Badge>
                  <Button variant="outline" size="sm" onClick={() => openDetail(item)}>{t('admin_instructor_applications.actions.details')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">{t('admin_instructor_applications.pagination', { page, totalPages })}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('admin_instructor_applications.actions.previous_page')}</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t('admin_instructor_applications.actions.next_page')}</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin_instructor_applications.detail.title')}</DialogTitle>
            <DialogDescription>{t('admin_instructor_applications.detail.description')}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>{t('admin_instructor_applications.detail.user')}</strong> {selected.user_full_name || selected.user_email || selected.user}</p>
                <p><strong>{t('admin_instructor_applications.detail.status')}</strong> {getApplicationStatusLabel(selected.status)}</p>
                <p><strong>{t('admin_instructor_applications.detail.submitted_at')}</strong> {new Date(selected.submitted_at).toLocaleString('vi-VN')}</p>
                {selected.reviewed_at && <p><strong>{t('admin_instructor_applications.detail.reviewed_at')}</strong> {new Date(selected.reviewed_at).toLocaleString('vi-VN')}</p>}
                {selected.admin_notes && <p><strong>{t('admin_instructor_applications.detail.admin_notes')}</strong> {selected.admin_notes}</p>}
                {selected.rejection_reason && <p className="text-red-600"><strong>{t('admin_instructor_applications.detail.rejection_reason')}</strong> {selected.rejection_reason}</p>}
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">{t('admin_instructor_applications.detail.responses')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {selected.responses.map((resp) => (
                    <div key={resp.id} className="rounded border p-3">
                      <p className="text-sm font-medium">{resp.question_detail?.label || t('admin_instructor_applications.question_fallback', { id: resp.id })}</p>
                      <p className="text-xs text-muted-foreground mb-2">{t('admin_instructor_applications.detail.response_type', { type: resp.question_detail?.type || t('admin_instructor_applications.unknown') })}</p>
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
                              {t('admin_instructor_applications.actions.open_file')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFile(resp.value)}
                            >
                              <Download className="h-3.5 w-3.5 mr-2" />
                              {t('admin_instructor_applications.actions.download')}
                            </Button>
                          </div>
                          <a href={resp.value} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all block">
                            {resp.value}
                          </a>
                          {getFileType(resp.value) === 'image' && (
                            <div className="rounded border p-2 bg-muted/30">
                              <p className="text-xs mb-2 flex items-center gap-1 text-muted-foreground">
                                <FileImage className="h-3.5 w-3.5" /> {t('admin_instructor_applications.preview_image')}
                              </p>
                              <img
                                src={resp.value}
                                alt={resp.question_detail?.label || t('admin_instructor_applications.uploaded_file')}
                                className="max-h-72 w-auto rounded object-contain"
                              />
                            </div>
                          )}
                          {getFileType(resp.value) === 'pdf' && (
                            <div className="rounded border p-2 bg-muted/30">
                              <p className="text-xs mb-2 flex items-center gap-1 text-muted-foreground">
                                <FileText className="h-3.5 w-3.5" /> {t('admin_instructor_applications.preview_pdf')}
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
            <Button variant="outline" onClick={() => setShowDetail(false)}>{t('common.close')}</Button>
            {selected && (selected.status === 'pending' || selected.status === 'changes_requested') && (
              <>
                <Button variant="outline" onClick={() => openReview('request_changes')}>{t('admin_instructor_applications.actions.request_changes')}</Button>
                <Button variant="destructive" onClick={() => openReview('reject')}>{t('admin_instructor_applications.actions.reject')}</Button>
                <Button onClick={() => openReview('approve')}>{t('admin_instructor_applications.actions.approve')}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin_instructor_applications.review.title')}</DialogTitle>
            <DialogDescription>
              {t('admin_instructor_applications.review.action', { action: reviewAction === 'approve' ? t('admin_instructor_applications.actions.approve') : reviewAction === 'reject' ? t('admin_instructor_applications.actions.reject') : t('admin_instructor_applications.actions.request_changes') })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('admin_instructor_applications.review.admin_notes')}</Label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
            </div>
            {reviewAction === 'reject' && (
              <div>
                <Label>{t('admin_instructor_applications.review.rejection_reason')}</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)} disabled={submitting}>{t('common.cancel')}</Button>
            <Button onClick={submitReview} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
