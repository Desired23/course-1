import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { UserPagination } from '../../components/UserPagination'
import { DollarSign, Calendar, ShoppingCart, Layers, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'motion/react'
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
import { useTranslation } from 'react-i18next'
import { listItemTransition } from '../../lib/motion'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
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
  const [instructorId, setInstructorId] = useState<number | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [coursesPage, setCoursesPage] = useState(1)

  const [transactions, setTransactions] = useState<InstructorEarning[]>([])
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1)
  const [transactionsTotalCount, setTransactionsTotalCount] = useState(0)

  const renderEarningsSkeleton = () => (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`instructor-earnings-skeleton-${index}`} className="rounded-lg border bg-card p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )

  const renderTransactionSkeleton = () => (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`earning-transaction-skeleton-${index}`} className="grid grid-cols-6 gap-3">
          <Skeleton className="h-9 col-span-1" />
          <Skeleton className="h-9 col-span-2" />
          <Skeleton className="h-9 col-span-1" />
          <Skeleton className="h-9 col-span-1" />
          <Skeleton className="h-9 col-span-1" />
        </div>
      ))}
    </div>
  )

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
  }, [t, user])

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
        if (!cancelled) console.error(t('instructor_earnings_page.errors.load_transactions_console'), err)
      } finally {
        if (!cancelled) setTransactionsLoading(false)
      }
    }
    loadTransactions()
    return () => { cancelled = true }
  }, [instructorId, transactionsPage, statusFilter, sourceFilter, t])

  function getSourceLabel(source: string) {
    return source === 'retail'
      ? t('instructor_earnings_page.sources.retail')
      : t('instructor_earnings_page.sources.subscription')
  }

  function getStatusLabel(status: string) {
    if (status === 'pending') return t('instructor_earnings_page.status.pending')
    if (status === 'available') return t('instructor_earnings_page.status.available')
    if (status === 'paid') return t('instructor_earnings_page.status.paid')
    if (status === 'cancelled') return t('instructor_earnings_page.status.cancelled')
    return status
  }

  if (!canAccess(['instructor'], ['instructor.earnings.view'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('instructor_earnings_page.errors.no_permission')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return renderEarningsSkeleton()
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
    <motion.div className="container mx-auto px-4 py-8" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-8" variants={fadeInUp}>
        <h1 className="text-2xl font-bold mb-1">{t('instructor_earnings_page.title')}</h1>
        <p className="text-muted-foreground">{t('instructor_earnings_page.subtitle')}</p>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" variants={fadeInUp}>
        <Card className="app-interactive"><CardContent className="p-6"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{formatEarningVND(totalNet)}</p><p className="text-sm text-muted-foreground">{t('instructor_earnings_page.metrics.total_net_income')}</p></div></div></CardContent></Card>
        <Card className="app-interactive"><CardContent className="p-6"><div className="flex items-center gap-3"><Calendar className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{formatEarningVND(totalAmount)}</p><p className="text-sm text-muted-foreground">{t('instructor_earnings_page.metrics.total_gross_revenue')}</p></div></div></CardContent></Card>
        <Card className="app-interactive"><CardContent className="p-6"><div className="flex items-center gap-3"><ShoppingCart className="h-8 w-8 text-purple-500" /><div><p className="text-2xl font-bold">{summary?.retail.count ?? 0}</p><p className="text-sm text-muted-foreground">{t('instructor_earnings_page.metrics.retail')}</p></div></div></CardContent></Card>
        <Card className="app-interactive"><CardContent className="p-6"><div className="flex items-center gap-3"><Layers className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{summary?.subscription.count ?? 0}</p><p className="text-sm text-muted-foreground">{t('instructor_earnings_page.metrics.subscription_plan')}</p></div></div></CardContent></Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="relative grid w-full grid-cols-3 p-1">
          <TabsTrigger value="overview" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {selectedTab === 'overview' && (
              <motion.span
                layoutId="instructor-earnings-tabs-glider"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-md bg-background shadow-sm"
              />
            )}
            <span className="relative z-10">{t('instructor_earnings_page.tabs.overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {selectedTab === 'courses' && (
              <motion.span
                layoutId="instructor-earnings-tabs-glider"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-md bg-background shadow-sm"
              />
            )}
            <span className="relative z-10">{t('instructor_earnings_page.tabs.by_course')}</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {selectedTab === 'transactions' && (
              <motion.span
                layoutId="instructor-earnings-tabs-glider"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-md bg-background shadow-sm"
              />
            )}
            <span className="relative z-10">{t('instructor_earnings_page.tabs.transactions')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{t('instructor_earnings_page.overview.income_sources')}</CardTitle><CardDescription>{t('instructor_earnings_page.overview.distribution')}</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div><div className="flex justify-between mb-1"><span>{t('instructor_earnings_page.sources.retail')}</span><span className="font-medium">{formatEarningVND(retailAmount)} ({retailPct}%)</span></div><Progress value={retailPct} className="h-2" /></div>
                <div><div className="flex justify-between mb-1"><span>{t('instructor_earnings_page.sources.subscription')}</span><span className="font-medium">{formatEarningVND(subAmount)} ({subPct}%)</span></div><Progress value={subPct} className="h-2" /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-8">
          {courseStats.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t('instructor_earnings_page.empty.no_course_earnings')}</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {paginatedCourses.map((cs) => (
                <motion.div
                  key={cs.course_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={listItemTransition(paginatedCourses.findIndex((c) => c.course_id === cs.course_id))}
                >
                <Card className="app-interactive">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">{cs.title}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div><p className="text-xl font-bold text-green-600">{formatEarningVND(parseFloat(String(cs.earnings || 0)))}</p><p className="text-xs text-muted-foreground">{t('instructor_earnings_page.course_stats.earnings')}</p></div>
                      <div><p className="text-xl font-bold">{cs.total_students}</p><p className="text-xs text-muted-foreground">{t('instructor_earnings_page.course_stats.students')}</p></div>
                      <div><p className="text-xl font-bold">{cs.new_students_this_month}</p><p className="text-xs text-muted-foreground">{t('instructor_earnings_page.course_stats.new_this_month')}</p></div>
                      <div><p className="text-xl font-bold">{cs.rating?.toFixed(1) ?? '-'}</p><p className="text-xs text-muted-foreground">{t('instructor_earnings_page.course_stats.rating')}</p></div>
                      <div><p className="text-xl font-bold">{cs.completion_rate != null ? `${Math.round(cs.completion_rate)}%` : '-'}</p><p className="text-xs text-muted-foreground">{t('instructor_earnings_page.course_stats.completion')}</p></div>
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
                <div>
                  <CardTitle>{t('instructor_earnings_page.transactions.title')}</CardTitle>
                  <CardDescription>{t('instructor_earnings_page.transactions.description')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder={t('instructor_earnings_page.filters.status')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('instructor_earnings_page.filters.all')}</SelectItem>
                      <SelectItem value="pending">{t('instructor_earnings_page.status.pending')}</SelectItem>
                      <SelectItem value="available">{t('instructor_earnings_page.status.available')}</SelectItem>
                      <SelectItem value="paid">{t('instructor_earnings_page.status.paid')}</SelectItem>
                      <SelectItem value="cancelled">{t('instructor_earnings_page.status.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder={t('instructor_earnings_page.filters.source')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('instructor_earnings_page.filters.all')}</SelectItem>
                      <SelectItem value="retail">{t('instructor_earnings_page.sources.retail')}</SelectItem>
                      <SelectItem value="subscription">{t('instructor_earnings_page.sources.subscription')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                renderTransactionSkeleton()
              ) : transactions.length === 0 ? (
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
                      <TableHead>{t('instructor_earnings_page.transactions.headers.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{new Date(e.earning_date).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{e.course_title ?? '-'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{getSourceLabel(e.earning_source)}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{formatEarningVND(parseEarningAmount(e.amount))}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatEarningVND(parseEarningAmount(e.net_amount))}</TableCell>
                        <TableCell><Badge variant={getEarningStatusBadge(e.status)} className="capitalize">{getStatusLabel(e.status)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {transactionsTotalCount > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    {t('instructor_earnings_page.pagination.showing_transactions', {
                      from: transactionStart,
                      to: transactionEnd,
                      total: transactionsTotalCount,
                    })}
                  </div>
                  <UserPagination currentPage={transactionsPage} totalPages={transactionsTotalPages} onPageChange={setTransactionsPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
    </motion.div>
  )
}
