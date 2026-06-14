import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDown, ArrowUp, ArrowUpDown, Download, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from '../../components/Router'
import {
  exportAdminBulkReports,
  formatAdminCurrency,
  getAdminCourseAnalytics,
  getAdminDashboardStats,
  getAdminEarningPayoutMetrics,
  getAdminRefundAnalytics,
  getAdminRevenueByCategory,
  getAdminRevenueByCourse,
  getAdminRevenueByInstructor,
  getAdminRevenueMonthlyBreakdown,
  getAdminSubscriptionMetrics,
  getAdminUserAnalytics,
  type BulkReportKey,
  type CategoryRevenueRow,
  type CourseRevenueDetailRow,
  type EarningPayoutInstructorRow,
  type EarningPayoutMetrics,
  type InstructorRevenueRow,
  type RefundAnalytics,
  type RevenueBreakdown,
  type RevenueMonthlyEntry,
  type SubscriptionMetrics,
  type TopCourse,
  type UserTrend,
  getAdminRevenueBreakdown,
} from '../../services/admin.api'

type MainTab = 'revenue' | 'users' | 'courses' | 'subscription' | 'earningPayout' | 'refunds' | 'reviews'
type RevenueView = 'month' | 'quarter' | 'year' | 'instructor' | 'course' | 'category' | 'plan'
type DatePreset = '7d' | '30d' | 'this_month' | 'this_quarter' | 'this_year' | 'custom'
type SortDirection = 'asc' | 'desc' | null

interface Column<T> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  searchable?: boolean
  value: (row: T) => string | number | null | undefined
  render?: (row: T) => ReactNode
}

interface SortState {
  key: string | null
  direction: SortDirection
}

interface RevenuePeriodRow {
  date: string
  retail: number
  subscription: number
  gross: number
  refunded: number
  net: number
  transactions: number
}

const reportOptions: Array<{ key: BulkReportKey; label: string }> = [
  { key: 'revenue_monthly', label: 'Doanh thu theo tháng' },
  { key: 'revenue_quarterly', label: 'Doanh thu theo quý' },
  { key: 'revenue_yearly', label: 'Doanh thu theo năm' },
  { key: 'revenue_instructor', label: 'Doanh thu theo giảng viên' },
  { key: 'revenue_course', label: 'Doanh thu theo khóa học' },
  { key: 'revenue_category', label: 'Doanh thu theo danh mục' },
  { key: 'subscription_plan', label: 'Doanh thu theo gói đăng ký' },
  { key: 'subscription_metrics', label: 'Chỉ số gói đăng ký' },
  { key: 'earning_payout', label: 'Thu nhập/chi trả' },
  { key: 'refunds', label: 'Hoàn tiền' },
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfQuarter(date: Date) {
  const quarterStart = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarterStart, 1)
}

function dateRangeFromPreset(preset: DatePreset) {
  const now = new Date()
  const end = isoDate(now)
  if (preset === '7d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { dateFrom: isoDate(start), dateTo: end }
  }
  if (preset === '30d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    return { dateFrom: isoDate(start), dateTo: end }
  }
  if (preset === 'this_month') {
    return { dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: end }
  }
  if (preset === 'this_quarter') {
    return { dateFrom: isoDate(startOfQuarter(now)), dateTo: end }
  }
  return { dateFrom: isoDate(new Date(now.getFullYear(), 0, 1)), dateTo: end }
}

function monthsBetween(dateFrom: string, dateTo: string) {
  const start = new Date(`${dateFrom}T00:00:00`)
  const end = new Date(`${dateTo}T00:00:00`)
  return Math.max(1, Math.min(36, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1))
}

function groupRevenueRows(rows: RevenueMonthlyEntry[], period: 'month' | 'quarter' | 'year'): RevenuePeriodRow[] {
  const grouped = new Map<string, RevenuePeriodRow>()
  for (const row of rows) {
    const year = row.date.slice(0, 4)
    const month = Number(row.date.slice(5, 7))
    const key = period === 'quarter' ? `${year}-Q${Math.floor((month - 1) / 3) + 1}` : period === 'year' ? year : row.date
    const current = grouped.get(key) ?? { date: key, retail: 0, subscription: 0, gross: 0, refunded: 0, net: 0, transactions: 0 }
    current.retail += row.retail
    current.subscription += row.subscription
    current.gross += row.gross
    current.refunded += row.refunded
    current.net += row.net
    current.transactions += row.transactions ?? 0
    grouped.set(key, current)
  }
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function rowsToCsv(headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return '\ufeff' + [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n')
}

function rowsToExcelHtml(title: string, headers: string[], rows: Array<Array<string | number>>) {
  const cell = (value: string | number) => `<td>${String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`
  return `
    <html><head><meta charset="UTF-8"></head><body>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>
  `.trim().replace('<table>', `<table><caption>${title}</caption>`)
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined, direction: SortDirection) {
  const multiplier = direction === 'asc' ? 1 : -1
  const aNumber = typeof a === 'number' ? a : Number(a)
  const bNumber = typeof b === 'number' ? b : Number(b)
  if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) return (aNumber - bNumber) * multiplier
  return String(a ?? '').localeCompare(String(b ?? ''), 'vi') * multiplier
}

function getRefundStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Chờ duyệt',
    processing: 'Đang hoàn tiền',
    approved: 'Đã duyệt',
    success: 'Hoàn tiền thành công',
    rejected: 'Bị từ chối',
    failed: 'Hoàn tiền thất bại',
    cancelled: 'Đã hủy',
  }
  return labels[status] ?? status
}

function SortableDataTable<T>({
  columns,
  rows,
  loading,
  searchPlaceholder,
}: {
  columns: Array<Column<T>>
  rows: T[]
  loading: boolean
  searchPlaceholder?: string
}) {
  const [sort, setSort] = useState<SortState>({ key: null, direction: null })
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const searchableColumns = columns.filter((col) => col.searchable)

  const visibleRows = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    const filtered = normalized
      ? rows.filter((row) => searchableColumns.some((col) => String(col.value(row) ?? '').toLowerCase().includes(normalized)))
      : rows
    if (!sort.key || !sort.direction) return filtered
    const column = columns.find((col) => col.key === sort.key)
    if (!column) return filtered
    return [...filtered].sort((a, b) => compareValues(column.value(a), column.value(b), sort.direction))
  }, [columns, rows, search, searchableColumns, sort])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize))
  const pagedRows = visibleRows.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [search, pageSize, rows])

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: 'desc' }
      if (current.direction === 'desc') return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key: null, direction: null }
      return { key, direction: 'desc' }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchableColumns.length > 0 ? (
          <div className="relative sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder || 'Tìm kiếm...'} className="pl-9" />
          </div>
        ) : <div />}
        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 25, 50].map((size) => <SelectItem key={size} value={String(size)}>{size} dòng</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-[560px] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}>
                  {column.sortable ? (
                    <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      {sort.key !== column.key ? <ArrowUpDown className="h-3.5 w-3.5" /> : sort.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                    </button>
                  ) : column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">Đang tải dữ liệu...</TableCell></TableRow>
            ) : pagedRows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">Không có dữ liệu phù hợp.</TableCell></TableRow>
            ) : pagedRows.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}>
                    {column.render ? column.render(row) : column.value(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Hiển thị {pagedRows.length} / {visibleRows.length} dòng</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</Button>
          <span>Trang {page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Sau</Button>
        </div>
      </div>
    </div>
  )
}

function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function StatisticsPage() {
  const { canAccess } = useAuth()
  const { navigate } = useRouter()
  const [activeTab, setActiveTab] = useState<MainTab>('revenue')
  const [revenueView, setRevenueView] = useState<RevenueView>('month')
  const [preset, setPreset] = useState<DatePreset>('this_month')
  const initialRange = dateRangeFromPreset('this_month')
  const [draftRange, setDraftRange] = useState(initialRange)
  const [appliedRange, setAppliedRange] = useState(initialRange)
  const [loading, setLoading] = useState(true)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFormat, setBulkFormat] = useState<'csv' | 'excel'>('excel')
  const [selectedReports, setSelectedReports] = useState<BulkReportKey[]>(['revenue_monthly', 'revenue_instructor', 'revenue_course'])

  const [breakdown, setBreakdown] = useState<RevenueBreakdown | null>(null)
  const [monthly, setMonthly] = useState<RevenueMonthlyEntry[]>([])
  const [instructors, setInstructors] = useState<InstructorRevenueRow[]>([])
  const [courses, setCourses] = useState<CourseRevenueDetailRow[]>([])
  const [categories, setCategories] = useState<CategoryRevenueRow[]>([])
  const [subscription, setSubscription] = useState<SubscriptionMetrics | null>(null)
  const [earningPayout, setEarningPayout] = useState<EarningPayoutMetrics | null>(null)
  const [refunds, setRefunds] = useState<RefundAnalytics | null>(null)
  const [users, setUsers] = useState<UserTrend[]>([])
  const [courseStats, setCourseStats] = useState<TopCourse[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>(null)

  useEffect(() => {
    if (preset !== 'custom') setDraftRange(dateRangeFromPreset(preset))
  }, [preset])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const months = monthsBetween(appliedRange.dateFrom, appliedRange.dateTo)
        const [breakdownRes, monthlyRes, instructorRes, courseRes, categoryRes, subscriptionRes, earningPayoutRes, refundRes, userRes, courseStatsRes, dashboardRes] = await Promise.all([
          getAdminRevenueBreakdown(appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRevenueMonthlyBreakdown(months, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRevenueByInstructor(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRevenueByCourse(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRevenueByCategory(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminSubscriptionMetrics(appliedRange.dateFrom, appliedRange.dateTo),
          getAdminEarningPayoutMetrics(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRefundAnalytics(appliedRange.dateFrom, appliedRange.dateTo),
          getAdminUserAnalytics(months, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminCourseAnalytics(appliedRange.dateFrom, appliedRange.dateTo),
          getAdminDashboardStats(appliedRange.dateFrom, appliedRange.dateTo),
        ])
        if (cancelled) return
        setBreakdown(breakdownRes)
        setMonthly(monthlyRes)
        setInstructors(instructorRes)
        setCourses(courseRes)
        setCategories(categoryRes)
        setSubscription(subscriptionRes)
        setEarningPayout(earningPayoutRes)
        setRefunds(refundRes)
        setUsers(userRes)
        setCourseStats(courseStatsRes)
        setDashboardStats(dashboardRes)
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || 'Không thể tải thống kê')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [appliedRange])

  if (!canAccess(['admin'], ['admin.statistics.view'])) {
    return <div className="p-6">Bạn không có quyền xem thống kê.</div>
  }

  const periodRows = revenueView === 'quarter'
    ? groupRevenueRows(monthly, 'quarter')
    : revenueView === 'year'
      ? groupRevenueRows(monthly, 'year')
      : groupRevenueRows(monthly, 'month')

  const currentTable = getCurrentTable(activeTab, revenueView, {
    periodRows,
    instructors,
    courses,
    categories,
    subscription,
    earningPayout,
    refunds,
    users,
    courseStats,
  }, navigate)

  const currentRows = currentTable.rows.map((row: any) => currentTable.columns.map((column: Column<any>) => {
    const value = column.value(row)
    return typeof value === 'number' ? value : String(value ?? '')
  }))
  const currentHeaders = currentTable.columns.map((column) => column.label)

  const exportCurrent = (format: 'csv' | 'excel') => {
    if (format === 'csv') {
      downloadText(`${currentTable.filename}.csv`, rowsToCsv(currentHeaders, currentRows), 'text/csv;charset=utf-8')
      return
    }
    downloadText(`${currentTable.filename}.xls`, rowsToExcelHtml(currentTable.title, currentHeaders, currentRows), 'application/vnd.ms-excel;charset=utf-8')
  }

  const exportBulk = async () => {
    if (selectedReports.length === 0) {
      toast.error('Chọn ít nhất một báo cáo để xuất')
      return
    }
    await exportAdminBulkReports(selectedReports, bulkFormat, appliedRange.dateFrom, appliedRange.dateTo)
    setBulkOpen(false)
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Thống kê</h1>
          <p className="text-sm text-muted-foreground">Bảng dữ liệu là nguồn chính; biểu đồ chỉ hỗ trợ nhìn nhanh.</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Select value={preset} onValueChange={(value) => setPreset(value as DatePreset)}>
            <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 ngày</SelectItem>
              <SelectItem value="30d">30 ngày</SelectItem>
              <SelectItem value="this_month">Tháng này</SelectItem>
              <SelectItem value="this_quarter">Quý này</SelectItem>
              <SelectItem value="this_year">Năm nay</SelectItem>
              <SelectItem value="custom">Tùy chọn</SelectItem>
            </SelectContent>
          </Select>
          {preset === 'custom' && (
            <>
              <Input type="date" value={draftRange.dateFrom} onChange={(e) => setDraftRange((r) => ({ ...r, dateFrom: e.target.value }))} />
              <Input type="date" value={draftRange.dateTo} onChange={(e) => setDraftRange((r) => ({ ...r, dateTo: e.target.value }))} />
            </>
          )}
          <Button onClick={() => setAppliedRange(draftRange)} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Áp dụng
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Xuất dữ liệu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => exportCurrent('csv')}>Xuất bảng hiện tại CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCurrent('excel')}>Xuất bảng hiện tại Excel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setBulkOpen(true)}>Xuất nhiều báo cáo...</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MainTab)}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex h-auto min-h-10 w-max min-w-full justify-start rounded-lg p-1">
            <TabsTrigger className="h-8 min-w-32 flex-none px-4 lg:flex-1" value="revenue">Doanh thu</TabsTrigger>
            <TabsTrigger className="h-8 min-w-32 flex-none px-4 lg:flex-1" value="users">Người dùng</TabsTrigger>
            <TabsTrigger className="h-8 min-w-32 flex-none px-4 lg:flex-1" value="courses">Khóa học</TabsTrigger>
            <TabsTrigger className="h-8 min-w-32 flex-none px-4 lg:flex-1" value="subscription">Gói đăng ký</TabsTrigger>
            <TabsTrigger className="h-8 min-w-36 flex-none px-4 lg:flex-1" value="earningPayout">Thu nhập/chi trả</TabsTrigger>
            <TabsTrigger className="h-8 min-w-32 flex-none px-4 lg:flex-1" value="refunds">Hoàn tiền</TabsTrigger>
            <TabsTrigger className="h-8 min-w-32 flex-none px-4 lg:flex-1" value="reviews">Đánh giá</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="revenue" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Select value={revenueView} onValueChange={(value) => setRevenueView(value as RevenueView)}>
              <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Theo tháng</SelectItem>
                <SelectItem value="quarter">Theo quý</SelectItem>
                <SelectItem value="year">Theo năm</SelectItem>
                <SelectItem value="instructor">Theo giảng viên</SelectItem>
                <SelectItem value="course">Theo khóa học</SelectItem>
                <SelectItem value="category">Theo danh mục</SelectItem>
                <SelectItem value="plan">Theo gói đăng ký</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{appliedRange.dateFrom} - {appliedRange.dateTo}</Badge>
          </div>
          <KpiRow breakdown={breakdown} subscription={subscription} />
          <PrimaryTable table={currentTable} loading={loading} />
          <RevenueChart view={revenueView} periodRows={periodRows} instructors={instructors} categories={categories} subscription={subscription} />
        </TabsContent>

        {(['users', 'courses', 'subscription', 'earningPayout', 'refunds', 'reviews'] as MainTab[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <SecondaryKpis tab={tab} dashboardStats={dashboardStats} subscription={subscription} earningPayout={earningPayout} refunds={refunds} />
            <PrimaryTable table={getCurrentTable(tab, revenueView, { periodRows, instructors, courses, categories, subscription, earningPayout, refunds, users, courseStats }, navigate)} loading={loading} />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xuất nhiều báo cáo</DialogTitle>
            <DialogDescription>Chọn các báo cáo cần xuất theo mốc thời gian hiện tại.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {reportOptions.map((option) => (
              <label key={option.key} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                <Checkbox
                  checked={selectedReports.includes(option.key)}
                  onCheckedChange={(checked) => {
                    setSelectedReports((current) => checked
                      ? Array.from(new Set([...current, option.key]))
                      : current.filter((key) => key !== option.key))
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Định dạng</span>
            <Select value={bulkFormat} onValueChange={(value) => setBulkFormat(value as 'csv' | 'excel')}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV .zip</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Hủy</Button>
            <Button onClick={() => void exportBulk()}>Xuất các báo cáo đã chọn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KpiRow({ breakdown, subscription }: { breakdown: RevenueBreakdown | null; subscription: SubscriptionMetrics | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Metric title="Doanh thu gộp" value={formatAdminCurrency(breakdown?.total_gross ?? 0)} />
      <Metric title="Doanh thu ròng" value={formatAdminCurrency(breakdown?.net_revenue ?? 0)} />
      <Metric title="Đã hoàn tiền" value={formatAdminCurrency(breakdown?.total_refunded ?? 0)} />
      <Metric title="Giao dịch / đăng ký mới" value={`${(breakdown?.retail_count ?? 0) + (breakdown?.subscription_count ?? 0)} / ${subscription?.new_subscribers ?? 0}`} />
    </div>
  )
}

function SecondaryKpis({ tab, dashboardStats, subscription, earningPayout, refunds }: { tab: MainTab; dashboardStats: any; subscription: SubscriptionMetrics | null; earningPayout: EarningPayoutMetrics | null; refunds: RefundAnalytics | null }) {
  if (tab === 'subscription') {
    return <div className="grid gap-3 md:grid-cols-4"><Metric title="Doanh thu gói đăng ký" value={formatAdminCurrency(subscription?.total_revenue ?? 0)} /><Metric title="Người đăng ký mới" value={String(subscription?.new_subscribers ?? 0)} /><Metric title="Đang hoạt động" value={String(subscription?.active_subscribers ?? 0)} /><Metric title="Tỷ lệ rời bỏ" value={`${subscription?.churn_rate ?? 0}%`} /></div>
  }
  if (tab === 'earningPayout') {
    return <div className="grid gap-3 md:grid-cols-4"><Metric title="Thu nhập giảng viên" value={formatAdminCurrency(earningPayout?.total_instructor_earnings ?? 0)} /><Metric title="Cần chi trả" value={formatAdminCurrency(earningPayout?.payable_earnings ?? 0)} hint="Đang chờ + khả dụng" /><Metric title="Chi trả đã xử lý" value={formatAdminCurrency(earningPayout?.payout_processed_net ?? 0)} hint="Theo ngày xử lý" /><Metric title="Chi trả đang chờ" value={formatAdminCurrency(earningPayout?.payout_pending ?? 0)} hint="Theo ngày yêu cầu" /></div>
  }
  if (tab === 'refunds') {
    return <div className="grid gap-3 md:grid-cols-3"><Metric title="Yêu cầu hoàn tiền" value={String(refunds?.total_requests ?? 0)} /><Metric title="Tổng tiền hoàn" value={formatAdminCurrency(refunds?.total_refunded_amount ?? 0)} /><Metric title="Theo trạng thái" value={String(Object.keys(refunds?.breakdown ?? {}).length)} /></div>
  }
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Metric title="Người dùng" value={String(dashboardStats?.total_users ?? 0)} />
      <Metric title="Khóa học đã xuất bản" value={String(dashboardStats?.published_courses ?? 0)} />
      <Metric title="Ghi danh" value={String(dashboardStats?.total_enrollments ?? 0)} />
      <Metric title="Đánh giá trung bình" value={String(dashboardStats?.platform_rating ?? 0)} />
    </div>
  )
}

function PrimaryTable({ table, loading }: { table: ReturnType<typeof getCurrentTable>; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{table.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <SortableDataTable columns={table.columns as any} rows={table.rows as any[]} loading={loading} searchPlaceholder={table.searchPlaceholder} />
      </CardContent>
    </Card>
  )
}

function RevenueChart({ view, periodRows, instructors, categories, subscription }: { view: RevenueView; periodRows: RevenuePeriodRow[]; instructors: InstructorRevenueRow[]; categories: CategoryRevenueRow[]; subscription: SubscriptionMetrics | null }) {
  const data = view === 'instructor'
    ? instructors.slice(0, 8).map((row) => ({ name: row.instructor_name || `#${row.instructor_id}`, gross: row.gross, net: row.instructor_earnings }))
    : view === 'category'
      ? categories.slice(0, 8).map((row) => ({ name: row.category_name, gross: row.revenue, net: row.net_revenue }))
      : view === 'plan'
        ? (subscription?.per_plan ?? []).map((row) => ({ name: row.plan_name, gross: row.revenue, net: row.revenue }))
        : periodRows.map((row) => ({ name: row.date, gross: row.gross, retail: row.retail, subscription: row.subscription, refunded: row.refunded }))

  return (
    <Card>
      <CardHeader><CardTitle>Biểu đồ minh họa</CardTitle></CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} />
            <Tooltip formatter={(value) => formatAdminCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="gross" name="Doanh thu gộp" fill="#2563eb" />
            <Bar dataKey="net" name="Doanh thu thuần" fill="#16a34a" />
            {view === 'month' || view === 'quarter' || view === 'year' ? <Bar dataKey="refunded" name="Đã hoàn tiền" fill="#ef4444" /> : null}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function moneyColumn<T>(key: string, label: string, getter: (row: T) => number): Column<T> {
  return { key, label, align: 'right', sortable: true, value: getter, render: (row) => formatAdminCurrency(getter(row)) }
}

function numberColumn<T>(key: string, label: string, getter: (row: T) => number): Column<T> {
  return { key, label, align: 'right', sortable: true, value: getter }
}

function getCurrentTable(activeTab: MainTab, revenueView: RevenueView, data: any, navigate: (path: string) => void) {
  if (activeTab === 'revenue') {
    if (revenueView === 'instructor') {
      return {
        title: 'Doanh thu theo giảng viên',
        filename: 'revenue_by_instructor',
        searchPlaceholder: 'Tìm giảng viên...',
        rows: data.instructors as InstructorRevenueRow[],
        columns: [
          { key: 'instructor_name', label: 'Giảng viên', searchable: true, sortable: true, value: (r: InstructorRevenueRow) => r.instructor_name || `#${r.instructor_id}` },
          moneyColumn('gross', 'Doanh thu gộp', (r: InstructorRevenueRow) => r.gross),
          moneyColumn('instructor_earnings', 'Thu nhập giảng viên', (r: InstructorRevenueRow) => r.instructor_earnings),
          moneyColumn('platform_revenue', 'Doanh thu nền tảng', (r: InstructorRevenueRow) => r.platform_revenue),
          moneyColumn('retail_revenue', 'Bán lẻ', (r: InstructorRevenueRow) => r.retail_revenue),
          moneyColumn('subscription_revenue', 'Gói đăng ký', (r: InstructorRevenueRow) => r.subscription_revenue),
          moneyColumn('pending', 'Đang chờ', (r: InstructorRevenueRow) => r.pending),
          moneyColumn('paid', 'Đã thanh toán', (r: InstructorRevenueRow) => r.paid),
          numberColumn('transactions', 'Giao dịch', (r: InstructorRevenueRow) => r.transactions),
        ],
      }
    }
    if (revenueView === 'course') {
      return {
        title: 'Doanh thu theo khóa học',
        filename: 'revenue_by_course',
        searchPlaceholder: 'Tìm khóa học, giảng viên, danh mục...',
        rows: data.courses as CourseRevenueDetailRow[],
        columns: [
          { key: 'title', label: 'Khóa học', searchable: true, sortable: true, value: (r: CourseRevenueDetailRow) => r.title, render: (r: CourseRevenueDetailRow) => <button className="text-left font-medium text-primary hover:underline" onClick={() => navigate(`/admin/courses/${r.course_id}`)}>{r.title}</button> },
          { key: 'instructor_name', label: 'Giảng viên', searchable: true, sortable: true, value: (r: CourseRevenueDetailRow) => r.instructor_name || '' },
          { key: 'category_name', label: 'Danh mục', searchable: true, sortable: true, value: (r: CourseRevenueDetailRow) => r.category_name },
          moneyColumn('revenue', 'Doanh thu', (r: CourseRevenueDetailRow) => r.revenue),
          moneyColumn('refunded', 'Hoàn tiền', (r: CourseRevenueDetailRow) => r.refunded),
          moneyColumn('net_revenue', 'Doanh thu thuần', (r: CourseRevenueDetailRow) => r.net_revenue),
          numberColumn('transactions', 'Giao dịch', (r: CourseRevenueDetailRow) => r.transactions),
          numberColumn('enrollments', 'Ghi danh', (r: CourseRevenueDetailRow) => r.enrollments),
        ],
      }
    }
    if (revenueView === 'category') {
      return {
        title: 'Doanh thu theo danh mục',
        filename: 'revenue_by_category',
        searchPlaceholder: 'Tìm danh mục...',
        rows: data.categories as CategoryRevenueRow[],
        columns: [
          { key: 'category_name', label: 'Danh mục', searchable: true, sortable: true, value: (r: CategoryRevenueRow) => r.category_name },
          numberColumn('course_count', 'Số khóa học', (r: CategoryRevenueRow) => r.course_count),
          moneyColumn('revenue', 'Doanh thu gộp', (r: CategoryRevenueRow) => r.revenue),
          moneyColumn('refunded', 'Hoàn tiền', (r: CategoryRevenueRow) => r.refunded),
          moneyColumn('net_revenue', 'Doanh thu thuần', (r: CategoryRevenueRow) => r.net_revenue),
          numberColumn('transactions', 'Giao dịch', (r: CategoryRevenueRow) => r.transactions),
        ],
      }
    }
    if (revenueView === 'plan') return subscriptionTable(data.subscription)
    return periodRevenueTable(data.periodRows, revenueView)
  }
  if (activeTab === 'users') {
    return {
      title: 'Người dùng mới theo thời gian',
      filename: 'user_growth',
      rows: data.users as UserTrend[],
      columns: [
        { key: 'date', label: 'Thời gian', sortable: true, value: (r: UserTrend) => r.date },
        numberColumn('new_users', 'Người dùng mới', (r: UserTrend) => r.new_users),
      ],
    }
  }
  if (activeTab === 'courses') {
    return {
      title: 'Hiệu suất khóa học',
      filename: 'course_performance',
      searchPlaceholder: 'Tìm khóa học hoặc giảng viên...',
      rows: data.courseStats as TopCourse[],
      columns: [
        { key: 'title', label: 'Khóa học', searchable: true, sortable: true, value: (r: TopCourse) => r.title },
        { key: 'instructor_name', label: 'Giảng viên', searchable: true, sortable: true, value: (r: TopCourse) => r.instructor_name || '' },
        numberColumn('enrollment_count', 'Ghi danh', (r: TopCourse) => r.enrollment_count),
        moneyColumn('revenue', 'Doanh thu', (r: TopCourse) => r.revenue ?? 0),
        numberColumn('rating', 'Đánh giá', (r: TopCourse) => r.rating),
      ],
    }
  }
  if (activeTab === 'subscription') return subscriptionTable(data.subscription)
  if (activeTab === 'earningPayout') {
    return {
      title: 'Thu nhập và chi trả theo giảng viên',
      filename: 'earning_payout',
      searchPlaceholder: 'Tìm giảng viên...',
      rows: (data.earningPayout as EarningPayoutMetrics | null)?.per_instructor ?? [],
      columns: [
        { key: 'instructor_name', label: 'Giảng viên', searchable: true, sortable: true, value: (r: EarningPayoutInstructorRow) => r.instructor_name || `#${r.instructor_id}` },
        moneyColumn('gross', 'Thu nhập gộp', (r: EarningPayoutInstructorRow) => r.gross),
        moneyColumn('instructor_earnings', 'Thu nhập giảng viên', (r: EarningPayoutInstructorRow) => r.instructor_earnings),
        moneyColumn('retail_earnings', 'Thu nhập bán lẻ', (r: EarningPayoutInstructorRow) => r.retail_earnings),
        moneyColumn('subscription_earnings', 'Thu nhập từ gói đăng ký', (r: EarningPayoutInstructorRow) => r.subscription_earnings),
        moneyColumn('pending_earnings', 'Thu nhập chờ xử lý', (r: EarningPayoutInstructorRow) => r.pending_earnings),
        moneyColumn('available_earnings', 'Thu nhập khả dụng', (r: EarningPayoutInstructorRow) => r.available_earnings),
        moneyColumn('payable_earnings', 'Cần chi trả', (r: EarningPayoutInstructorRow) => r.payable_earnings),
        moneyColumn('paid_earnings', 'Thu nhập đã thanh toán', (r: EarningPayoutInstructorRow) => r.paid_earnings),
        moneyColumn('payout_requested', 'Yêu cầu chi trả', (r: EarningPayoutInstructorRow) => r.payout_requested),
        moneyColumn('payout_processed', 'Chi trả đã xử lý (gộp)', (r: EarningPayoutInstructorRow) => r.payout_processed),
        moneyColumn('payout_processed_net', 'Chi trả đã xử lý (thuần)', (r: EarningPayoutInstructorRow) => r.payout_processed_net),
        moneyColumn('payout_pending', 'Chi trả đang chờ', (r: EarningPayoutInstructorRow) => r.payout_pending),
        moneyColumn('settlement_gap', 'Chênh lệch đã trả - đã xử lý thuần', (r: EarningPayoutInstructorRow) => r.settlement_gap),
        numberColumn('earning_count', 'Số dòng thu nhập', (r: EarningPayoutInstructorRow) => r.earning_count),
        numberColumn('payout_count', 'Số dòng chi trả', (r: EarningPayoutInstructorRow) => r.payout_count),
        numberColumn('payout_processed_count', 'Số dòng đã xử lý', (r: EarningPayoutInstructorRow) => r.payout_processed_count),
      ],
    }
  }
  if (activeTab === 'refunds') {
    const rows = Object.entries((data.refunds as RefundAnalytics | null)?.breakdown ?? {}).map(([status, value]) => ({ status, ...value }))
    return {
      title: 'Hoàn tiền theo trạng thái',
      filename: 'refunds',
      rows,
      columns: [
        { key: 'status', label: 'Trạng thái', sortable: true, value: (r: any) => getRefundStatusLabel(r.status) },
        numberColumn('count', 'Số lượng', (r: any) => r.count),
        moneyColumn('amount', 'Số tiền', (r: any) => r.amount),
      ],
    }
  }
  return {
    title: 'Đánh giá theo khóa học',
    filename: 'reviews',
    searchPlaceholder: 'Tìm khóa học hoặc giảng viên...',
    rows: data.courseStats as TopCourse[],
    columns: [
      { key: 'title', label: 'Khóa học', searchable: true, sortable: true, value: (r: TopCourse) => r.title },
      { key: 'instructor_name', label: 'Giảng viên', searchable: true, sortable: true, value: (r: TopCourse) => r.instructor_name || '' },
      numberColumn('rating', 'Đánh giá', (r: TopCourse) => r.rating),
      numberColumn('enrollment_count', 'Ghi danh', (r: TopCourse) => r.enrollment_count),
    ],
  }
}

function periodRevenueTable(rows: RevenuePeriodRow[], view: RevenueView) {
  const label = view === 'quarter' ? 'Quý' : view === 'year' ? 'Năm' : 'Tháng'
  return {
    title: `Doanh thu theo ${label.toLowerCase()}`,
    filename: `revenue_by_${view}`,
    rows,
    columns: [
      { key: 'date', label, sortable: true, value: (r: RevenuePeriodRow) => r.date },
      moneyColumn('retail', 'Doanh thu bán lẻ', (r: RevenuePeriodRow) => r.retail),
      moneyColumn('subscription', 'Doanh thu gói đăng ký', (r: RevenuePeriodRow) => r.subscription),
      moneyColumn('gross', 'Doanh thu gộp', (r: RevenuePeriodRow) => r.gross),
      moneyColumn('refunded', 'Đã hoàn tiền', (r: RevenuePeriodRow) => r.refunded),
      moneyColumn('net', 'Doanh thu thuần', (r: RevenuePeriodRow) => r.net),
      numberColumn('transactions', 'Giao dịch', (r: RevenuePeriodRow) => r.transactions),
    ],
  }
}

function subscriptionTable(subscription: SubscriptionMetrics | null) {
  return {
    title: 'Doanh thu theo gói đăng ký',
    filename: 'subscription_by_plan',
    searchPlaceholder: 'Tìm gói đăng ký...',
    rows: subscription?.per_plan ?? [],
    columns: [
      { key: 'plan_name', label: 'Gói', searchable: true, sortable: true, value: (r: any) => r.plan_name },
      moneyColumn('revenue', 'Doanh thu', (r: any) => r.revenue),
      numberColumn('payments', 'Thanh toán', (r: any) => r.payments),
      numberColumn('new_subscribers', 'Người đăng ký mới', (r: any) => r.new_subscribers),
      numberColumn('active_subscribers', 'Đang hoạt động', (r: any) => r.active_subscribers),
      numberColumn('cancelled_subscribers', 'Hủy', (r: any) => r.cancelled_subscribers),
      numberColumn('expired_subscribers', 'Hết hạn', (r: any) => r.expired_subscribers),
      { key: 'churn_rate', label: 'Tỷ lệ rời bỏ', align: 'right', sortable: true, value: (r: any) => r.churn_rate, render: (r: any) => `${r.churn_rate}%` },
    ],
  }
}
