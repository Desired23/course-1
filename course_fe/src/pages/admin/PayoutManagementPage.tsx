import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { DollarSign, Download, RefreshCw, Play } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { UserPagination } from '../../components/UserPagination'
import { exportInstructorPayouts } from '../../services/admin.api'
import {
  getInstructorPayoutsPage,
  runMonthlyPayouts,
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
  // Admin payout management (automatic periodic payouts, view-only history)
  const [managedPayouts, setManagedPayouts] = useState<InstructorPayout[]>([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [payoutFilterStatus, setPayoutFilterStatus] = useState<PayoutStatus | ''>('')
  const [payoutFilterInstructorId, setPayoutFilterInstructorId] = useState('')
  const [payoutsMgmtPage, setPayoutsMgmtPage] = useState(1)
  const [payoutsMgmtTotalPages, setPayoutsMgmtTotalPages] = useState(1)
  const [isRunningPayouts, setIsRunningPayouts] = useState(false)

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

  const handleRunPayouts = async () => {
    setIsRunningPayouts(true)
    try {
      const res = await runMonthlyPayouts()
      toast.success(`Đã chạy đợt chi trả: tạo ${res.payouts_created} payout`)
      setPayoutsMgmtPage(1)
      await loadManagedPayouts()
    } catch (err: any) {
      toast.error(err?.message || 'Chạy đợt chi trả thất bại')
    } finally {
      setIsRunningPayouts(false)
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-2">Chi trả giảng viên</h1>
          <p className="text-muted-foreground">Hệ thống tự động chi trả định kỳ cho giảng viên. Theo dõi lịch sử và xuất dữ liệu payout tại đây.</p>
        </div>
        <Button className="gap-2" disabled={isRunningPayouts} onClick={() => void handleRunPayouts()}>
          <Play className="h-4 w-4" /> {isRunningPayouts ? 'Đang chạy...' : 'Chạy payout ngay'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Lịch sử chi trả
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
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Ngày xử lý</TableHead>
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
                  <TableCell>{p.processed_date ? new Date(p.processed_date).toLocaleDateString() : '-'}</TableCell>
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

    </motion.div>
  )
}
