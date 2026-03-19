import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { UserPagination } from '../../components/UserPagination'
import { DollarSign, Calendar, ShoppingCart, Layers, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getMyInstructorProfile, getInstructorDashboardStats, type InstructorDashboardStats } from '../../services/instructor.api'
import {
  getInstructorEarningsSummary,
  getInstructorEarnings,
  parseEarningAmount,
  formatEarningVND,
  getEarningStatusBadge,
  type EarningsSummary,
  type InstructorEarning,
} from '../../services/instructor-earnings.api'

const TRANSACTIONS_PER_PAGE = 10
const COURSES_PER_PAGE = 6

export function InstructorEarningsPage() {
  const { user, canAccess } = useAuth()

  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [dashStats, setDashStats] = useState<InstructorDashboardStats | null>(null)
  const [instructorId, setInstructorId] = useState<number | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [coursesPage, setCoursesPage] = useState(1)

  const [transactions, setTransactions] = useState<InstructorEarning[]>([])
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1)
  const [transactionsTotalCount, setTransactionsTotalCount] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const profile = await getMyInstructorProfile(Number(user.id))
        if (cancelled) return
        setInstructorId(profile.id)

        const [sumRes, statsRes] = await Promise.allSettled([
          getInstructorEarningsSummary(profile.id),
          getInstructorDashboardStats(),
        ])

        if (cancelled) return
        if (sumRes.status === 'fulfilled') setSummary(sumRes.value)
        if (statsRes.status === 'fulfilled') setDashStats(statsRes.value)

        if (sumRes.status === 'rejected' && statsRes.status === 'rejected') {
          setError('Khong the tai du lieu thu nhap.')
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Loi khi tai du lieu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    setTransactionsPage(1)
  }, [statusFilter, sourceFilter])

  useEffect(() => {
    if (!instructorId) return
    let cancelled = false
    async function loadTransactions() {
      try {
        setTransactionsLoading(true)
        const res = await getInstructorEarnings({
          instructor_id: instructorId,
          page: transactionsPage,
          page_size: TRANSACTIONS_PER_PAGE,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          source: sourceFilter !== 'all' ? sourceFilter : undefined,
        })
        if (cancelled) return
        setTransactions(res.results || [])
        setTransactionsTotalPages(res.total_pages || 1)
        setTransactionsTotalCount(res.count || 0)
      } catch (err) {
        if (!cancelled) console.error('Failed to load earnings transactions:', err)
      } finally {
        if (!cancelled) setTransactionsLoading(false)
      }
    }
    loadTransactions()
    return () => { cancelled = true }
  }, [instructorId, transactionsPage, statusFilter, sourceFilter])

  if (!canAccess(['instructor'], ['instructor.earnings.view'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Ban khong co quyen xem du lieu thu nhap.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Dang tai du lieu thu nhap...</p>
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

  const totalAmount = summary ? parseEarningAmount(summary.total.total_amount) : 0
  const totalNet = summary ? parseEarningAmount(summary.total.total_net_amount) : 0
  const retailAmount = summary ? parseEarningAmount(summary.retail.total_net_amount) : 0
  const subAmount = summary ? parseEarningAmount(summary.subscription.total_net_amount) : 0
  const retailPct = totalNet > 0 ? Math.round((retailAmount / totalNet) * 100) : 0
  const subPct = totalNet > 0 ? Math.round((subAmount / totalNet) * 100) : 0

  const courseStats = dashStats?.course_stats ?? []
  const courseTotalPages = Math.max(1, Math.ceil(courseStats.length / COURSES_PER_PAGE))
  const paginatedCourses = courseStats.slice((coursesPage - 1) * COURSES_PER_PAGE, coursesPage * COURSES_PER_PAGE)

  const transactionStart = transactionsTotalCount === 0 ? 0 : (transactionsPage - 1) * TRANSACTIONS_PER_PAGE + 1
  const transactionEnd = Math.min(transactionsPage * TRANSACTIONS_PER_PAGE, transactionsTotalCount)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Thu nhap</h1>
        <p className="text-muted-foreground">Theo doi doanh thu va chi tiet thu nhap tu cac khoa hoc</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{formatEarningVND(totalNet)}</p><p className="text-sm text-muted-foreground">Tong thu nhap rong</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Calendar className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{formatEarningVND(totalAmount)}</p><p className="text-sm text-muted-foreground">Tong doanh thu gop</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><ShoppingCart className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">{summary?.retail.count ?? 0}</p><p className="text-sm text-muted-foreground">Ban le</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Layers className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{summary?.subscription.count ?? 0}</p><p className="text-sm text-muted-foreground">Goi dang ky</p></div></div></CardContent></Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Tong quan</TabsTrigger>
          <TabsTrigger value="courses">Theo khoa hoc</TabsTrigger>
          <TabsTrigger value="transactions">Giao dich</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Nguon thu nhap</CardTitle><CardDescription>Phan bo ban le vs goi dang ky</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div><div className="flex justify-between mb-1"><span>Ban le</span><span className="font-medium">{formatEarningVND(retailAmount)} ({retailPct}%)</span></div><Progress value={retailPct} className="h-2" /></div>
                <div><div className="flex justify-between mb-1"><span>Dang ky</span><span className="font-medium">{formatEarningVND(subAmount)} ({subPct}%)</span></div><Progress value={subPct} className="h-2" /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-8">
          {courseStats.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Chua co du lieu thu nhap theo khoa hoc.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {paginatedCourses.map((cs) => (
                <Card key={cs.course_id}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">{cs.title}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div><p className="text-xl font-bold text-green-600">{formatEarningVND(parseFloat(String(cs.earnings || 0)))}</p><p className="text-xs text-muted-foreground">Thu nhap</p></div>
                      <div><p className="text-xl font-bold">{cs.total_students}</p><p className="text-xs text-muted-foreground">Hoc vien</p></div>
                      <div><p className="text-xl font-bold">{cs.new_students_this_month}</p><p className="text-xs text-muted-foreground">Moi thang nay</p></div>
                      <div><p className="text-xl font-bold">{cs.rating?.toFixed(1) ?? '-'}</p><p className="text-xs text-muted-foreground">Danh gia</p></div>
                      <div><p className="text-xl font-bold">{cs.completion_rate != null ? `${Math.round(cs.completion_rate)}%` : '-'}</p><p className="text-xs text-muted-foreground">Hoan thanh</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <UserPagination currentPage={coursesPage} totalPages={courseTotalPages} onPageChange={setCoursesPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Lich su giao dich</CardTitle>
                  <CardDescription>Chi tiet tung khoan thu nhap</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Trang thai" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tat ca</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Nguon" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tat ca</SelectItem>
                      <SelectItem value="retail">Ban le</SelectItem>
                      <SelectItem value="subscription">Dang ky</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Khong co giao dich nao.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngay</TableHead>
                      <TableHead>Khoa hoc</TableHead>
                      <TableHead>Nguon</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">Thu nhap rong</TableHead>
                      <TableHead>Trang thai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{new Date(e.earning_date).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{e.course_title ?? '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{e.earning_source === 'retail' ? 'Ban le' : 'Dang ky'}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{formatEarningVND(parseEarningAmount(e.amount))}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatEarningVND(parseEarningAmount(e.net_amount))}</TableCell>
                        <TableCell><Badge variant={getEarningStatusBadge(e.status)} className="capitalize">{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {transactionsTotalCount > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    Showing {transactionStart}-{transactionEnd} of {transactionsTotalCount} transactions
                  </div>
                  <UserPagination currentPage={transactionsPage} totalPages={transactionsTotalPages} onPageChange={setTransactionsPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
