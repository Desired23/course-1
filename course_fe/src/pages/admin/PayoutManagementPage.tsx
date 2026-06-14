import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import AutoApproveToggle from '../../components/admin/AutoApproveToggle'
import { DollarSign, Download, RefreshCw, Check, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { UserPagination } from '../../components/UserPagination'
import { exportInstructorPayouts } from '../../services/admin.api'
import {
  getInstructorPayoutsPage,
  approvePayout,
  rejectPayout,
  formatPayoutAmount,
  getPayoutStatusLabel,
  getPayoutStatusColor,
} from '../../services/instructor-payouts.api'
import type { InstructorPayout, PayoutStatus } from '../../services/instructor-payouts.api'

const ITEMS_PER_PAGE = 10

export function PayoutManagementPage() {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()

  const [payoutExportDateFrom, setPayoutExportDateFrom] = useState('')
  const [payoutExportDateTo, setPayoutExportDateTo] = useState('')
  const [payoutExportStatus, setPayoutExportStatus] = useState('')
  const [payoutExportInstructorId, setPayoutExportInstructorId] = useState('')
  const [isPayoutExporting, setIsPayoutExporting] = useState(false)
  // Admin payout management (request approval flow)
  const [managedPayouts, setManagedPayouts] = useState<InstructorPayout[]>([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [payoutFilterStatus, setPayoutFilterStatus] = useState<PayoutStatus | ''>('pending')
  const [payoutFilterInstructorId, setPayoutFilterInstructorId] = useState('')
  const [payoutsMgmtPage, setPayoutsMgmtPage] = useState(1)
  const [payoutsMgmtTotalPages, setPayoutsMgmtTotalPages] = useState(1)
  const [approveTarget, setApproveTarget] = useState<InstructorPayout | null>(null)
  const [approveTxnId, setApproveTxnId] = useState('')
  const [approveFee, setApproveFee] = useState('')
  const [approveNotes, setApproveNotes] = useState('')
  const [rejectTarget, setRejectTarget] = useState<InstructorPayout | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [payoutActionSubmitting, setPayoutActionSubmitting] = useState(false)

  const loadManagedPayouts = useCallback(async () => {
    setPayoutsLoading(true)
    try {
      const res = await getInstructorPayoutsPage({
        status: payoutFilterStatus || undefined,
        instructor_id: payoutFilterInstructorId ? Number(payoutFilterInstructorId) : undefined,
        page: payoutsMgmtPage,
        page_size: ITEMS_PER_PAGE,
      })
      setManagedPayouts(res.results || [])
      setPayoutsMgmtTotalPages(res.total_pages || 1)
    } catch {
      setManagedPayouts([])
      setPayoutsMgmtTotalPages(1)
    } finally {
      setPayoutsLoading(false)
    }
  }, [payoutFilterStatus, payoutFilterInstructorId, payoutsMgmtPage])

  useEffect(() => {
    void loadManagedPayouts()
  }, [loadManagedPayouts])

  const submitApprovePayout = async () => {
    if (!approveTarget) return
    setPayoutActionSubmitting(true)
    try {
      await approvePayout(approveTarget.id, {
        transaction_id: approveTxnId.trim() || undefined,
        fee: approveFee ? Number(approveFee) : 0,
        notes: approveNotes.trim() || undefined,
      })
      toast.success(`Đã duyệt payout #${approveTarget.id}`)
      setApproveTarget(null)
      setApproveTxnId(''); setApproveFee(''); setApproveNotes('')
      await loadManagedPayouts()
    } catch (err: any) {
      toast.error(err?.message || 'Duyệt payout thất bại')
    } finally {
      setPayoutActionSubmitting(false)
    }
  }

  const submitRejectPayout = async () => {
    if (!rejectTarget) return
    setPayoutActionSubmitting(true)
    try {
      await rejectPayout(rejectTarget.id, { notes: rejectNotes.trim() || undefined })
      toast.success(`Đã từ chối payout #${rejectTarget.id}`)
      setRejectTarget(null)
      setRejectNotes('')
      await loadManagedPayouts()
    } catch (err: any) {
      toast.error(err?.message || 'Từ chối payout thất bại')
    } finally {
      setPayoutActionSubmitting(false)
    }
  }

  if (!hasPermission('admin.payments.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('payment_management.no_access_title')}</h2>
          <p className="text-muted-foreground">{t('payment_management.no_access_description')}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-6 space-y-6 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div>
        <h1 className="text-3xl mb-2">Rút tiền giảng viên</h1>
        <p className="text-muted-foreground">Duyệt yêu cầu rút tiền và xuất dữ liệu payout của giảng viên.</p>
      </div>

      <div className="max-w-sm">
        <AutoApproveToggle
          settingKey="auto_approve_payout"
          label={t('auto_approve.payout.label')}
          description={t('auto_approve.payout.description')}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Duyệt yêu cầu rút tiền
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select
                value={payoutFilterStatus || 'all'}
                onValueChange={(v) => { setPayoutsMgmtPage(1); setPayoutFilterStatus(v === 'all' ? '' : v as PayoutStatus) }}
              >
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="processed">Đã xử lý</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Instructor ID (tùy chọn)</label>
              <Input
                type="number"
                placeholder="Để trống = tất cả"
                value={payoutFilterInstructorId}
                onChange={(e) => { setPayoutsMgmtPage(1); setPayoutFilterInstructorId(e.target.value) }}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="gap-2" disabled={payoutsLoading} onClick={() => void loadManagedPayouts()}>
                <RefreshCw className="h-4 w-4" /> Làm mới
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Phương thức</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày yêu cầu</TableHead>
                <TableHead className="w-[160px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutsLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Đang tải...</TableCell></TableRow>
              ) : managedPayouts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Không có payout</TableCell></TableRow>
              ) : managedPayouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">#{p.id}</TableCell>
                  <TableCell>{p.instructor}</TableCell>
                  <TableCell className="font-semibold">{formatPayoutAmount(p.amount)}</TableCell>
                  <TableCell><Badge variant="outline">{p.payment_method || '-'}</Badge></TableCell>
                  <TableCell><Badge className={getPayoutStatusColor(p.status)}>{getPayoutStatusLabel(p.status)}</Badge></TableCell>
                  <TableCell>{new Date(p.request_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {p.status === 'pending' ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => { setApproveTarget(p); setApproveTxnId(''); setApproveFee(''); setApproveNotes('') }}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(p); setRejectNotes('') }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{p.transaction_id || '-'}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <UserPagination currentPage={payoutsMgmtPage} totalPages={payoutsMgmtTotalPages} onPageChange={setPayoutsMgmtPage} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Xuất dữ liệu Instructor Payout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Instructor ID (tùy chọn)</label>
              <Input
                type="number"
                placeholder="Để trống = tất cả"
                value={payoutExportInstructorId}
                onChange={(e) => setPayoutExportInstructorId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Từ ngày</label>
              <Input
                type="date"
                value={payoutExportDateFrom}
                onChange={(e) => setPayoutExportDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Đến ngày</label>
              <Input
                type="date"
                value={payoutExportDateTo}
                onChange={(e) => setPayoutExportDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={payoutExportStatus || 'all'} onValueChange={(v) => setPayoutExportStatus(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSED">Processed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              disabled={isPayoutExporting}
              onClick={async () => {
                try {
                  setIsPayoutExporting(true)
                  await exportInstructorPayouts('csv', {
                    instructorId: payoutExportInstructorId ? Number(payoutExportInstructorId) : undefined,
                    dateFrom: payoutExportDateFrom || undefined,
                    dateTo: payoutExportDateTo || undefined,
                    status: payoutExportStatus || undefined,
                  })
                } catch {
                  toast.error(t('payment_management.export_failed', 'Xuất dữ liệu thất bại'))
                } finally {
                  setIsPayoutExporting(false)
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              disabled={isPayoutExporting}
              onClick={async () => {
                try {
                  setIsPayoutExporting(true)
                  await exportInstructorPayouts('excel', {
                    instructorId: payoutExportInstructorId ? Number(payoutExportInstructorId) : undefined,
                    dateFrom: payoutExportDateFrom || undefined,
                    dateTo: payoutExportDateTo || undefined,
                    status: payoutExportStatus || undefined,
                  })
                } catch {
                  toast.error(t('payment_management.export_failed', 'Xuất dữ liệu thất bại'))
                } finally {
                  setIsPayoutExporting(false)
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duyệt payout #{approveTarget?.id}</DialogTitle>
            <DialogDescription>
              Số tiền: {approveTarget ? formatPayoutAmount(approveTarget.amount) : ''}. Nhập mã giao dịch sau khi đã chuyển khoản.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Mã giao dịch</Label>
              <Input value={approveTxnId} onChange={(e) => setApproveTxnId(e.target.value)} placeholder="VD: FT24..." />
            </div>
            <div className="space-y-1">
              <Label>Phí (VND)</Label>
              <Input type="number" min={0} value={approveFee} onChange={(e) => setApproveFee(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Textarea value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveTarget(null)}>Hủy</Button>
              <Button disabled={payoutActionSubmitting} onClick={() => void submitApprovePayout()}>Duyệt</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối payout #{rejectTarget?.id}</DialogTitle>
            <DialogDescription>Số dư sẽ được hoàn lại cho giảng viên.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Lý do</Label>
              <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Lý do từ chối" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Hủy</Button>
              <Button variant="destructive" disabled={payoutActionSubmitting} onClick={() => void submitRejectPayout()}>Từ chối</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
