import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { useAuth } from '../../contexts/AuthContext'
import {
  getAdminSupportTickets,
  resolveSupportTicket,
  type SupportTicket,
  type SupportTicketType,
} from '../../services/support.api'

type ResolveAction = 'reject' | 'archive' | 'hide' | 'hard_block' | 'delete'

const RESOLVE_ACTIONS: { value: ResolveAction; label: string; desc: string; destructive?: boolean }[] = [
  { value: 'reject', label: 'Từ chối yêu cầu', desc: 'Không thực hiện gỡ; đóng ticket với lý do từ chối.' },
  { value: 'archive', label: 'Lưu trữ khóa học', desc: 'Ngừng bán, học viên cũ vẫn xem; khóa tương tác.' },
  { value: 'hide', label: 'Ẩn khỏi marketplace', desc: 'Ẩn khóa học khỏi marketplace (admin_hidden).' },
  { value: 'hard_block', label: 'Chặn cứng (đóng băng)', desc: 'Chặn truy cập toàn bộ — cân nhắc đền bù/hoàn tiền trước.', destructive: true },
  { value: 'delete', label: 'Xóa mềm', desc: 'Chỉ áp dụng nếu khóa học chưa có học viên/giao dịch; nếu có sẽ bị backend chặn.', destructive: true },
]

export function AdminSupportRequestsPage() {
  const { hasPermission } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<SupportTicketType>('course_deletion_request')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [action, setAction] = useState<ResolveAction>('archive')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAdminSupportTickets({
        ticket_type: typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page_size: 100,
      })
      setTickets(res.results)
    } catch {
      toast.error('Không thể tải danh sách yêu cầu hỗ trợ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter])

  const handleResolve = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await resolveSupportTicket(selected.id, { action, notes })
      toast.success('Đã xử lý yêu cầu.')
      setSelected(null)
      setNotes('')
      setAction('archive')
      void load()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xử lý yêu cầu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!hasPermission('admin.reports.manage')) {
    return (
      <div className="container mx-auto p-6 text-center py-12">
        <h2 className="text-2xl mb-4">Không có quyền truy cập</h2>
        <p className="text-muted-foreground">Bạn không có quyền xử lý yêu cầu hỗ trợ.</p>
      </div>
    )
  }

  const selectedAction = RESOLVE_ACTIONS.find(a => a.value === action)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Yêu cầu hỗ trợ</h1>
        <p className="text-muted-foreground">Thẩm định yêu cầu gỡ/xóa khóa học và các ticket khác.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as SupportTicketType)}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="course_deletion_request">Yêu cầu gỡ/xóa khóa học</SelectItem>
            <SelectItem value="copyright">Bản quyền</SelectItem>
            <SelectItem value="refund">Hoàn tiền</SelectItem>
            <SelectItem value="general">Hỗ trợ chung</SelectItem>
            <SelectItem value="other">Khác</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'open' | 'resolved')}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="open">Đang mở</SelectItem>
            <SelectItem value="resolved">Đã xử lý</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>{tickets.length} yêu cầu</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Khóa học</TableHead>
                <TableHead>Người gửi</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map(ticket => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.id}</TableCell>
                  <TableCell>{ticket.course_title || '—'}</TableCell>
                  <TableCell>{ticket.name || ticket.email}</TableCell>
                  <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                  <TableCell><Badge variant={ticket.status === 'resolved' ? 'secondary' : 'outline'}>{ticket.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelected(ticket)}>Xem / Xử lý</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && tickets.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Không có yêu cầu nào.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Yêu cầu #{selected?.id}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Khóa học:</span> {selected.course_title || '—'}</div>
                <div><span className="text-muted-foreground">Người gửi:</span> {selected.name || selected.email}</div>
                <div><span className="text-muted-foreground">Tiêu đề:</span> {selected.subject}</div>
                <div><span className="text-muted-foreground">Nội dung:</span> {selected.message}</div>
                {selected.resolution?.decision && (
                  <div><span className="text-muted-foreground">Đã xử lý:</span> {selected.resolution.decision}</div>
                )}
              </div>

              {selected.status !== 'resolved' ? (
                <div className="space-y-3 rounded-md border p-4">
                  <p className="text-sm font-semibold">Quyết định xử lý</p>
                  <Select value={action} onValueChange={(v) => setAction(v as ResolveAction)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOLVE_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedAction?.desc && (
                    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{selectedAction.desc}</p>
                  )}
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ghi chú quyết định (tuỳ chọn)..." />
                  <Button variant={selectedAction?.destructive ? 'destructive' : 'default'} disabled={submitting} onClick={() => void handleResolve()}>
                    {submitting ? 'Đang xử lý...' : 'Xác nhận xử lý'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Yêu cầu này đã được xử lý.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
