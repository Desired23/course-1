import { useEffect, useMemo, useState } from 'react'
import { DatePicker, Input as AntInput, Select as AntSelect, Space, Table as AntTable } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { getInstructorAnalyticsTimeseries, type AnalyticsTimeseries } from '../../services/instructor.api'
import { getAllInstructorEarnings, parseEarningAmount, type InstructorEarning } from '../../services/instructor-earnings.api'

type GroupBy = 'day' | 'month' | 'quarter' | 'year'

interface DateRange {
  dateFrom?: string
  dateTo?: string
}

interface RevenueRow {
  date: string
  revenue: number
  retail_revenue?: number
  subscription_revenue?: number
  transaction_count?: number
  refund_rate?: number
}

interface CourseRevenueRow {
  course_id: number
  title: string
  students: number
  rating: number
  revenue: number
  retail_revenue?: number
  subscription_revenue?: number
  transaction_count?: number
}

type OrderRow = InstructorEarning

const { RangePicker } = DatePicker

const groupByOptions: Array<{ label: string; value: GroupBy }> = [
  { label: 'Ngày', value: 'day' },
  { label: 'Tháng', value: 'month' },
  { label: 'Quý', value: 'quarter' },
  { label: 'Năm', value: 'year' },
]

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function initialDateRange(): DateRange {
  const now = new Date()
  return {
    dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: isoDate(now),
  }
}

function rangeToPickerValue(range: DateRange): [Dayjs, Dayjs] | null {
  if (!range.dateFrom || !range.dateTo) return null
  return [dayjs(range.dateFrom), dayjs(range.dateTo)]
}

function monthsBetween(range: DateRange) {
  if (!range.dateFrom || !range.dateTo) return 12
  const start = new Date(`${range.dateFrom}T00:00:00`)
  const end = new Date(`${range.dateTo}T00:00:00`)
  return Math.max(1, Math.min(36, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1))
}

function rangeLabel(range: DateRange) {
  if (range.dateFrom && range.dateTo) return `${range.dateFrom} đến ${range.dateTo}`
  if (range.dateFrom) return `Từ ${range.dateFrom}`
  if (range.dateTo) return `Đến ${range.dateTo}`
  return 'Toàn bộ dữ liệu'
}

function formatCurrency(value: number) {
  return `${Math.round(value || 0).toLocaleString('vi-VN')} ₫`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}

function sourceLabel(value: string) {
  return value === 'subscription' ? 'Gói đăng ký' : 'Bán lẻ'
}

function refundStatusLabel(value?: string | null) {
  const labels: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    processing: 'Đang hoàn tiền',
    success: 'Đã hoàn tiền',
    rejected: 'Từ chối',
    failed: 'Thất bại',
    cancelled: 'Đã hủy',
  }
  return value ? labels[value] ?? value : '-'
}

function moneyOrDash(value?: string | null) {
  if (value === null || value === undefined) return '-'
  return formatCurrency(parseEarningAmount(value))
}

function finalInstructorAmount(row: OrderRow) {
  return row.instructor_net_after_refund ?? row.net_amount
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
  const escape = (value: string | number) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `
    <html><head><meta charset="UTF-8"></head><body>
      <table><caption>${escape(title)}</caption>
        <thead><tr>${headers.map((header) => `<th>${escape(header)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>
  `.trim()
}

function exportExcel(filename: string, title: string, headers: string[], rows: Array<Array<string | number>>) {
  downloadText(filename, rowsToExcelHtml(title, headers, rows), 'application/vnd.ms-excel;charset=utf-8')
}

export function InstructorAnalyticsPage() {
  const initialRange = useMemo(() => initialDateRange(), [])
  const [timeGroupBy, setTimeGroupBy] = useState<GroupBy>('month')
  const [timeDraftRange, setTimeDraftRange] = useState<DateRange>(initialRange)
  const [timeAppliedRange, setTimeAppliedRange] = useState<DateRange>(initialRange)
  const [timeRefreshKey, setTimeRefreshKey] = useState(0)
  const [timeLoading, setTimeLoading] = useState(false)
  const [rows, setRows] = useState<RevenueRow[]>([])
  const [courseDraftRange, setCourseDraftRange] = useState<DateRange>(initialRange)
  const [courseAppliedRange, setCourseAppliedRange] = useState<DateRange>(initialRange)
  const [courseRefreshKey, setCourseRefreshKey] = useState(0)
  const [courseLoading, setCourseLoading] = useState(false)
  const [courseSearch, setCourseSearch] = useState('')
  const [courseRows, setCourseRows] = useState<CourseRevenueRow[]>([])
  const [orderDraftRange, setOrderDraftRange] = useState<DateRange>(initialRange)
  const [orderAppliedRange, setOrderAppliedRange] = useState<DateRange>(initialRange)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderRefreshKey, setOrderRefreshKey] = useState(0)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderRows, setOrderRows] = useState<OrderRow[]>([])
  const [refundDraftRange, setRefundDraftRange] = useState<DateRange>(initialRange)
  const [refundAppliedRange, setRefundAppliedRange] = useState<DateRange>(initialRange)
  const [refundSearch, setRefundSearch] = useState('')
  const [refundRefreshKey, setRefundRefreshKey] = useState(0)
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundRows, setRefundRows] = useState<OrderRow[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setTimeLoading(true)
      try {
        const data: AnalyticsTimeseries = await getInstructorAnalyticsTimeseries(
          monthsBetween(timeAppliedRange),
          undefined,
          timeAppliedRange.dateFrom,
          timeAppliedRange.dateTo,
          timeGroupBy,
        )
        if (!cancelled) setRows(data.revenue_trend)
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || 'Không thể tải doanh thu')
      } finally {
        if (!cancelled) setTimeLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [timeAppliedRange, timeGroupBy, timeRefreshKey])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setCourseLoading(true)
      try {
        const data: AnalyticsTimeseries = await getInstructorAnalyticsTimeseries(
          monthsBetween(courseAppliedRange),
          undefined,
          courseAppliedRange.dateFrom,
          courseAppliedRange.dateTo,
          'month',
        )
        if (!cancelled) setCourseRows(data.top_courses)
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || 'Không thể tải doanh thu theo khóa học')
      } finally {
        if (!cancelled) setCourseLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [courseAppliedRange, courseRefreshKey])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setOrderLoading(true)
      try {
        const baseParams = {
          date_from: orderAppliedRange.dateFrom,
          date_to: orderAppliedRange.dateTo,
          search: orderSearch.trim() || undefined,
          sort_by: 'newest' as const,
        }
        const [availableRows, paidRows] = await Promise.all([
          getAllInstructorEarnings({ ...baseParams, status: 'available' }),
          getAllInstructorEarnings({ ...baseParams, status: 'paid' }),
        ])
        const data = [...availableRows, ...paidRows].sort((a, b) =>
          String(b.payment_date || b.earning_date).localeCompare(String(a.payment_date || a.earning_date)),
        )
        if (!cancelled) setOrderRows(data)
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || 'Không thể tải đơn hàng')
      } finally {
        if (!cancelled) setOrderLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [orderAppliedRange, orderRefreshKey])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setRefundLoading(true)
      try {
        const data = await getAllInstructorEarnings({
          date_from: refundAppliedRange.dateFrom,
          date_to: refundAppliedRange.dateTo,
          search: refundSearch.trim() || undefined,
          sort_by: 'newest',
        })
        if (!cancelled) setRefundRows(data.filter((row) => Boolean(row.refund_status)))
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || 'Không thể tải hoàn tiền')
      } finally {
        if (!cancelled) setRefundLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [refundAppliedRange, refundRefreshKey])

  const columns: TableColumnsType<RevenueRow> = [
    {
      title: 'Thời gian',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => a.date.localeCompare(b.date, 'vi'),
    },
    {
      title: 'Doanh thu giảng viên',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      render: (value: number) => formatCurrency(value),
      sorter: (a, b) => a.revenue - b.revenue,
    },
    {
      title: 'Bán lẻ',
      dataIndex: 'retail_revenue',
      key: 'retail_revenue',
      align: 'right',
      render: (value: number) => formatCurrency(value || 0),
      sorter: (a, b) => (a.retail_revenue || 0) - (b.retail_revenue || 0),
    },
    {
      title: 'Gói đăng ký',
      dataIndex: 'subscription_revenue',
      key: 'subscription_revenue',
      align: 'right',
      render: (value: number) => formatCurrency(value || 0),
      sorter: (a, b) => (a.subscription_revenue || 0) - (b.subscription_revenue || 0),
    },
    {
      title: 'Giao dịch',
      dataIndex: 'transaction_count',
      key: 'transaction_count',
      align: 'right',
      render: (value: number) => value || 0,
      sorter: (a, b) => (a.transaction_count || 0) - (b.transaction_count || 0),
    },
  ]

  const courseColumns: TableColumnsType<CourseRevenueRow> = [
    {
      title: 'Khóa học',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title, 'vi'),
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      title: 'Doanh thu giảng viên',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      render: (value: number) => formatCurrency(value),
      sorter: (a, b) => a.revenue - b.revenue,
    },
    {
      title: 'Bán lẻ',
      dataIndex: 'retail_revenue',
      key: 'retail_revenue',
      align: 'right',
      render: (value: number) => formatCurrency(value || 0),
      sorter: (a, b) => (a.retail_revenue || 0) - (b.retail_revenue || 0),
    },
    {
      title: 'Gói đăng ký',
      dataIndex: 'subscription_revenue',
      key: 'subscription_revenue',
      align: 'right',
      render: (value: number) => formatCurrency(value || 0),
      sorter: (a, b) => (a.subscription_revenue || 0) - (b.subscription_revenue || 0),
    },
    {
      title: 'Giao dịch',
      dataIndex: 'transaction_count',
      key: 'transaction_count',
      align: 'right',
      render: (value: number) => value || 0,
      sorter: (a, b) => (a.transaction_count || 0) - (b.transaction_count || 0),
    },
    {
      title: 'Tỷ lệ hoàn',
      dataIndex: 'refund_rate',
      key: 'refund_rate',
      align: 'right',
      render: (value: number) => `${Number(value || 0).toFixed(1)}%`,
      sorter: (a, b) => (a.refund_rate || 0) - (b.refund_rate || 0),
    },
    {
      title: 'Học viên',
      dataIndex: 'students',
      key: 'students',
      align: 'right',
      sorter: (a, b) => a.students - b.students,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      align: 'right',
      render: (value: number) => Number(value || 0).toFixed(1),
      sorter: (a, b) => a.rating - b.rating,
    },
  ]

  const orderColumns: TableColumnsType<OrderRow> = [
    {
      title: 'Ngày',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (value: string | null, row) => formatDate(value || row.earning_date),
      sorter: (a, b) => String(a.payment_date || a.earning_date).localeCompare(String(b.payment_date || b.earning_date)),
    },
    {
      title: 'Học viên',
      dataIndex: 'student_name',
      key: 'student_name',
      render: (value: string | null, row) => value || row.student_email || '-',
      sorter: (a, b) => String(a.student_name || a.student_email || '').localeCompare(String(b.student_name || b.student_email || ''), 'vi'),
    },
    {
      title: 'Khóa học',
      dataIndex: 'course_title',
      key: 'course_title',
      render: (value: string | null) => value || '-',
      sorter: (a, b) => String(a.course_title || '').localeCompare(String(b.course_title || ''), 'vi'),
    },
    {
      title: 'Nguồn',
      dataIndex: 'earning_source',
      key: 'earning_source',
      render: (value: string) => sourceLabel(value),
      sorter: (a, b) => a.earning_source.localeCompare(b.earning_source),
    },
    {
      title: 'Giá bán',
      dataIndex: 'sale_price',
      key: 'sale_price',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.sale_price) - parseEarningAmount(b.sale_price),
    },
    {
      title: 'Giảm sàn',
      dataIndex: 'platform_discount_amount',
      key: 'platform_discount_amount',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.platform_discount_amount) - parseEarningAmount(b.platform_discount_amount),
    },
    {
      title: 'Sau giảm sàn',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.paid_amount) - parseEarningAmount(b.paid_amount),
    },
    {
      title: 'Sàn giữ',
      dataIndex: 'platform_fee_amount',
      key: 'platform_fee_amount',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.platform_fee_amount) - parseEarningAmount(b.platform_fee_amount),
    },
    {
      title: 'Refund',
      dataIndex: 'refund_amount',
      key: 'refund_amount',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.refund_amount) - parseEarningAmount(b.refund_amount),
    },
    {
      title: 'GV nhận',
      key: 'instructor_net_after_refund',
      align: 'right',
      render: (_, row) => formatCurrency(parseEarningAmount(finalInstructorAmount(row))),
      sorter: (a, b) => parseEarningAmount(finalInstructorAmount(a)) - parseEarningAmount(finalInstructorAmount(b)),
    },
    {
      title: 'Giao dịch',
      dataIndex: 'payment_transaction_id',
      key: 'payment_transaction_id',
      render: (value: string | null) => value || '-',
    },
  ]

  const refundColumns: TableColumnsType<OrderRow> = [
    {
      title: 'Ngày hoàn tiền',
      dataIndex: 'refund_date',
      key: 'refund_date',
      render: (value: string | null) => formatDate(value),
      sorter: (a, b) => String(a.refund_date || '').localeCompare(String(b.refund_date || '')),
    },
    {
      title: 'Học viên',
      dataIndex: 'student_name',
      key: 'student_name',
      render: (value: string | null, row) => value || row.student_email || '-',
      sorter: (a, b) => String(a.student_name || a.student_email || '').localeCompare(String(b.student_name || b.student_email || ''), 'vi'),
    },
    {
      title: 'Khóa học',
      dataIndex: 'course_title',
      key: 'course_title',
      render: (value: string | null) => value || '-',
      sorter: (a, b) => String(a.course_title || '').localeCompare(String(b.course_title || ''), 'vi'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'refund_status',
      key: 'refund_status',
      render: (value: string | null) => refundStatusLabel(value),
      sorter: (a, b) => String(a.refund_status || '').localeCompare(String(b.refund_status || '')),
    },
    {
      title: 'Giá bán',
      dataIndex: 'sale_price',
      key: 'sale_price',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.sale_price) - parseEarningAmount(b.sale_price),
    },
    {
      title: 'Giảm sàn',
      dataIndex: 'platform_discount_amount',
      key: 'platform_discount_amount',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.platform_discount_amount) - parseEarningAmount(b.platform_discount_amount),
    },
    {
      title: 'Sau giảm sàn',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.paid_amount) - parseEarningAmount(b.paid_amount),
    },
    {
      title: 'Hoàn học viên',
      dataIndex: 'refund_amount',
      key: 'refund_amount',
      align: 'right',
      render: (value: string | null) => formatCurrency(parseEarningAmount(value)),
      sorter: (a, b) => parseEarningAmount(a.refund_amount) - parseEarningAmount(b.refund_amount),
    },
    {
      title: 'GV còn nhận',
      dataIndex: 'instructor_net_after_refund',
      key: 'instructor_net_after_refund',
      align: 'right',
      render: (value: string | null) => moneyOrDash(value),
      sorter: (a, b) => parseEarningAmount(a.instructor_net_after_refund) - parseEarningAmount(b.instructor_net_after_refund),
    },
    {
      title: 'Lý do',
      dataIndex: 'refund_reason',
      key: 'refund_reason',
      render: (value: string | null) => value || '-',
    },
  ]

  const filteredCourseRows = useMemo(() => {
    const keyword = courseSearch.trim().toLowerCase()
    if (!keyword) return courseRows
    return courseRows.filter((row) => row.title.toLowerCase().includes(keyword))
  }, [courseRows, courseSearch])

  const exportTimeRows = () => {
    exportExcel(
      'doanh_thu_theo_thoi_gian.xls',
      `Doanh thu theo thời gian - ${rangeLabel(timeAppliedRange)}`,
      ['Thời gian', 'Doanh thu giảng viên', 'Bán lẻ', 'Gói đăng ký', 'Giao dịch'],
      rows.map((row) => [
        row.date,
        Math.round(row.revenue || 0),
        Math.round(row.retail_revenue || 0),
        Math.round(row.subscription_revenue || 0),
        row.transaction_count || 0,
      ]),
    )
  }

  const exportCourseRows = () => {
    exportExcel(
      'doanh_thu_theo_khoa_hoc.xls',
      `Doanh thu theo khóa học - ${rangeLabel(courseAppliedRange)}`,
      ['Khóa học', 'Doanh thu giảng viên', 'Bán lẻ', 'Gói đăng ký', 'Giao dịch', 'Tỷ lệ hoàn', 'Học viên', 'Rating'],
      filteredCourseRows.map((row) => [
        row.title,
        Math.round(row.revenue || 0),
        Math.round(row.retail_revenue || 0),
        Math.round(row.subscription_revenue || 0),
        row.transaction_count || 0,
        `${Number(row.refund_rate || 0).toFixed(1)}%`,
        row.students || 0,
        Number(row.rating || 0).toFixed(1),
      ]),
    )
  }

  const exportOrderRows = () => {
    exportExcel(
      'doanh_thu_theo_don.xls',
      `Thống kê doanh thu theo đơn - ${rangeLabel(orderAppliedRange)}`,
      ['Ngày', 'Học viên', 'Email', 'Khóa học', 'Nguồn', 'Giá bán', 'Giảm sàn', 'Sau giảm sàn', 'Sàn giữ', 'Refund', 'GV nhận', 'Giao dịch'],
      orderRows.map((row) => [
        formatDate(row.payment_date || row.earning_date),
        row.student_name || '',
        row.student_email || '',
        row.course_title || '',
        sourceLabel(row.earning_source),
        Math.round(parseEarningAmount(row.sale_price)),
        Math.round(parseEarningAmount(row.platform_discount_amount)),
        Math.round(parseEarningAmount(row.paid_amount)),
        Math.round(parseEarningAmount(row.platform_fee_amount)),
        Math.round(parseEarningAmount(row.refund_amount)),
        Math.round(parseEarningAmount(finalInstructorAmount(row))),
        row.payment_transaction_id || '',
      ]),
    )
  }

  const exportRefundRows = () => {
    exportExcel(
      'hoan_tien.xls',
      `Hoàn tiền - ${rangeLabel(refundAppliedRange)}`,
      ['Ngày hoàn tiền', 'Học viên', 'Email', 'Khóa học', 'Trạng thái', 'Giá bán', 'Giảm sàn', 'Sau giảm sàn', 'Hoàn học viên', 'GV còn nhận', 'Lý do'],
      refundRows.map((row) => [
        formatDate(row.refund_date),
        row.student_name || '',
        row.student_email || '',
        row.course_title || '',
        refundStatusLabel(row.refund_status),
        Math.round(parseEarningAmount(row.sale_price)),
        Math.round(parseEarningAmount(row.platform_discount_amount)),
        Math.round(parseEarningAmount(row.paid_amount)),
        Math.round(parseEarningAmount(row.refund_amount)),
        Math.round(parseEarningAmount(row.instructor_net_after_refund)),
        row.refund_reason || '',
      ]),
    )
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Doanh thu giảng viên</h1>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base">Doanh thu theo thời gian</CardTitle>
            <p className="text-xs text-muted-foreground">{rangeLabel(timeAppliedRange)}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 xl:flex-row xl:items-end xl:justify-between">
            <Space wrap size={[8, 8]} className="min-w-0">
              <span className="text-xs font-medium text-muted-foreground">Nhóm</span>
              <AntSelect<GroupBy>
                value={timeGroupBy}
                options={groupByOptions}
                onChange={setTimeGroupBy}
                style={{ width: 104 }}
              />
              <span className="text-xs font-medium text-muted-foreground">Khoảng thời gian</span>
              <RangePicker
                value={rangeToPickerValue(timeDraftRange)}
                format="YYYY-MM-DD"
                allowClear
                placeholder={['Từ ngày', 'Đến ngày']}
                onChange={(_, values) => setTimeDraftRange({
                  dateFrom: values[0] || undefined,
                  dateTo: values[1] || undefined,
                })}
                style={{ width: 248 }}
              />
            </Space>

            <Space wrap size={[8, 8]}>
              <Button variant="outline" onClick={exportTimeRows} disabled={timeLoading || rows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
              <Button onClick={() => setTimeAppliedRange(timeDraftRange)}>Áp dụng</Button>
              <Button variant="outline" size="icon" onClick={() => setTimeRefreshKey((key) => key + 1)} disabled={timeLoading} aria-label="Tải lại">
                <RefreshCw className={`h-4 w-4 ${timeLoading ? 'animate-spin' : ''}`} />
              </Button>
            </Space>
          </div>
        </CardHeader>
        <CardContent>
          <AntTable<RevenueRow>
            columns={columns}
            dataSource={rows}
            loading={timeLoading}
            locale={{ emptyText: 'Không có dữ liệu trong khoảng thời gian này' }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `${total} dòng` }}
            rowKey={(row) => row.date}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base">Doanh thu theo khóa học</CardTitle>
            <p className="text-xs text-muted-foreground">{rangeLabel(courseAppliedRange)}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 xl:flex-row xl:items-end xl:justify-between">
            <Space wrap size={[8, 8]} className="min-w-0">
              <AntInput.Search
                allowClear
                placeholder="Tìm khóa học"
                value={courseSearch}
                onChange={(event) => setCourseSearch(event.target.value)}
                style={{ width: 220 }}
              />
              <span className="text-xs font-medium text-muted-foreground">Khoảng thời gian</span>
              <RangePicker
                value={rangeToPickerValue(courseDraftRange)}
                format="YYYY-MM-DD"
                allowClear
                placeholder={['Từ ngày', 'Đến ngày']}
                onChange={(_, values) => setCourseDraftRange({
                  dateFrom: values[0] || undefined,
                  dateTo: values[1] || undefined,
                })}
                style={{ width: 248 }}
              />
            </Space>

            <Space wrap size={[8, 8]}>
              <Button variant="outline" onClick={exportCourseRows} disabled={courseLoading || filteredCourseRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
              <Button onClick={() => setCourseAppliedRange(courseDraftRange)}>Áp dụng</Button>
              <Button variant="outline" size="icon" onClick={() => setCourseRefreshKey((key) => key + 1)} disabled={courseLoading} aria-label="Tải lại">
                <RefreshCw className={`h-4 w-4 ${courseLoading ? 'animate-spin' : ''}`} />
              </Button>
            </Space>
          </div>
        </CardHeader>
        <CardContent>
          <AntTable<CourseRevenueRow>
            columns={courseColumns}
            dataSource={filteredCourseRows}
            loading={courseLoading}
            locale={{ emptyText: 'Không có dữ liệu trong khoảng thời gian này' }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `${total} dòng` }}
            rowKey={(row) => row.course_id}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base">Thống kê doanh thu theo đơn</CardTitle>
            <p className="text-xs text-muted-foreground">{rangeLabel(orderAppliedRange)}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 xl:flex-row xl:items-end xl:justify-between">
            <Space wrap size={[8, 8]} className="min-w-0">
              <AntInput.Search
                allowClear
                placeholder="Tìm học viên hoặc khóa học"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
                style={{ width: 260 }}
              />
              <span className="text-xs font-medium text-muted-foreground">Khoảng thời gian</span>
              <RangePicker
                value={rangeToPickerValue(orderDraftRange)}
                format="YYYY-MM-DD"
                allowClear
                placeholder={['Từ ngày', 'Đến ngày']}
                onChange={(_, values) => setOrderDraftRange({
                  dateFrom: values[0] || undefined,
                  dateTo: values[1] || undefined,
                })}
                style={{ width: 248 }}
              />
            </Space>

            <Space wrap size={[8, 8]}>
              <Button variant="outline" onClick={exportOrderRows} disabled={orderLoading || orderRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
              <Button onClick={() => {
                setOrderAppliedRange(orderDraftRange)
                setOrderRefreshKey((key) => key + 1)
              }}>
                Áp dụng
              </Button>
              <Button variant="outline" size="icon" onClick={() => setOrderRefreshKey((key) => key + 1)} disabled={orderLoading} aria-label="Tải lại">
                <RefreshCw className={`h-4 w-4 ${orderLoading ? 'animate-spin' : ''}`} />
              </Button>
            </Space>
          </div>
        </CardHeader>
        <CardContent>
          <AntTable<OrderRow>
            columns={orderColumns}
            dataSource={orderRows}
            loading={orderLoading}
            locale={{ emptyText: 'Không có doanh thu theo đơn trong khoảng thời gian này' }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `${total} dòng` }}
            rowKey={(row) => row.id}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base">Hoàn tiền</CardTitle>
            <p className="text-xs text-muted-foreground">{rangeLabel(refundAppliedRange)}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 xl:flex-row xl:items-end xl:justify-between">
            <Space wrap size={[8, 8]} className="min-w-0">
              <AntInput.Search
                allowClear
                placeholder="Tìm học viên hoặc khóa học"
                value={refundSearch}
                onChange={(event) => setRefundSearch(event.target.value)}
                style={{ width: 260 }}
              />
              <span className="text-xs font-medium text-muted-foreground">Khoảng thời gian</span>
              <RangePicker
                value={rangeToPickerValue(refundDraftRange)}
                format="YYYY-MM-DD"
                allowClear
                placeholder={['Từ ngày', 'Đến ngày']}
                onChange={(_, values) => setRefundDraftRange({
                  dateFrom: values[0] || undefined,
                  dateTo: values[1] || undefined,
                })}
                style={{ width: 248 }}
              />
            </Space>

            <Space wrap size={[8, 8]}>
              <Button variant="outline" onClick={exportRefundRows} disabled={refundLoading || refundRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
              <Button onClick={() => {
                setRefundAppliedRange(refundDraftRange)
                setRefundRefreshKey((key) => key + 1)
              }}>
                Áp dụng
              </Button>
              <Button variant="outline" size="icon" onClick={() => setRefundRefreshKey((key) => key + 1)} disabled={refundLoading} aria-label="Tải lại">
                <RefreshCw className={`h-4 w-4 ${refundLoading ? 'animate-spin' : ''}`} />
              </Button>
            </Space>
          </div>
        </CardHeader>
        <CardContent>
          <AntTable<OrderRow>
            columns={refundColumns}
            dataSource={refundRows}
            loading={refundLoading}
            locale={{ emptyText: 'Không có hoàn tiền trong khoảng thời gian này' }}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: (total) => `${total} dòng` }}
            rowKey={(row) => row.id}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </CardContent>
      </Card>
    </div>
  )
}
