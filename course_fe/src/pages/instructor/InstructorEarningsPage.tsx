import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import {
  DollarSign, Calendar, ShoppingCart, Layers, Loader2, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getMyInstructorProfile } from '../../services/instructor.api'
import { getInstructorDashboardStats, type InstructorDashboardStats } from '../../services/instructor.api'
import {
  getInstructorEarningsSummary,
  getAllInstructorEarnings,
  parseEarningAmount,
  formatEarningVND,
  getEarningStatusBadge,
  type EarningsSummary,
  type InstructorEarning,
} from '../../services/instructor-earnings.api'

export function InstructorEarningsPage() {
  const { user, canAccess } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [earnings, setEarnings] = useState<InstructorEarning[]>([])
  const [dashStats, setDashStats] = useState<InstructorDashboardStats | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState('overview')

  /* ── load data ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // resolve instructor model id
        const profile = await getMyInstructorProfile(Number(user!.id))
        const instructorId = profile.id

        const [sumRes, earnRes, statsRes] = await Promise.allSettled([
          getInstructorEarningsSummary(instructorId),
          getAllInstructorEarnings({ instructor_id: instructorId }),
          getInstructorDashboardStats(),
        ])

        if (cancelled) return

        if (sumRes.status === 'fulfilled') setSummary(sumRes.value)
        if (earnRes.status === 'fulfilled') setEarnings(earnRes.value)
        if (statsRes.status === 'fulfilled') setDashStats(statsRes.value)

        if (sumRes.status === 'rejected' && earnRes.status === 'rejected') {
          setError('Không thể tải dữ liệu thu nhập.')
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Lỗi khi tải dữ liệu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  /* ── derived values ────────────────────────────────────────── */
  const totalAmount = summary ? parseEarningAmount(summary.total.total_amount) : 0
  const totalNet = summary ? parseEarningAmount(summary.total.total_net_amount) : 0
  const retailAmount = summary ? parseEarningAmount(summary.retail.total_net_amount) : 0
  const subAmount = summary ? parseEarningAmount(summary.subscription.total_net_amount) : 0
  const retailPct = totalNet > 0 ? Math.round((retailAmount / totalNet) * 100) : 0
  const subPct = totalNet > 0 ? Math.round((subAmount / totalNet) * 100) : 0

  const filteredEarnings = useMemo(() => {
    let list = [...earnings]
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter)
    if (sourceFilter !== 'all') list = list.filter((e) => e.earning_source === sourceFilter)
    // sort newest first
    list.sort((a, b) => new Date(b.earning_date).getTime() - new Date(a.earning_date).getTime())
    return list
  }, [earnings, statusFilter, sourceFilter])

  const courseStats = dashStats?.course_stats ?? []

  /* ── guards ────────────────────────────────────────────────── */
  if (!canAccess(['instructor'], ['instructor.earnings.view'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Bạn không có quyền xem dữ liệu thu nhập.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Đang tải dữ liệu thu nhập...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Thu nhập</h1>
        <p className="text-muted-foreground">Theo dõi doanh thu và chi tiết thu nhập từ các khóa học</p>
      </div>

      {/* ── Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatEarningVND(totalNet)}</p>
                <p className="text-sm text-muted-foreground">Tổng thu nhập ròng</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{formatEarningVND(totalAmount)}</p>
                <p className="text-sm text-muted-foreground">Tổng doanh thu gộp</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{summary?.retail.count ?? 0}</p>
                <p className="text-sm text-muted-foreground">Bán lẻ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Layers className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{summary?.subscription.count ?? 0}</p>
                <p className="text-sm text-muted-foreground">Gói đăng ký</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="courses">Theo khóa học</TabsTrigger>
          <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
        </TabsList>

        {/* ─── Overview ──────────────────────────────────── */}
        <TabsContent value="overview" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Nguồn thu nhập</CardTitle>
                <CardDescription>Phân bổ bán lẻ vs gói đăng ký</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Bán lẻ (Retail)</span>
                    <span className="font-medium">{formatEarningVND(retailAmount)} ({retailPct}%)</span>
                  </div>
                  <Progress value={retailPct} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Gói đăng ký (Subscription)</span>
                    <span className="font-medium">{formatEarningVND(subAmount)} ({subPct}%)</span>
                  </div>
                  <Progress value={subPct} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Status breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái thu nhập</CardTitle>
                <CardDescription>Phân loại theo trạng thái xử lý</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary && ['retail', 'subscription'].map((src) => {
                    const source = src === 'retail' ? summary.retail : summary.subscription
                    return (
                      <div key={src}>
                        <p className="font-medium capitalize mb-2">{src === 'retail' ? 'Bán lẻ' : 'Gói đăng ký'}</p>
                        <div className="grid grid-cols-2 gap-2 ml-2">
                          {Object.entries(source.by_status).map(([status, data]) => (
                            <div key={`${src}-${status}`} className="flex justify-between text-sm border rounded-md px-3 py-2">
                              <Badge variant={getEarningStatusBadge(status)} className="capitalize">{status}</Badge>
                              <span className="font-mono">{data.count} — {formatEarningVND(parseEarningAmount(data.net_amount))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {!summary && <p className="text-muted-foreground text-sm">Không có dữ liệu tổng hợp.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Summary numbers */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tổng hợp số liệu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
                    <p className="text-2xl font-bold">{summary?.total.count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Doanh thu gộp</p>
                    <p className="text-2xl font-bold">{formatEarningVND(totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Thu nhập ròng</p>
                    <p className="text-2xl font-bold text-green-600">{formatEarningVND(totalNet)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phí nền tảng</p>
                    <p className="text-2xl font-bold text-red-500">{formatEarningVND(totalAmount - totalNet)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── By Course ─────────────────────────────────── */}
        <TabsContent value="courses" className="mt-8">
          {courseStats.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Chưa có dữ liệu thu nhập theo khóa học.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {courseStats.map((cs) => (
                <Card key={cs.course_id}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">{cs.title}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div>
                        <p className="text-xl font-bold text-green-600">
                          {formatEarningVND(parseFloat(String(cs.earnings || 0)))}
                        </p>
                        <p className="text-xs text-muted-foreground">Thu nhập</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{cs.total_students}</p>
                        <p className="text-xs text-muted-foreground">Học viên</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{cs.new_students_this_month}</p>
                        <p className="text-xs text-muted-foreground">Mới tháng này</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{cs.rating?.toFixed(1) ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">Đánh giá</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{cs.completion_rate != null ? `${Math.round(cs.completion_rate)}%` : '—'}</p>
                        <p className="text-xs text-muted-foreground">Hoàn thành</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Transactions ──────────────────────────────── */}
        <TabsContent value="transactions" className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Lịch sử giao dịch</CardTitle>
                  <CardDescription>Chi tiết từng khoản thu nhập</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Nguồn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="retail">Bán lẻ</SelectItem>
                      <SelectItem value="subscription">Đăng ký</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEarnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Không có giao dịch nào.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Khóa học</TableHead>
                      <TableHead>Nguồn</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">Thu nhập ròng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEarnings.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(e.earning_date).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {e.course_title ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {e.earning_source === 'retail' ? 'Bán lẻ' : 'Đăng ký'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatEarningVND(parseEarningAmount(e.amount))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {formatEarningVND(parseEarningAmount(e.net_amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEarningStatusBadge(e.status)} className="capitalize">
                            {e.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}