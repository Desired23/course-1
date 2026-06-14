import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import {
  exportAdminRevenue,
  formatAdminCurrency,
  getAdminCommissionAnalytics,
  getAdminRefundAnalytics,
  getAdminRevenueByCategory,
  getAdminRevenueByInstructor,
  getAdminRevenueBreakdown,
  getAdminRevenueMonthlyBreakdown,
  getAdminSubscriptionMetrics,
  getAdminTopCoursesByRevenue,
  type CategoryRevenueRow,
  type CommissionAnalytics,
  type CourseRevenueRow,
  type InstructorRevenueRow,
  type RefundAnalytics,
  type RevenueBreakdown,
  type RevenueMonthlyEntry,
  type SubscriptionMetrics,
} from '../../services/admin.api'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartISO() {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().slice(0, 10)
}

export function AdminRevenueTab() {
  const { t } = useTranslation()
  const [dateFrom, setDateFrom] = useState(monthStartISO)
  const [dateTo, setDateTo] = useState(todayISO)
  const [applied, setApplied] = useState({ dateFrom, dateTo })
  const [months, setMonths] = useState(12)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<RevenueBreakdown | null>(null)
  const [monthly, setMonthly] = useState<RevenueMonthlyEntry[]>([])
  const [commission, setCommission] = useState<CommissionAnalytics | null>(null)
  const [refunds, setRefunds] = useState<RefundAnalytics | null>(null)
  const [topCourses, setTopCourses] = useState<CourseRevenueRow[]>([])
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenueRow[]>([])
  const [instructorRevenue, setInstructorRevenue] = useState<InstructorRevenueRow[]>([])
  const [subscriptionMetrics, setSubscriptionMetrics] = useState<SubscriptionMetrics | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [breakdownRes, monthlyRes, commissionRes, refundRes, topRes, categoryRes, instructorRes, subscriptionRes] = await Promise.all([
          getAdminRevenueBreakdown(applied.dateFrom, applied.dateTo),
          getAdminRevenueMonthlyBreakdown(months, applied.dateFrom, applied.dateTo),
          getAdminCommissionAnalytics(applied.dateFrom, applied.dateTo),
          getAdminRefundAnalytics(applied.dateFrom, applied.dateTo),
          getAdminTopCoursesByRevenue(10, applied.dateFrom, applied.dateTo),
          getAdminRevenueByCategory(10, applied.dateFrom, applied.dateTo),
          getAdminRevenueByInstructor(10, applied.dateFrom, applied.dateTo),
          getAdminSubscriptionMetrics(applied.dateFrom, applied.dateTo),
        ])
        if (cancelled) return
        setBreakdown(breakdownRes)
        setMonthly(monthlyRes)
        setCommission(commissionRes)
        setRefunds(refundRes)
        setTopCourses(topRes)
        setCategoryRevenue(categoryRes)
        setInstructorRevenue(instructorRes)
        setSubscriptionMetrics(subscriptionRes)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || t('admin_revenue.load_error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [applied, months])

  const ratio = useMemo(() => {
    if (!breakdown?.total_gross) return '0 / 0'
    const retail = Math.round((breakdown.retail_revenue / breakdown.total_gross) * 100)
    return `${retail}% / ${100 - retail}%`
  }, [breakdown])

  const pieData = commission ? [
    { name: t('admin_revenue.platform'), value: commission.total_platform_revenue, color: '#2563eb' },
    { name: t('admin_revenue.instructor'), value: commission.total_instructor_earnings, color: '#f97316' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_180px_auto]">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button onClick={() => setApplied({ dateFrom, dateTo })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('admin_revenue.apply')}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportAdminRevenue('csv', applied.dateFrom, applied.dateTo)}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportAdminRevenue('excel', applied.dateFrom, applied.dateTo)}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric title={t('admin_revenue.gross_revenue')} value={formatAdminCurrency(breakdown?.total_gross ?? 0)} loading={loading} />
        <Metric title={t('admin_revenue.net_revenue')} value={formatAdminCurrency(breakdown?.net_revenue ?? 0)} loading={loading} />
        <Metric title={t('admin_revenue.refunded')} value={formatAdminCurrency(breakdown?.total_refunded ?? 0)} loading={loading} />
        <Metric title={t('admin_revenue.retail_subscription')} value={ratio} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric title={t('admin_revenue.subscription_total', 'Doanh thu subscription')} value={formatAdminCurrency(subscriptionMetrics?.total_revenue ?? 0)} loading={loading} />
        <Metric title={t('admin_revenue.subscription_new', 'Subscriber mới')} value={String(subscriptionMetrics?.new_subscribers ?? 0)} loading={loading} />
        <Metric title={t('admin_revenue.subscription_churned', 'Hủy / hết hạn')} value={`${subscriptionMetrics?.cancelled_subscribers ?? 0} / ${subscriptionMetrics?.expired_subscribers ?? 0}`} loading={loading} />
        <Metric title={t('admin_revenue.subscription_churn_rate', 'Churn rate')} value={`${subscriptionMetrics?.churn_rate ?? 0}%`} loading={loading} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('admin_revenue.monthly_revenue')}</CardTitle>
          <Select value={String(months)} onValueChange={(value) => setMonths(Number(value))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[3, 6, 12, 24].map((m) => <SelectItem key={m} value={String(m)}>{t('admin_revenue.months', { n: m })}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}M`} />
              <Tooltip formatter={(value) => formatAdminCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="retail" stackId="revenue" fill="#16a34a" name={t('admin_revenue.retail')} />
              <Bar dataKey="subscription" stackId="revenue" fill="#7c3aed" name={t('admin_revenue.subscription')} />
              <Bar dataKey="refunded" fill="#fca5a5" name={t('admin_revenue.refunded')} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle>{t('admin_revenue.commission_split')}</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                  {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => formatAdminCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('admin_revenue.instructor_commission')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin_revenue.instructor')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.gross')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.net')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.retail')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.subscription')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.pending')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.paid')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(commission?.per_instructor ?? []).map((row) => (
                  <TableRow key={row.instructor_id}>
                    <TableCell>{row.instructor_name || `#${row.instructor_id}`}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.gross)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.total_earnings)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.retail_earnings)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.sub_earnings)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.pending)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('admin_revenue.revenue_by_category', 'Doanh thu theo category')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin_revenue.category', 'Category')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.revenue')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.net')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.refunded')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.courses', 'Khóa học')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryRevenue.map((row) => (
                  <TableRow key={row.category_id ?? row.category_name}>
                    <TableCell>{row.category_name}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.net_revenue)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.refunded)}</TableCell>
                    <TableCell className="text-right">{row.course_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('admin_revenue.revenue_by_instructor', 'Doanh thu theo instructor')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin_revenue.instructor')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.gross')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.platform')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.instructor')}</TableHead>
                  <TableHead className="text-right">{t('admin_revenue.subscription')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructorRevenue.map((row) => (
                  <TableRow key={row.instructor_id ?? row.instructor_name ?? 'unknown'}>
                    <TableCell>{row.instructor_name || `#${row.instructor_id}`}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.gross)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.platform_revenue)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.instructor_earnings)}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(row.subscription_revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('admin_revenue.subscription_by_plan', 'Subscription metrics theo plan')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin_revenue.plan', 'Plan')}</TableHead>
                <TableHead className="text-right">{t('admin_revenue.revenue')}</TableHead>
                <TableHead className="text-right">{t('admin_revenue.payments', 'Thanh toán')}</TableHead>
                <TableHead className="text-right">{t('admin_revenue.new_subscribers', 'Mới')}</TableHead>
                <TableHead className="text-right">{t('admin_revenue.cancelled', 'Hủy')}</TableHead>
                <TableHead className="text-right">{t('admin_revenue.expired', 'Hết hạn')}</TableHead>
                <TableHead className="text-right">{t('admin_revenue.active', 'Đang active')}</TableHead>
                <TableHead className="text-right">{t('admin_revenue.churn_rate', 'Churn')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subscriptionMetrics?.per_plan ?? []).map((plan) => (
                <TableRow key={plan.plan_id}>
                  <TableCell>{plan.plan_name}</TableCell>
                  <TableCell className="text-right">{formatAdminCurrency(plan.revenue)}</TableCell>
                  <TableCell className="text-right">{plan.payments}</TableCell>
                  <TableCell className="text-right">{plan.new_subscribers}</TableCell>
                  <TableCell className="text-right">{plan.cancelled_subscribers}</TableCell>
                  <TableCell className="text-right">{plan.expired_subscribers}</TableCell>
                  <TableCell className="text-right">{plan.active_subscribers}</TableCell>
                  <TableCell className="text-right">{plan.churn_rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('admin_revenue.refund_analytics')}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 text-sm text-muted-foreground">
              {t('admin_revenue.refund_summary', { requests: refunds?.total_requests ?? 0, amount: formatAdminCurrency(refunds?.total_refunded_amount ?? 0) })}
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>{t('admin_revenue.status')}</TableHead><TableHead className="text-right">{t('admin_revenue.count')}</TableHead><TableHead className="text-right">{t('admin_revenue.amount')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(refunds?.breakdown ?? {}).map(([status, value]) => (
                  <TableRow key={status}>
                    <TableCell className="capitalize">{t(`admin_revenue.refund_status.${status}`, status)}</TableCell>
                    <TableCell className="text-right">{value.count}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(value.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('admin_revenue.top_courses')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>{t('admin_revenue.rank')}</TableHead><TableHead>{t('admin_revenue.course')}</TableHead><TableHead>{t('admin_revenue.instructor')}</TableHead><TableHead className="text-right">{t('admin_revenue.revenue')}</TableHead><TableHead className="text-right">{t('admin_revenue.transactions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {topCourses.map((course, index) => (
                  <TableRow key={course.course_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{course.title}</TableCell>
                    <TableCell>{course.instructor_name || '-'}</TableCell>
                    <TableCell className="text-right">{formatAdminCurrency(course.revenue)}</TableCell>
                    <TableCell className="text-right">{course.transactions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Metric({ title, value, loading }: { title: string; value: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-xl font-semibold">{loading ? '...' : value}</p>
      </CardContent>
    </Card>
  )
}
