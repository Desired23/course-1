import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DatePicker, Segmented, Select as AntSelect, Space } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { Download, RefreshCw, Search } from 'lucide-react'
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
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useAuth } from '../../contexts/AuthContext'
import {
  exportAdminBulkReports,
  formatAdminCurrency,
  getAdminBestSellingCourses,
  getAdminCreationStats,
  getAdminDashboardStats,
  getAdminEarningPayoutMetrics,
  getAdminPromotionStats,
  getAdminRefundAnalytics,
  getAdminRevenueByCourse,
  getAdminRevenueByInstructor,
  getAdminRevenueBreakdown,
  getAdminRevenueMonthlyBreakdown,
  type AdminDashboardStats,
  type BestSellingCourseRow,
  type BulkReportKey,
  type CourseRevenueDetailRow,
  type CreationStatsRow,
  type EarningPayoutMetrics,
  type InstructorRevenueRow,
  type PromotionStatsRow,
  type RefundAnalytics,
  type RevenueBreakdown,
  type RevenueMonthlyEntry,
} from '../../services/admin.api'
import { getReportStatistics, type ReportStats } from '../../services/report.api'

type MainTab = 'overview' | 'revenue' | 'courses' | 'instructors' | 'refunds' | 'promotions' | 'reports' | 'creation'
type DatePreset = 'all' | '7d' | '30d' | 'this_month' | 'this_quarter' | 'this_year' | 'custom'
type GroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year'

interface DateRange {
  dateFrom?: string
  dateTo?: string
}

const { RangePicker } = DatePicker

interface Column<T> {
  label: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
  exportValue: (row: T) => string | number
  searchValue?: (row: T) => string
}

interface TableModel<T> {
  title: string
  columns: Array<Column<T>>
  rows: T[]
}

interface RefundRow {
  status: string
  label: string
  count: number
  amount: number
}

interface ReportTrendRow {
  period: string
  count: number
}

const emptyMessage = 'Không có dữ liệu trong khoảng thời gian này'

const reportOptions: Array<{ key: BulkReportKey; label: string }> = [
  { key: 'realized_revenue', label: 'Doanh thu tạm tính/thực' },
  { key: 'revenue_monthly', label: 'Doanh thu theo tháng' },
  { key: 'revenue_quarterly', label: 'Doanh thu theo quý' },
  { key: 'revenue_yearly', label: 'Doanh thu theo năm' },
  { key: 'revenue_instructor', label: 'Doanh thu theo giảng viên' },
  { key: 'revenue_course', label: 'Doanh thu theo khóa học' },
  { key: 'earning_payout', label: 'Thu nhập/chi trả nâng cao' },
  { key: 'refunds', label: 'Hoàn tiền' },
  { key: 'promotion_stats', label: 'Mã giảm giá' },
  { key: 'creation_stats', label: 'Tạo mới' },
  { key: 'best_selling_courses', label: 'Bán chạy' },
]

const presetOptions: Array<{ label: string; value: DatePreset }> = [
  { label: 'Tháng này', value: 'this_month' },
  { label: '7 ngày', value: '7d' },
  { label: '30 ngày', value: '30d' },
  { label: 'Quý này', value: 'this_quarter' },
  { label: 'Năm nay', value: 'this_year' },
  { label: 'Toàn bộ', value: 'all' },
  { label: 'Tùy chỉnh', value: 'custom' },
]

const groupByOptions: Array<{ label: string; value: GroupBy }> = [
  { label: 'Ngày', value: 'day' },
  { label: 'Tuần', value: 'week' },
  { label: 'Tháng', value: 'month' },
  { label: 'Quý', value: 'quarter' },
  { label: 'Năm', value: 'year' },
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfQuarter(date: Date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}

function dateRangeFromPreset(preset: DatePreset): DateRange {
  if (preset === 'all') return {}
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
  if (preset === 'this_year') {
    return { dateFrom: isoDate(new Date(now.getFullYear(), 0, 1)), dateTo: end }
  }
  return {}
}

function rangeToPickerValue(range: DateRange): [Dayjs, Dayjs] | null {
  if (!range.dateFrom || !range.dateTo) return null
  return [dayjs(range.dateFrom), dayjs(range.dateTo)]
}

function monthsBetween(range: DateRange) {
  if (!range.dateFrom || !range.dateTo) return 36
  const start = new Date(`${range.dateFrom}T00:00:00`)
  const end = new Date(`${range.dateTo}T00:00:00`)
  return Math.max(1, Math.min(36, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1))
}

function rangeLabel(range: DateRange) {
  if (!range.dateFrom && !range.dateTo) return 'Toàn bộ dữ liệu'
  if (range.dateFrom && range.dateTo) return `${range.dateFrom} đến ${range.dateTo}`
  if (range.dateFrom) return `Từ ${range.dateFrom}`
  return `Đến ${range.dateTo}`
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
      <table><caption>${title}</caption>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>
  `.trim()
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

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase()
  const variant = normalized === 'active' || normalized === 'success' || normalized === 'resolved'
    ? 'default'
    : normalized === 'pending' || normalized === 'processing' || normalized === 'reviewing'
      ? 'secondary'
      : 'outline'
  return <Badge variant={variant}>{status}</Badge>
}

function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-xl font-semibold tracking-normal">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function DataTable<T>({ model, loading }: { model: TableModel<T>; loading: boolean }) {
  const [search, setSearch] = useState('')
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return model.rows
    return model.rows.filter((row) =>
      model.columns.some((column) => (column.searchValue?.(row) ?? String(column.exportValue(row))).toLowerCase().includes(needle)),
    )
  }, [model, search])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">{model.title}</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong bảng" className="pl-9" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {model.columns.map((column) => (
                  <TableHead key={column.label} className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={model.columns.length} className="h-24 text-center text-muted-foreground">
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={model.columns.length} className="h-24 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row, index) => (
                  <TableRow key={index}>
                    {model.columns.map((column) => (
                      <TableCell key={column.label} className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function moneyColumn<T>(label: string, getter: (row: T) => number): Column<T> {
  return {
    label,
    align: 'right',
    render: (row) => formatAdminCurrency(getter(row)),
    exportValue: getter,
  }
}

function numberColumn<T>(label: string, getter: (row: T) => number | string): Column<T> {
  return {
    label,
    align: 'right',
    render: (row) => getter(row),
    exportValue: getter,
  }
}

function buildRevenueTable(rows: RevenueMonthlyEntry[]): TableModel<RevenueMonthlyEntry> {
  return {
    title: 'Doanh thu theo thời gian',
    rows,
    columns: [
      { label: 'Thời gian', render: (row) => row.date, exportValue: (row) => row.date, searchValue: (row) => row.date },
      moneyColumn('Doanh thu tạm tính', (row) => row.estimated_revenue ?? row.net ?? 0),
      moneyColumn('Doanh thu thực', (row) => row.realized_revenue ?? 0),
      moneyColumn('Hoàn tiền', (row) => row.refunded_amount ?? row.refunded ?? 0),
      numberColumn('Giao dịch', (row) => row.transaction_count ?? row.transactions ?? 0),
      numberColumn('Tỷ lệ hoàn tiền', (row) => `${row.refund_rate ?? 0}%`),
    ],
  }
}

function buildCourseTable(rows: CourseRevenueDetailRow[]): TableModel<CourseRevenueDetailRow> {
  return {
    title: 'Chỉ số theo khóa học',
    rows,
    columns: [
      { label: 'Khóa học', render: (row) => row.title, exportValue: (row) => row.title, searchValue: (row) => row.title },
      { label: 'Giảng viên', render: (row) => row.instructor_name || '-', exportValue: (row) => row.instructor_name || '-', searchValue: (row) => row.instructor_name || '' },
      moneyColumn('Bán lẻ', (row) => row.retail_revenue ?? row.revenue ?? 0),
      moneyColumn('Gói đăng ký', (row) => row.subscription_revenue ?? 0),
      moneyColumn('Doanh thu thực', (row) => row.realized_revenue ?? row.net_revenue ?? 0),
      numberColumn('Ghi danh', (row) => row.enrollment_count ?? row.enrollments ?? 0),
    ],
  }
}

function buildInstructorTable(rows: InstructorRevenueRow[]): TableModel<InstructorRevenueRow> {
  return {
    title: 'Doanh thu theo giảng viên',
    rows,
    columns: [
      { label: 'Giảng viên', render: (row) => row.instructor_name || '-', exportValue: (row) => row.instructor_name || '-', searchValue: (row) => row.instructor_name || '' },
      moneyColumn('Tổng thu nhập', (row) => row.instructor_earnings ?? 0),
      moneyColumn('Cần chi trả', (row) => (row.pending ?? 0) + (row.available ?? 0)),
      moneyColumn('Đã chi trả', (row) => row.paid ?? 0),
      numberColumn('Giao dịch', (row) => row.transactions ?? 0),
    ],
  }
}

function buildRefundTable(rows: RefundRow[]): TableModel<RefundRow> {
  return {
    title: 'Hoàn tiền theo trạng thái',
    rows,
    columns: [
      { label: 'Trạng thái', render: (row) => getRefundStatusLabel(row.status), exportValue: (row) => row.label, searchValue: (row) => row.label },
      numberColumn('Số lượng', (row) => row.count),
      moneyColumn('Số tiền', (row) => row.amount),
    ],
  }
}

function buildPromotionTable(rows: PromotionStatsRow[]): TableModel<PromotionStatsRow> {
  return {
    title: 'Mã giảm giá',
    rows,
    columns: [
      { label: 'Mã', render: (row) => row.code, exportValue: (row) => row.code, searchValue: (row) => row.code },
      numberColumn('Lượt dùng', (row) => row.used_count),
      moneyColumn('Tổng giảm', (row) => row.discount_amount ?? row.total_discount ?? 0),
      moneyColumn('Doanh thu sau giảm', (row) => row.revenue_after_discount ?? 0),
      { label: 'Trạng thái', align: 'center', render: (row) => getStatusBadge(row.status), exportValue: (row) => row.status, searchValue: (row) => row.status },
    ],
  }
}

function buildCreationTable(rows: CreationStatsRow[]): TableModel<CreationStatsRow> {
  return {
    title: 'Tạo mới theo thời gian',
    rows,
    columns: [
      { label: 'Thời gian', render: (row) => row.period, exportValue: (row) => row.period, searchValue: (row) => row.period },
      numberColumn('User mới', (row) => row.new_users),
      numberColumn('Giảng viên mới', (row) => row.new_instructors),
      numberColumn('Đơn hàng mới', (row) => row.new_orders),
      numberColumn('Refund mới', (row) => row.new_refunds),
      numberColumn('Payout mới', (row) => row.new_payouts),
    ],
  }
}

function buildReportTable(rows: ReportTrendRow[]): TableModel<ReportTrendRow> {
  return {
    title: 'Báo cáo theo thời gian',
    rows,
    columns: [
      { label: 'Thời gian', render: (row) => row.period, exportValue: (row) => row.period, searchValue: (row) => row.period },
      numberColumn('Báo cáo', (row) => row.count),
    ],
  }
}

function buildBestSellingTable(rows: BestSellingCourseRow[]): TableModel<BestSellingCourseRow> {
  return {
    title: 'Khóa học bán chạy',
    rows,
    columns: [
      { label: 'Khóa học', render: (row) => row.title, exportValue: (row) => row.title, searchValue: (row) => row.title },
      { label: 'Giảng viên', render: (row) => row.instructor_name || '-', exportValue: (row) => row.instructor_name || '-', searchValue: (row) => row.instructor_name || '' },
      numberColumn('Ghi danh trả phí', (row) => row.enrollment_count),
      moneyColumn('Doanh thu', (row) => row.revenue),
      moneyColumn('Hoàn tiền', (row) => row.refunded),
      numberColumn('Rating', (row) => row.rating.toFixed(1)),
    ],
  }
}

function exportTable<T>(model: TableModel<T>, format: 'csv' | 'excel') {
  const headers = model.columns.map((column) => column.label)
  const rows = model.rows.map((row) => model.columns.map((column) => column.exportValue(row)))
  if (format === 'excel') {
    downloadText('statistics_current_table.xls', rowsToExcelHtml(model.title, headers, rows), 'application/vnd.ms-excel;charset=utf-8')
    return
  }
  downloadText('statistics_current_table.csv', rowsToCsv(headers, rows), 'text/csv;charset=utf-8')
}

export function StatisticsPage() {
  const { canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState<MainTab>('overview')
  const [preset, setPreset] = useState<DatePreset>('this_month')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const initialRange = dateRangeFromPreset('this_month')
  const [draftRange, setDraftRange] = useState<DateRange>(initialRange)
  const [appliedRange, setAppliedRange] = useState<DateRange>(initialRange)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFormat, setBulkFormat] = useState<'csv' | 'excel'>('excel')
  const [selectedReports, setSelectedReports] = useState<BulkReportKey[]>([
    'realized_revenue',
    'revenue_course',
    'revenue_instructor',
    'refunds',
    'promotion_stats',
    'creation_stats',
    'best_selling_courses',
  ])

  const [breakdown, setBreakdown] = useState<RevenueBreakdown | null>(null)
  const [dashboard, setDashboard] = useState<AdminDashboardStats | null>(null)
  const [revenueRows, setRevenueRows] = useState<RevenueMonthlyEntry[]>([])
  const [courses, setCourses] = useState<CourseRevenueDetailRow[]>([])
  const [instructors, setInstructors] = useState<InstructorRevenueRow[]>([])
  const [earningPayout, setEarningPayout] = useState<EarningPayoutMetrics | null>(null)
  const [refunds, setRefunds] = useState<RefundAnalytics | null>(null)
  const [promotions, setPromotions] = useState<PromotionStatsRow[]>([])
  const [creationRows, setCreationRows] = useState<CreationStatsRow[]>([])
  const [bestSelling, setBestSelling] = useState<BestSellingCourseRow[]>([])
  const [reportStats, setReportStats] = useState<ReportStats | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const months = monthsBetween(appliedRange)
        const reportGroupBy = groupBy === 'day' || groupBy === 'week' ? groupBy : 'month'
        const [
          breakdownRes,
          dashboardRes,
          revenueRes,
          courseRes,
          instructorRes,
          earningPayoutRes,
          refundRes,
          promotionRes,
          creationRes,
          bestSellingRes,
          reportStatsRes,
        ] = await Promise.all([
          getAdminRevenueBreakdown(appliedRange.dateFrom, appliedRange.dateTo),
          getAdminDashboardStats(appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRevenueMonthlyBreakdown(months, appliedRange.dateFrom, appliedRange.dateTo, groupBy),
          getAdminRevenueByCourse(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRevenueByInstructor(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminEarningPayoutMetrics(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminRefundAnalytics(appliedRange.dateFrom, appliedRange.dateTo),
          getAdminPromotionStats(100, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminCreationStats(groupBy, appliedRange.dateFrom, appliedRange.dateTo),
          getAdminBestSellingCourses(20, appliedRange.dateFrom, appliedRange.dateTo),
          getReportStatistics({
            date_from: appliedRange.dateFrom,
            date_to: appliedRange.dateTo,
            group_by: reportGroupBy,
          }),
        ])
        if (cancelled) return
        setBreakdown(breakdownRes)
        setDashboard(dashboardRes)
        setRevenueRows(revenueRes)
        setCourses(courseRes)
        setInstructors(instructorRes)
        setEarningPayout(earningPayoutRes)
        setRefunds(refundRes)
        setPromotions(promotionRes)
        setCreationRows(creationRes)
        setBestSelling(bestSellingRes)
        setReportStats(reportStatsRes)
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || 'Không thể tải thống kê')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [appliedRange, groupBy, refreshKey])

  if (!canAccess(['admin'], ['admin.statistics.view'])) {
    return <div className="p-6">Bạn không có quyền xem thống kê.</div>
  }

  const refundRows: RefundRow[] = Object.entries(refunds?.breakdown ?? {}).map(([status, row]) => ({
    status,
    label: getRefundStatusLabel(status),
    count: row.count,
    amount: row.amount,
  }))

  const reportTrendRows: ReportTrendRow[] = (reportStats?.trend ?? []).map((row) => ({
    period: row.period || 'Không rõ',
    count: row.count,
  }))

  const tables = {
    overview: buildBestSellingTable(bestSelling),
    revenue: buildRevenueTable(revenueRows),
    courses: buildCourseTable(courses),
    instructors: buildInstructorTable(instructors),
    refunds: buildRefundTable(refundRows),
    promotions: buildPromotionTable(promotions),
    reports: buildReportTable(reportTrendRows),
    creation: buildCreationTable(creationRows),
  } satisfies Record<MainTab, TableModel<any>>

  const currentTable = tables[activeTab]
  const paidOut = earningPayout?.payout_processed_net ?? instructors.reduce((sum, row) => sum + (row.paid ?? 0), 0)
  const payable = earningPayout?.payable_earnings ?? instructors.reduce((sum, row) => sum + (row.pending ?? 0) + (row.available ?? 0), 0)

  function handlePresetChange(value: DatePreset) {
    setPreset(value)
    if (value === 'custom') {
      setDraftRange(appliedRange)
      return
    }
    const nextRange = dateRangeFromPreset(value)
    setDraftRange(nextRange)
    setAppliedRange(nextRange)
  }

  function applyRange() {
    setAppliedRange(preset === 'custom' ? draftRange : dateRangeFromPreset(preset))
  }

  async function exportBulk() {
    if (selectedReports.length === 0) {
      toast.error('Chọn ít nhất một báo cáo')
      return
    }
    try {
      await exportAdminBulkReports(selectedReports, bulkFormat, appliedRange.dateFrom, appliedRange.dateTo)
      toast.success('Đã tạo file export')
      setBulkOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể export')
    }
  }

  function toggleReport(key: BulkReportKey, checked: boolean) {
    setSelectedReports((current) => checked ? Array.from(new Set([...current, key])) : current.filter((item) => item !== key))
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Thống kê</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel(appliedRange)}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="max-w-full overflow-x-auto pb-1 lg:pb-0">
              <Segmented<DatePreset>
                value={preset}
                options={presetOptions}
                onChange={handlePresetChange}
                className="whitespace-nowrap"
              />
            </div>

            <Space wrap size={[8, 8]} className="min-w-0">
              <span className="text-xs font-medium text-muted-foreground">Nhóm</span>
              <AntSelect<GroupBy>
                value={groupBy}
                options={groupByOptions}
                onChange={setGroupBy}
                style={{ width: 104 }}
              />
              <RangePicker
                value={rangeToPickerValue(draftRange)}
                format="YYYY-MM-DD"
                allowClear
                disabled={preset !== 'custom'}
                placeholder={['Từ ngày', 'Đến ngày']}
                onChange={(_, values) => setDraftRange({
                  dateFrom: values[0] || undefined,
                  dateTo: values[1] || undefined,
                })}
                style={{ width: 248 }}
              />
            </Space>
          </div>

          <Space wrap size={[8, 8]}>
            <Button onClick={applyRange} disabled={preset !== 'custom'}>Áp dụng</Button>
            <Button variant="outline" size="icon" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} aria-label="Tải lại">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => exportTable(currentTable, 'csv')}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportTable(currentTable, 'excel')}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>Export nâng cao</Button>
          </Space>

          <div className="hidden">
            <label className="text-xs font-medium text-muted-foreground">Khoảng thời gian</label>
            <Select value={preset} onValueChange={(value) => setPreset(value as DatePreset)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Tháng này</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="this_quarter">Quý này</SelectItem>
                <SelectItem value="this_year">Năm nay</SelectItem>
                <SelectItem value="all">Toàn bộ</SelectItem>
                <SelectItem value="custom">Tùy chọn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden">
            <label className="text-xs font-medium text-muted-foreground">Nhóm theo</label>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Ngày</SelectItem>
                <SelectItem value="week">Tuần</SelectItem>
                <SelectItem value="month">Tháng</SelectItem>
                <SelectItem value="quarter">Quý</SelectItem>
                <SelectItem value="year">Năm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Từ ngày</label>
              <Input
                type="date"
                value={draftRange.dateFrom ?? ''}
                disabled={preset !== 'custom'}
                onChange={(event) => setDraftRange((range) => ({ ...range, dateFrom: event.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Đến ngày</label>
              <Input
                type="date"
                value={draftRange.dateTo ?? ''}
                disabled={preset !== 'custom'}
                onChange={(event) => setDraftRange((range) => ({ ...range, dateTo: event.target.value || undefined }))}
              />
            </div>
          </div>

          <div className="hidden">
            <Button onClick={applyRange}>Áp dụng</Button>
            <Button variant="outline" size="icon" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} aria-label="Tải lại">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => exportTable(currentTable, 'csv')}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportTable(currentTable, 'excel')}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>Export nâng cao</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric title="Doanh thu tạm tính" value={formatAdminCurrency(breakdown?.estimated_revenue ?? breakdown?.net_revenue ?? 0)} />
        <Metric title="Doanh thu thực" value={formatAdminCurrency(breakdown?.realized_revenue ?? 0)} />
        <Metric title="Hoàn tiền" value={formatAdminCurrency(breakdown?.refunded_amount ?? breakdown?.total_refunded ?? 0)} />
        <Metric title="Giao dịch" value={String(breakdown?.transaction_count ?? 0)} hint={`${breakdown?.refund_rate ?? 0}% hoàn tiền`} />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MainTab)} className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-8">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="courses">Khóa học</TabsTrigger>
          <TabsTrigger value="instructors">Giảng viên</TabsTrigger>
          <TabsTrigger value="refunds">Hoàn tiền</TabsTrigger>
          <TabsTrigger value="promotions">Mã giảm giá</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo</TabsTrigger>
          <TabsTrigger value="creation">Tạo mới</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric title="User" value={String(dashboard?.total_users ?? 0)} />
            <Metric title="Giảng viên" value={String(dashboard?.total_instructors ?? 0)} />
            <Metric title="Khóa học" value={String(dashboard?.total_courses ?? 0)} />
            <Metric title="Ghi danh" value={String(dashboard?.total_enrollments ?? 0)} />
          </div>
          <DataTable model={tables.overview} loading={loading} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric title="Bán lẻ" value={formatAdminCurrency(breakdown?.retail_revenue ?? 0)} />
            <Metric title="Gói đăng ký" value={formatAdminCurrency(breakdown?.subscription_revenue ?? 0)} />
            <Metric title="Tỷ lệ hoàn tiền" value={`${breakdown?.refund_rate ?? 0}%`} />
          </div>
          <DataTable model={tables.revenue} loading={loading} />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <DataTable model={tables.courses} loading={loading} />
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric title="Tổng thu nhập" value={formatAdminCurrency(earningPayout?.total_instructor_earnings ?? 0)} />
            <Metric title="Cần chi trả" value={formatAdminCurrency(payable)} />
            <Metric title="Đã chi trả" value={formatAdminCurrency(paidOut)} />
            <Metric title="Giao dịch" value={String(instructors.reduce((sum, row) => sum + (row.transactions ?? 0), 0))} />
          </div>
          <DataTable model={tables.instructors} loading={loading} />
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric title="Yêu cầu hoàn tiền" value={String(refunds?.total_requests ?? 0)} />
            <Metric title="Tổng tiền hoàn" value={formatAdminCurrency(refunds?.total_refunded_amount ?? 0)} />
            <Metric title="Trạng thái" value={String(refundRows.length)} />
          </div>
          <DataTable model={tables.refunds} loading={loading} />
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <DataTable model={tables.promotions} loading={loading} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric title="Tổng báo cáo" value={String(reportStats?.summary.total_reports ?? 0)} />
            <Metric title="Case mở" value={String(reportStats?.summary.open_cases ?? 0)} />
            <Metric title="Đã xử lý" value={String(reportStats?.summary.resolved_cases ?? 0)} />
            <Metric title="Nghiêm trọng" value={String(reportStats?.summary.critical_cases ?? 0)} />
          </div>
          <DataTable model={tables.reports} loading={loading} />
        </TabsContent>

        <TabsContent value="creation" className="space-y-4">
          <DataTable model={tables.creation} loading={loading} />
        </TabsContent>
      </Tabs>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export nâng cao</DialogTitle>
            <DialogDescription>{rangeLabel(appliedRange)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="w-44">
              <Select value={bulkFormat} onValueChange={(value) => setBulkFormat(value as 'csv' | 'excel')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV zip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {reportOptions.map((option) => (
                <label key={option.key} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <Checkbox
                    checked={selectedReports.includes(option.key)}
                    onCheckedChange={(checked) => toggleReport(option.key, checked === true)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Đóng</Button>
            <Button onClick={exportBulk}>Tạo file</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
