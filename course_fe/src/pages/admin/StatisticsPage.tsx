import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DatePicker, Space, Table as AntTable } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { Download, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { useAuth } from '../../contexts/AuthContext'
import {
  formatAdminCurrency,
  getAdminEarningPayoutMetrics,
  getAdminPayments,
  getAdminRevenueByCourse,
  getAdminRevenueByInstructor,
  type AdminPayment,
  type CourseRevenueDetailRow,
  type EarningPayoutInstructorRow,
  type EarningPayoutMetrics,
  type InstructorRevenueRow,
} from '../../services/admin.api'
import {
  getAdminReports,
  type AdminReportListStatus,
  type ReportCase,
} from '../../services/report.api'

type MainTab = 'orders' | 'earningPayout' | 'courses' | 'instructors' | 'reports'

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

type TableRow<T> = T & { __rowKey: number }

const emptyMessage = 'Không có dữ liệu trong khoảng thời gian này'

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function rangeToPickerValue(range: DateRange): [Dayjs, Dayjs] | null {
  if (!range.dateFrom || !range.dateTo) return null
  return [dayjs(range.dateFrom), dayjs(range.dateTo)]
}

function rangeLabel(range: DateRange) {
  if (!range.dateFrom && !range.dateTo) return 'Toàn bộ dữ liệu'
  if (range.dateFrom && range.dateTo) return `${range.dateFrom} đến ${range.dateTo}`
  if (range.dateFrom) return `Từ ${range.dateFrom}`
  return `Đến ${range.dateTo}`
}

function isInRange(value: string | undefined, range: DateRange) {
  if (!value) return false
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return false
  const from = range.dateFrom ? new Date(`${range.dateFrom}T00:00:00`).getTime() : -Infinity
  const to = range.dateTo ? new Date(`${range.dateTo}T23:59:59`).getTime() : Infinity
  return time >= from && time <= to
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

function parseAmount(value: string | number | undefined) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function shortText(value: string | null | undefined, fallback = '-') {
  const text = (value || '').trim()
  if (!text) return fallback
  return text.length > 120 ? `${text.slice(0, 117)}...` : text
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

function escapeCell(value: string | number) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

function rowsToExcelHtml(title: string, headers: string[], rows: Array<Array<string | number>>) {
  return `
    <html><head><meta charset="UTF-8"></head><body>
      <table><caption>${escapeCell(title)}</caption>
        <thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>
  `.trim()
}

function statusBadge(status: string) {
  const normalized = status.toLowerCase()
  const variant = normalized === 'completed' || normalized === 'success' || normalized === 'paid' || normalized === 'processed'
    ? 'default'
    : normalized === 'pending' || normalized === 'processing' || normalized === 'available'
      ? 'secondary'
      : 'outline'
  return <Badge variant={variant}>{status}</Badge>
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

  const dataWithKeys = useMemo<TableRow<T>[]>(
    () => visibleRows.map((row, index) => ({ ...row, __rowKey: index })),
    [visibleRows],
  )

  const columns: TableColumnsType<TableRow<T>> = useMemo(() => model.columns.map((column, index) => ({
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">{model.title}</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong bảng" className="pl-9" />
          </div>
        </div>
        {toolbar}
      </CardHeader>
      <CardContent>
        <AntTable<TableRow<T>>
          columns={columns}
          dataSource={dataWithKeys}
          loading={loading}
          locale={{ emptyText: emptyMessage }}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `${total} dòng` }}
          rowKey={(row) => String(row.__rowKey)}
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

function buildOrderTable(rows: AdminPayment[]): TableModel<AdminPayment> {
  return {
    title: 'Thống kê đơn hàng',
    rows,
    columns: [
      { label: 'Mã đơn', render: (row) => `#${row.payment_id}`, exportValue: (row) => row.payment_id, searchValue: (row) => String(row.payment_id) },
      { label: 'Ngày tạo', render: (row) => formatDateTime(row.created_at), exportValue: (row) => formatDateTime(row.created_at) },
      { label: 'Người mua', render: (row) => row.user_name || row.user_email || '-', exportValue: (row) => row.user_name || row.user_email || '-', searchValue: (row) => `${row.user_name ?? ''} ${row.user_email ?? ''}` },
      { label: 'Khóa học', render: (row) => row.course_title || row.courses.map((course) => course.course_title).join(', ') || '-', exportValue: (row) => row.course_title || row.courses.map((course) => course.course_title).join(', ') || '-', searchValue: (row) => `${row.course_title ?? ''} ${row.courses.map((course) => course.course_title).join(' ')}` },
      moneyColumn('Giá trị', (row) => parseAmount(row.total_amount)),
      { label: 'Phương thức', render: (row) => row.payment_method || '-', exportValue: (row) => row.payment_method || '-', searchValue: (row) => row.payment_method || '' },
      { label: 'Trạng thái', align: 'center', render: (row) => statusBadge(row.payment_status), exportValue: (row) => row.payment_status, searchValue: (row) => row.payment_status },
    ],
  }
}

function buildEarningPayoutTable(rows: EarningPayoutInstructorRow[]): TableModel<EarningPayoutInstructorRow> {
  return {
    title: 'Thống kê earning và payout',
    rows,
    columns: [
      { label: 'Giảng viên', render: (row) => row.instructor_name || '-', exportValue: (row) => row.instructor_name || '-', searchValue: (row) => row.instructor_name || '' },
      moneyColumn('Earning', (row) => row.instructor_earnings ?? 0),
      moneyColumn('Có thể chi', (row) => row.payable_earnings ?? 0),
      moneyColumn('Đã chi net', (row) => row.payout_processed_net ?? 0),
      moneyColumn('Payout đang chờ', (row) => row.payout_pending ?? 0),
      numberColumn('Lệnh chi', (row) => row.payout_count ?? 0),
      moneyColumn('Chênh lệch', (row) => row.settlement_gap ?? 0),
    ],
  }
}

function buildCourseTable(rows: CourseRevenueDetailRow[]): TableModel<CourseRevenueDetailRow> {
  return {
    title: 'Thống kê doanh thu khóa học',
    rows,
    columns: [
      { label: 'Khóa học', render: (row) => row.title, exportValue: (row) => row.title, searchValue: (row) => row.title },
      { label: 'Giảng viên', render: (row) => row.instructor_name || '-', exportValue: (row) => row.instructor_name || '-', searchValue: (row) => row.instructor_name || '' },
      moneyColumn('Doanh thu', (row) => row.revenue ?? 0),
      moneyColumn('Hoàn tiền', (row) => row.refunded ?? 0),
      moneyColumn('Net', (row) => row.net_revenue ?? 0),
      numberColumn('Giao dịch', (row) => row.transactions ?? row.transaction_count ?? 0),
      numberColumn('Ghi danh', (row) => row.enrollments ?? row.enrollment_count ?? 0),
    ],
  }
}

function buildInstructorTable(rows: InstructorRevenueRow[]): TableModel<InstructorRevenueRow> {
  return {
    title: 'Thống kê doanh thu giảng viên',
    rows,
    columns: [
      { label: 'Giảng viên', render: (row) => row.instructor_name || '-', exportValue: (row) => row.instructor_name || '-', searchValue: (row) => row.instructor_name || '' },
      moneyColumn('Gross', (row) => row.gross ?? 0),
      moneyColumn('Giảng viên nhận', (row) => row.instructor_earnings ?? 0),
      moneyColumn('Nền tảng nhận', (row) => row.platform_revenue ?? 0),
      moneyColumn('Đã chi', (row) => row.paid ?? 0),
      numberColumn('Giao dịch', (row) => row.transactions ?? 0),
    ],
  }
}

function buildReportTable(rows: ReportCase[]): TableModel<ReportCase> {
  return {
    title: 'Thống kê danh sách báo cáo người dùng',
    rows,
    columns: [
      { label: 'Mã report', render: (row) => `#${row.report_id}`, exportValue: (row) => row.report_id, searchValue: (row) => String(row.report_id) },
      { label: 'Ngày báo cáo', render: (row) => formatDateTime(row.reported_at), exportValue: (row) => formatDateTime(row.reported_at) },
      { label: 'Người báo cáo', render: (row) => row.reporter_name || row.reporter_email || 'Ẩn danh', exportValue: (row) => row.reporter_name || row.reporter_email || 'Ẩn danh', searchValue: (row) => `${row.reporter_name ?? ''} ${row.reporter_email ?? ''}` },
      { label: 'Nội dung bị báo cáo', render: (row) => row.title || `${row.target_type} #${row.target_id}`, exportValue: (row) => row.title || `${row.target_type} #${row.target_id}`, searchValue: (row) => `${row.title ?? ''} ${row.snippet ?? ''} ${row.target_id}` },
      { label: 'Loại', render: (row) => row.target_type, exportValue: (row) => row.target_type, searchValue: (row) => row.target_type },
      { label: 'Lý do', render: (row) => row.reason_label || row.reason, exportValue: (row) => row.reason_label || row.reason, searchValue: (row) => `${row.reason_label ?? ''} ${row.reason}` },
      { label: 'Trạng thái', align: 'center', render: (row) => statusBadge(row.status), exportValue: (row) => row.status, searchValue: (row) => row.status },
      { label: 'Mô tả ngắn', render: (row) => shortText(row.description), exportValue: (row) => row.description || '', searchValue: (row) => row.description || '' },
    ],
  }
}

async function fetchReportPages(status: AdminReportListStatus, range: DateRange) {
  const reports: ReportCase[] = []
  let page = 1
  while (true) {
    const response = await getAdminReports({
      status,
      date_from: range.dateFrom,
      date_to: range.dateTo,
      page,
      page_size: 100,
    })
    reports.push(...response.results)
    if (!response.next) break
    page += 1
  }
  return reports
}

function exportTable<T>(model: TableModel<T>) {
  const headers = model.columns.map((column) => column.label)
  const rows = model.rows.map((row) => model.columns.map((column) => column.exportValue(row)))
  downloadText('statistics_current_table.xls', rowsToExcelHtml(model.title, headers, rows), 'application/vnd.ms-excel;charset=utf-8')
}

export function StatisticsPage() {
  const { canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState<MainTab>('orders')
  const now = new Date()
  const initialRange = { dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: isoDate(now) }
  const [draftRange, setDraftRange] = useState<DateRange>(initialRange)
  const [appliedRange, setAppliedRange] = useState<DateRange>(initialRange)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [courses, setCourses] = useState<CourseRevenueDetailRow[]>([])
  const [instructors, setInstructors] = useState<InstructorRevenueRow[]>([])
  const [earningPayout, setEarningPayout] = useState<EarningPayoutMetrics | null>(null)
  const [reports, setReports] = useState<ReportCase[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [paymentsRes, courseRes, instructorRes, earningPayoutRes, openReportsRes, processedReportsRes] = await Promise.all([
          getAdminPayments(),
          getAdminRevenueByCourse(100),
          getAdminRevenueByInstructor(100),
          getAdminEarningPayoutMetrics(100, appliedRange.dateFrom, appliedRange.dateTo),
          fetchReportPages('open', appliedRange),
          fetchReportPages('processed', appliedRange),
        ])
        if (cancelled) return
        setPayments(paymentsRes)
        setCourses(courseRes)
        setInstructors(instructorRes)
        setEarningPayout(earningPayoutRes)
        setReports(
          [...openReportsRes, ...processedReportsRes].sort((a, b) =>
            new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime()
          ),
        )
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
  }, [appliedRange, refreshKey])

  if (!canAccess(['admin'], ['admin.statistics.view'])) {
    return <div className="p-6">Bạn không có quyền xem thống kê.</div>
  }

  const filteredPayments = useMemo(
    () => payments.filter((payment) => isInRange(payment.created_at, appliedRange)),
    [payments, appliedRange],
  )

  const tables = {
    orders: buildOrderTable(filteredPayments),
    earningPayout: buildEarningPayoutTable(earningPayout?.per_instructor ?? []),
    courses: buildCourseTable(courses),
    instructors: buildInstructorTable(instructors),
    reports: buildReportTable(reports),
  } satisfies Record<MainTab, TableModel<any>>

  const currentTable = tables[activeTab]
  const showDateFilter = activeTab === 'orders' || activeTab === 'earningPayout' || activeTab === 'reports'

  function applyRange() {
    setAppliedRange(draftRange)
  }

  const tableToolbar = (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 xl:flex-row xl:items-end xl:justify-between">
      {showDateFilter ? (
        <Space wrap size={[8, 8]} className="min-w-0">
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
          <Button onClick={applyRange}>Áp dụng</Button>
        </Space>
      ) : (
        <span className="text-xs text-muted-foreground">Bảng này không dùng lọc ngày.</span>
      )}

      <Space wrap size={[8, 8]}>
        <Button variant="outline" size="icon" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} aria-label="Tải lại">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button variant="outline" onClick={() => exportTable(currentTable)}>
          <Download className="mr-2 h-4 w-4" />
          Excel
        </Button>
      </Space>
    </div>
  )

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Thống kê</h1>
          {showDateFilter && <p className="text-sm text-muted-foreground">{rangeLabel(appliedRange)}</p>}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MainTab)} className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 gap-1 lg:grid-cols-5">
          <TabsTrigger value="orders">Đơn hàng</TabsTrigger>
          <TabsTrigger value="earningPayout">Earning/Payout</TabsTrigger>
          <TabsTrigger value="courses">Doanh thu khóa học</TabsTrigger>
          <TabsTrigger value="instructors">Doanh thu giảng viên</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo người dùng</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <DataTable model={tables.orders} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="earningPayout" className="space-y-4">
          <DataTable model={tables.earningPayout} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <DataTable model={tables.courses} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4">
          <DataTable model={tables.instructors} loading={loading} toolbar={tableToolbar} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <DataTable model={tables.reports} loading={loading} toolbar={tableToolbar} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
