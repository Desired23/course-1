import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DatePicker, Select as AntSelect, Space, Table as AntTable } from 'antd'
import type { TableColumnsType } from 'antd'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useAuth } from '../../contexts/AuthContext'
import {
  exportAdminBulkReports,
  formatAdminCurrency,
  getAdminBestSellingCourses,
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
  type EarningPayoutMetrics,
  type InstructorRevenueRow,
  type PromotionStatsRow,
  type RefundAnalytics,
  type RevenueBreakdown,
  type RevenueMonthlyEntry,
} from '../../services/admin.api'
import { getReportStatistics, type ReportStats } from '../../services/report.api'

type MainTab = 'overview' | 'revenue' | 'courses' | 'instructors' | 'refunds' | 'promotions' | 'reports'
type GroupBy = 'day' | 'month' | 'quarter' | 'year'

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
  { key: 'best_selling_courses', label: 'Bán chạy' },
]

const groupByOptions: Array<{ label: string; value: GroupBy }> = [
  { label: 'Ngày', value: 'day' },
  { label: 'Tháng', value: 'month' },
  { label: 'Quý', value: 'quarter' },
  { label: 'Năm', value: 'year' },
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
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

function DataTable<T>({ model, loading, toolbar }: { model: TableModel<T>; loading: boolean; toolbar?: ReactNode }) {
  const [search, setSearch] = useState('')
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return model.rows
    return model.rows.filter((row) =>
      model.columns.some((column) => (column.searchValue?.(row) ?? String(column.exportValue(row))).toLowerCase().includes(needle)),
    )
  }, [model, search])
  const columns: TableColumnsType<T> = useMemo(() => model.columns.map((column, index) => ({
    title: column.label,
    key: `${column.label}-${index}`,
    align: column.align,
    render: (_value, row) => column.render(row),
    sorter: (a, b) => {
      const aValue = column.exportValue(a)
      const bValue = column.exportValue(b)
      const aNumber = Number(aValue)
      const bNumber = Number(bValue)
      if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) return aNumber - bNumber
      return String(aValue ?? '').localeCompare(String(bValue ?? ''), 'vi')
    },
  })), [model.columns])

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">{model.title}</CardTitle>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong bảng" className="pl-9" />
        </div>
        {toolbar}
      </CardHeader>
      <CardContent>
        <AntTable<T>
          columns={columns}
          dataSource={visibleRows}
          loading={loading}
          locale={{ emptyText: emptyMessage }}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `${total} dong` }}
          rowKey={(_row, index) => String(index)}
          scroll={{ x: 'max-content' }}
          size="middle"
        />
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

function withPeriodColumn<T>(model: TableModel<T>, periodLabel: string): TableModel<T> {
  return {
    ...model,
    columns: [
      {
        label: 'Khoảng thời gian',
        render: () => periodLabel,
        exportValue: () => periodLabel,
        searchValue: () => periodLabel,
      },
      ...model.columns,
    ],
  }
}

function exportTable<T>(model: TableModel<T>) {
  const headers = model.columns.map((column) => column.label)
  const rows = model.rows.map((row) => model.columns.map((column) => column.exportValue(row)))
  downloadText('statistics_current_table.xls', rowsToExcelHtml(model.title, headers, rows), 'application/vnd.ms-excel;charset=utf-8')
}

export function StatisticsPage() {
  const { canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState<MainTab>('overview')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const now = new Date()
  const initialRange = { dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: isoDate(now) }
  const [draftRange, setDraftRange] = useState<DateRange>(initialRange)
  const [appliedRange, setAppliedRange] = useState<DateRange>(initialRange)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [selectedReports, setSelectedReports] = useState<BulkReportKey[]>([
    'realized_revenue',
    'revenue_course',
    'revenue_instructor',
    'refunds',
    'promotion_stats',
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
  const [bestSelling, setBestSelling] = useState<BestSellingCourseRow[]>([])
  const [reportStats, setReportStats] = useState<ReportStats | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const months = monthsBetween(appliedRange)
        const reportGroupBy = 'month'
        const [
          breakdownRes,
          dashboardRes,
          revenueRes,
          courseRes,
          instructorRes,
          earningPayoutRes,
          refundRes,
          promotionRes,
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

  const appliedPeriodLabel = rangeLabel(appliedRange)
  const tables = {
    overview: withPeriodColumn(buildBestSellingTable(bestSelling), appliedPeriodLabel),
    revenue: buildRevenueTable(revenueRows),
    courses: withPeriodColumn(buildCourseTable(courses), appliedPeriodLabel),
    instructors: withPeriodColumn(buildInstructorTable(instructors), appliedPeriodLabel),
    refunds: withPeriodColumn(buildRefundTable(refundRows), appliedPeriodLabel),
    promotions: withPeriodColumn(buildPromotionTable(promotions), appliedPeriodLabel),
    reports: buildReportTable(reportTrendRows),
  } satisfies Record<MainTab, TableModel<any>>

  const currentTable = tables[activeTab]
  const paidOut = earningPayout?.payout_processed_net ?? instructors.reduce((sum, row) => sum + (row.paid ?? 0), 0)
  const payable = earningPayout?.payable_earnings ?? instructors.reduce((sum, row) => sum + (row.pending ?? 0) + (row.available ?? 0), 0)

  function applyRange() {
    setAppliedRange(draftRange)
  }

  async function exportBulk() {
    if (selectedReports.length === 0) {
      toast.error('Chọn ít nhất một báo cáo')
      return
    }
    try {
      await exportAdminBulkReports(selectedReports, 'excel', appliedRange.dateFrom, appliedRange.dateTo)
      toast.success('Đã tạo file export')
      setBulkOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể export')
    }
  }

  function toggleReport(key: BulkReportKey, checked: boolean) {
    setSelectedReports((current) => checked ? Array.from(new Set([...current, key])) : current.filter((item) => item !== key))
  }

  const tableToolbar = (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <Space wrap size={[8, 8]} className="min-w-0">
          <span className="text-xs font-medium text-muted-foreground">Nhóm</span>
          <AntSelect<GroupBy>
            value={groupBy}
            options={groupByOptions}
            onChange={setGroupBy}
            style={{ width: 104 }}
          />
          <span className="text-xs font-medium text-muted-foreground">Khoảng thời gian</span>
          <RangePicker
            value={rangeToPickerValue(draftRange)}
            format="YYYY-MM-DD"
            allowClear
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
        <Button onClick={applyRange}>Áp dụng</Button>
        <Button variant="outline" size="icon" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} aria-label="Tải lại">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button variant="outline" onClick={() => exportTable(currentTable)}>
          <Download className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button variant="secondary" onClick={() => setBulkOpen(true)}>Export nâng cao</Button>
      </Space>
    </div>
  )

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Thống kê</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel(appliedRange)}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MainTab)} className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-7">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
          <TabsTrigger value="courses">Khóa học</TabsTrigger>
          <TabsTrigger value="instructors">Giảng viên</TabsTrigger>
          <TabsTrigger value="refunds">Hoàn tiền</TabsTrigger>
          <TabsTrigger value="promotions">Mã giảm giá</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric title="User" value={String(dashboard?.total_users ?? 0)} />
            <Metric title="Giảng viên" value={String(dashboard?.total_instructors ?? 0)} />
            <Metric title="Khóa học" value={String(dashboard?.total_courses ?? 0)} />
            <Metric title="Ghi danh" value={String(dashboard?.total_enrollments ?? 0)} />
          </div>
          <DataTable model={tables.overview} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric title="Bán lẻ" value={formatAdminCurrency(breakdown?.retail_revenue ?? 0)} />
            <Metric title="Gói đăng ký" value={formatAdminCurrency(breakdown?.subscription_revenue ?? 0)} />
            <Metric title="Tỷ lệ hoàn tiền" value={`${breakdown?.refund_rate ?? 0}%`} />
          </div>
          <DataTable model={tables.revenue} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <DataTable model={tables.courses} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric title="Tổng thu nhập" value={formatAdminCurrency(earningPayout?.total_instructor_earnings ?? 0)} />
            <Metric title="Cần chi trả" value={formatAdminCurrency(payable)} />
            <Metric title="Đã chi trả" value={formatAdminCurrency(paidOut)} />
            <Metric title="Giao dịch" value={String(instructors.reduce((sum, row) => sum + (row.transactions ?? 0), 0))} />
          </div>
          <DataTable model={tables.instructors} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric title="Yêu cầu hoàn tiền" value={String(refunds?.total_requests ?? 0)} />
            <Metric title="Tổng tiền hoàn" value={formatAdminCurrency(refunds?.total_refunded_amount ?? 0)} />
            <Metric title="Trạng thái" value={String(refundRows.length)} />
          </div>
          <DataTable model={tables.refunds} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <DataTable model={tables.promotions} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <DataTable model={tables.reports} loading={loading} toolbar={tableToolbar} />
        </TabsContent>
      </Tabs>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export nâng cao</DialogTitle>
            <DialogDescription>{rangeLabel(appliedRange)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
