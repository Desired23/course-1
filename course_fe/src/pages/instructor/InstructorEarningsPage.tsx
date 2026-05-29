import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertCircle, Calendar, Crown, DollarSign, Layers, ShoppingCart } from 'lucide-react'
import { motion } from 'motion/react'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { UserPagination } from '../../components/UserPagination'
import { useAuth } from '../../contexts/AuthContext'
import { listItemTransition } from '../../lib/motion'
import { getMyInstructorProfile, getInstructorDashboardStats, type Instructor, type InstructorDashboardStats } from '../../services/instructor.api'
import { getInstructorPayouts, getPayoutStatusColor, getPayoutStatusLabel, type InstructorPayout } from '../../services/instructor-payouts.api'
import {
  formatEarningVND,
  getEarningStatusBadge,
  getInstructorEarnings,
  getInstructorEarningsMonthly,
  getInstructorEarningsSummary,
  parseEarningAmount,
  type EarningsMonthlyEntry,
  type EarningsSummary,
  type InstructorEarning,
} from '../../services/instructor-earnings.api'
import { useTranslation } from 'react-i18next'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
}

const TRANSACTIONS_PER_PAGE = 10
const COURSES_PER_PAGE = 6

export function InstructorEarningsPage() {
  const { user, canAccess } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [dashStats, setDashStats] = useState<InstructorDashboardStats | null>(null)
  const [instructorProfile, setInstructorProfile] = useState<Instructor | null>(null)
  const [monthly, setMonthly] = useState<EarningsMonthlyEntry[]>([])
  const [monthlyMonths, setMonthlyMonths] = useState(6)
  const [payouts, setPayouts] = useState<InstructorPayout[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [coursesPage, setCoursesPage] = useState(1)
  const [transactions, setTransactions] = useState<InstructorEarning[]>([])
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1)
  const [transactionsTotalCount, setTransactionsTotalCount] = useState(0)

  const instructorId = instructorProfile?.id ?? null

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const profile = await getMyInstructorProfile(Number(user.id))
        if (cancelled) return
        setInstructorProfile(profile)
        const [sumRes, statsRes, monthlyRes, payoutRes] = await Promise.allSettled([
          getInstructorEarningsSummary(profile.id),
          getInstructorDashboardStats(),
          getInstructorEarningsMonthly(monthlyMonths, profile.id),
          getInstructorPayouts({ instructor_id: profile.id }),
        ])
        if (cancelled) return
        if (sumRes.status === 'fulfilled') setSummary(sumRes.value)
        if (statsRes.status === 'fulfilled') setDashStats(statsRes.value)
        if (monthlyRes.status === 'fulfilled') setMonthly(monthlyRes.value)
        if (payoutRes.status === 'fulfilled') setPayouts(payoutRes.value)
        if (sumRes.status === 'rejected' && statsRes.status === 'rejected') {
          setError(t('instructor_earnings_page.errors.load_earnings_data'))
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? t('instructor_earnings_page.errors.load_data'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [monthlyMonths, t, user])

  useEffect(() => {
    setTransactionsPage(1)
  }, [statusFilter, sourceFilter])

  useEffect(() => {
    if (!instructorId) return
    let cancelled = false
    async function loadTransactions() {
      setTransactionsLoading(true)
      try {
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
        if (!cancelled) console.error(t('instructor_earnings_page.errors.load_transactions_console'), err)
      } finally {
        if (!cancelled) setTransactionsLoading(false)
      }
    }
    loadTransactions()
    return () => { cancelled = true }
  }, [instructorId, sourceFilter, statusFilter, t, transactionsPage])

  if (!canAccess(['instructor'], ['instructor.earnings.view'])) {
    return <div className="container mx-auto p-6"><Card><CardContent className="p-6">{t('instructor_earnings_page.errors.no_permission')}</CardContent></Card></div>
  }
  if (loading) return <EarningsSkeleton />
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
    <motion.div className="container mx-auto px-4 py-8" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-8" variants={fadeInUp}>
        <h1 className="text-2xl font-bold mb-1">{t('instructor_earnings_page.title')}</h1>
        <p className="text-muted-foreground">{t('instructor_earnings_page.subtitle')}</p>
        {instructorProfile?.level && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-yellow-500 bg-yellow-50 text-yellow-700">
              <Crown className="mr-1 h-3 w-3 text-yellow-500" />
              {instructorProfile.level.name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Commission: {instructorProfile.level.commission_rate}% retail · {instructorProfile.level.plan_commission_rate}% subscription
            </span>
          </div>
        )}
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" variants={fadeInUp}>
        <Metric icon={<DollarSign className="h-8 w-8 text-green-500" />} value={formatEarningVND(totalNet)} label={t('instructor_earnings_page.metrics.total_net_income')} />
        <Metric icon={<Calendar className="h-8 w-8 text-blue-500" />} value={formatEarningVND(totalAmount)} label={t('instructor_earnings_page.metrics.total_gross_revenue')} />
        <Metric icon={<ShoppingCart className="h-8 w-8 text-purple-500" />} value={String(summary?.retail.count ?? 0)} label={t('instructor_earnings_page.metrics.retail')} />
        <Metric icon={<Layers className="h-8 w-8 text-orange-500" />} value={String(summary?.subscription.count ?? 0)} label={t('instructor_earnings_page.metrics.subscription_plan')} />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="relative grid w-full grid-cols-4 p-1">
            {[
              ['overview', t('instructor_earnings_page.tabs.overview')],
              ['courses', t('instructor_earnings_page.tabs.by_course')],
              ['transactions', t('instructor_earnings_page.tabs.transactions')],
              ['payouts', 'Payouts'],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {selectedTab === value && <motion.span layoutId="instructor-earnings-tabs-glider" className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                <span className="relative z-10">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>{t('instructor_earnings_page.overview.income_sources')}</CardTitle><CardDescription>{t('instructor_earnings_page.overview.distribution')}</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div><div className="flex justify-between mb-1"><span>{t('instructor_earnings_page.sources.retail')}</span><span className="font-medium">{formatEarningVND(retailAmount)} ({retailPct}%)</span></div><Progress value={retailPct} className="h-2" /></div>
                  <div><div className="flex justify-between mb-1"><span>{t('instructor_earnings_page.sources.subscription')}</span><span className="font-medium">{formatEarningVND(subAmount)} ({subPct}%)</span></div><Progress value={subPct} className="h-2" /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Monthly Net Earnings</CardTitle>
                  <Select value={String(monthlyMonths)} onValueChange={(value) => setMonthlyMonths(Number(value))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 6, 12].map((m) => <SelectItem key={m} value={String(m)}>{m} months</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}M`} />
                      <Tooltip formatter={(value) => formatEarningVND(Number(value))} />
                      <Legend />
                      <Area type="monotone" dataKey="retail_net" name="Retail" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} />
                      <Area type="monotone" dataKey="sub_net" name="Subscription" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-8">
            {courseStats.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">{t('instructor_earnings_page.empty.no_course_earnings')}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {paginatedCourses.map((cs, index) => (
                  <motion.div key={cs.course_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={listItemTransition(index)}>
                    <Card className="app-interactive">
                      <CardContent className="p-6">
                        <h3 className="font-semibold mb-3">{cs.title}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                          <CourseStat value={formatEarningVND(parseFloat(String(cs.earnings || 0)))} label={t('instructor_earnings_page.course_stats.earnings')} />
                          <CourseStat value={String(cs.total_students)} label={t('instructor_earnings_page.course_stats.students')} />
                          <CourseStat value={String(cs.new_students_this_month)} label={t('instructor_earnings_page.course_stats.new_this_month')} />
                          <CourseStat value={cs.rating?.toFixed(1) ?? '-'} label={t('instructor_earnings_page.course_stats.rating')} />
                          <CourseStat value={cs.completion_rate != null ? `${Math.round(cs.completion_rate)}%` : '-'} label={t('instructor_earnings_page.course_stats.completion')} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                <UserPagination currentPage={coursesPage} totalPages={courseTotalPages} onPageChange={setCoursesPage} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="mt-8">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div><CardTitle>{t('instructor_earnings_page.transactions.title')}</CardTitle><CardDescription>{t('instructor_earnings_page.transactions.description')}</CardDescription></div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{['all', 'pending', 'available', 'paid', 'cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{['all', 'retail', 'subscription'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? <TransactionSkeleton /> : transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('instructor_earnings_page.empty.no_transactions')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('instructor_earnings_page.transactions.headers.date')}</TableHead>
                        <TableHead>{t('instructor_earnings_page.transactions.headers.course')}</TableHead>
                        <TableHead>{t('instructor_earnings_page.transactions.headers.source')}</TableHead>
                        <TableHead className="text-right">{t('instructor_earnings_page.transactions.headers.revenue')}</TableHead>
                        <TableHead className="text-right">{t('instructor_earnings_page.transactions.headers.net_income')}</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead>{t('instructor_earnings_page.transactions.headers.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{new Date(e.earning_date).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{e.course_title ?? '-'}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{e.earning_source}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{formatEarningVND(parseEarningAmount(e.amount))}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">{formatEarningVND(parseEarningAmount(e.net_amount))}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{e.commission_rate_applied}%</TableCell>
                          <TableCell><Badge variant={getEarningStatusBadge(e.status)} className="capitalize">{e.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {transactionsTotalCount > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      {t('instructor_earnings_page.pagination.showing_transactions', { from: transactionStart, to: transactionEnd, total: transactionsTotalCount })}
                    </div>
                    <UserPagination currentPage={transactionsPage} totalPages={transactionsTotalPages} onPageChange={setTransactionsPage} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-8">
            <Card>
              <CardHeader><CardTitle>Payouts</CardTitle><CardDescription>Processed and pending instructor payouts.</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Fee</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Status</TableHead><TableHead>Processed Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payouts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No payouts yet</TableCell></TableRow>
                    ) : payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>{payout.period || '-'}</TableCell>
                        <TableCell className="text-right">{formatEarningVND(parseEarningAmount(payout.amount))}</TableCell>
                        <TableCell className="text-right">{formatEarningVND(parseEarningAmount(payout.fee))}</TableCell>
                        <TableCell className="text-right">{formatEarningVND(parseEarningAmount(payout.net_amount))}</TableCell>
                        <TableCell><Badge className={getPayoutStatusColor(payout.status)}>{getPayoutStatusLabel(payout.status)}</Badge></TableCell>
                        <TableCell>{payout.processed_date ? new Date(payout.processed_date).toLocaleDateString('vi-VN') : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return <Card className="app-interactive"><CardContent className="p-6"><div className="flex items-center gap-3">{icon}<div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div></div></CardContent></Card>
}

function CourseStat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-xl font-bold text-green-600">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
}

function EarningsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-52" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

function TransactionSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-9 w-full" />)}
    </div>
  )
}
