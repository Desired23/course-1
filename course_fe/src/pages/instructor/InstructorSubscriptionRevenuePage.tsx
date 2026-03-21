import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Input } from '../../components/ui/input'
import { UserPagination } from '../../components/UserPagination'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { 
  HelpCircle,
  Download,
  Info,
  Crown
} from 'lucide-react'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip"
import { getInstructorEarningsSummary, getInstructorSubscriptionRevenueBreakdown, parseEarningAmount } from '../../services/instructor-earnings.api'
import { getInstructorDashboardStats, getInstructorAnalyticsTimeseries } from '../../services/instructor.api'
import { useTranslation } from 'react-i18next'

export function InstructorSubscriptionRevenuePage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState('7d')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'earnings_desc' | 'earnings_asc' | 'share_desc' | 'share_asc' | 'course_asc' | 'course_desc'>('earnings_desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [courseBreakdown, setCourseBreakdown] = useState<any[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [qualifyingStudents, setQualifyingStudents] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const TOTAL_SYSTEM_MINUTES = 5000000
  const ITEMS_PER_PAGE = 8

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        const monthsMap: Record<string, number> = { '7d': 1, '30d': 3, '90d': 6 }
        const months = monthsMap[period] || 3

        const [summary, dashStats, timeseries] = await Promise.all([
          getInstructorEarningsSummary(),
          getInstructorDashboardStats(),
          getInstructorAnalyticsTimeseries(months),
        ])

        const subscriptionTotal = parseEarningAmount(summary.subscription.total_net_amount)
        setTotalEarnings(subscriptionTotal)
        setTotalMinutes(Math.round(subscriptionTotal * 100))
        setQualifyingStudents(dashStats.total_students)

        // Map timeseries to performance chart data
        const perfData = timeseries.revenue_trend.map((r) => {
          const dateLabel = new Date(r.date + '-01').toLocaleDateString('en', { day: '2-digit', month: '2-digit' })
          return {
            date: dateLabel,
            minutes: Math.round(r.revenue * 10), // Approximation
            earnings: r.revenue,
          }
        })
        setPerformanceData(perfData)
      } catch (err) {
        console.error('Failed to fetch subscription revenue overview:', err)
      }
    }
    fetchOverviewData()
  }, [period])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])

  useEffect(() => {
    let cancelled = false
    async function fetchBreakdownPage() {
      try {
        setListLoading(true)
        const response = await getInstructorSubscriptionRevenueBreakdown({
          search: searchQuery || undefined,
          sort_by: sortBy,
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
        })

        if (cancelled) return
        const mappedRows = (response.results || []).map((row) => {
          const earnings = parseEarningAmount(row.earnings)
          return {
            id: row.course_id,
            title: row.course_title || t('instructor_subscription_revenue.unknown_course'),
            totalMinutes: row.total_minutes ?? Math.round(earnings * 100),
            share: row.share_pct || '0.0000',
            earnings,
            engagementType: t('instructor_subscription_revenue.engagement_type'),
          }
        })

        setCourseBreakdown(mappedRows)
        setTotalCount(response.count || 0)
        setTotalPages(response.total_pages || 1)
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch subscription revenue list:', err)
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }

    fetchBreakdownPage()
    return () => {
      cancelled = true
    }
  }, [currentPage, searchQuery, sortBy])

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{t('instructor_subscription_revenue.title')}</h1>
            <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">
              {t('instructor_subscription_revenue.new_model_badge')}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {t('instructor_subscription_revenue.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('instructor_subscription_revenue.period_7d')}</SelectItem>
              <SelectItem value="30d">{t('instructor_subscription_revenue.period_30d')}</SelectItem>
              <SelectItem value="90d">{t('instructor_subscription_revenue.period_90d')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> {t('instructor_subscription_revenue.export_report')}
          </Button>
        </div>
      </div>

      {/* Model Explanation Alert */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="bg-white dark:bg-blue-950 p-3 rounded-full h-fit shadow-sm">
             <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
               {t('instructor_subscription_revenue.pool_model_title')}
            </h4>
            <div className="mt-2 text-sm text-blue-800 dark:text-blue-300 space-y-2">
               <p>
                 {t('instructor_subscription_revenue.pool_model_intro_before')}
                 <strong>{t('instructor_subscription_revenue.pool_model_intro_highlight')}</strong>
                 {t('instructor_subscription_revenue.pool_model_intro_after')}
               </p>
               
               <div className="bg-white/60 dark:bg-black/20 p-3 rounded border border-blue-100 dark:border-blue-800/50 flex flex-wrap gap-4 items-center font-mono text-xs md:text-sm">
                  <span className="font-bold">{t('instructor_subscription_revenue.formula_revenue')}</span>
                  <div className="flex flex-col items-center">
                     <span className="border-b border-black dark:border-white px-2">{t('instructor_subscription_revenue.formula_your_minutes')}</span>
                     <span>{t('instructor_subscription_revenue.formula_total_minutes')}</span>
                  </div>
                  <span>?</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{t('instructor_subscription_revenue.formula_total_pool')}</span>
               </div>
               
               <p className="text-xs mt-2 italic flex items-center gap-1">
                 <Info className="w-3 h-3" />
                 {t('instructor_subscription_revenue.engagement_includes')}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('instructor_subscription_revenue.total_earnings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center text-green-600">
              ${totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
               {t('instructor_subscription_revenue.cents_per_minute', { value: (totalEarnings / totalMinutes * 100).toFixed(4) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('instructor_subscription_revenue.total_engagement')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {totalMinutes.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">{t('instructor_subscription_revenue.minutes_short')}</span>
            </div>
            <div className="flex gap-1 mt-1">
               <Badge variant="secondary" className="text-[10px] h-4">{t('instructor_subscription_revenue.video')}</Badge>
               <Badge variant="secondary" className="text-[10px] h-4">{t('instructor_subscription_revenue.coding')}</Badge>
               <Badge variant="secondary" className="text-[10px] h-4">{t('instructor_subscription_revenue.quiz')}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
             <TooltipProvider>
               <UITooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1">
                     <CardTitle className="text-sm font-medium text-muted-foreground">{t('instructor_subscription_revenue.pool_share')}</CardTitle>
                     <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                     <p>{t('instructor_subscription_revenue.pool_share_tooltip')}</p>
                  </TooltipContent>
               </UITooltip>
             </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {((totalMinutes / TOTAL_SYSTEM_MINUTES) * 100).toFixed(4)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('instructor_subscription_revenue.platform_usage_share')}</p>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('instructor_subscription_revenue.qualifying_students')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifyingStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('instructor_subscription_revenue.paid_subscribers_only')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t('instructor_subscription_revenue.earnings_vs_engagement')}</CardTitle>
            <CardDescription>{t('instructor_subscription_revenue.earnings_vs_engagement_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                  <Tooltip 
                     formatter={(value: any, name: any) => [
                        name === t('instructor_subscription_revenue.chart_earnings') ? `$${value.toFixed(2)}` : value, 
                        name
                     ]}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="earnings" name={t('instructor_subscription_revenue.chart_earnings')} stroke="#3b82f6" fillOpacity={1} fill="url(#colorEarnings)" />
                  <Area yAxisId="right" type="monotone" dataKey="minutes" name={t('instructor_subscription_revenue.chart_engagement')} stroke="#10b981" fill="transparent" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t('instructor_subscription_revenue.course_contribution')}</CardTitle>
            <CardDescription>{t('instructor_subscription_revenue.course_contribution_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="title" type="category" width={150} style={{ fontSize: '12px' }} />
                  <Tooltip 
                     formatter={(value: any, name: any) => [
                        name === t('instructor_subscription_revenue.chart_earnings') ? `$${value.toFixed(2)}` : value, 
                        name
                     ]}
                  />
                  <Bar dataKey="earnings" name={t('instructor_subscription_revenue.chart_earnings')} fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('instructor_subscription_revenue.engagement_details')}</CardTitle>
          <CardDescription>{t('instructor_subscription_revenue.engagement_details_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Input
              className="md:col-span-2"
              placeholder={t('instructor_subscription_revenue.search_placeholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'earnings_desc' | 'earnings_asc' | 'share_desc' | 'share_asc' | 'course_asc' | 'course_desc')}>
              <SelectTrigger>
                <SelectValue placeholder={t('instructor_subscription_revenue.sort_by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earnings_desc">{t('instructor_subscription_revenue.sort_highest_revenue')}</SelectItem>
                <SelectItem value="earnings_asc">{t('instructor_subscription_revenue.sort_lowest_revenue')}</SelectItem>
                <SelectItem value="share_desc">{t('instructor_subscription_revenue.sort_highest_share')}</SelectItem>
                <SelectItem value="share_asc">{t('instructor_subscription_revenue.sort_lowest_share')}</SelectItem>
                <SelectItem value="course_asc">{t('instructor_subscription_revenue.sort_course_asc')}</SelectItem>
                <SelectItem value="course_desc">{t('instructor_subscription_revenue.sort_course_desc')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('instructor_subscription_revenue.course_name')}</TableHead>
                <TableHead>{t('instructor_subscription_revenue.included_activities')}</TableHead>
                <TableHead className="text-right">{t('instructor_subscription_revenue.minutes_total')}</TableHead>
                <TableHead className="text-right">{t('instructor_subscription_revenue.pool_share_percent')}</TableHead>
                <TableHead className="text-right">{t('instructor_subscription_revenue.revenue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!listLoading && courseBreakdown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    {t('instructor_subscription_revenue.no_data')}
                  </TableCell>
                </TableRow>
              )}
              {courseBreakdown.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>
                     <Badge variant="outline" className="text-xs font-normal">
                        {course.engagementType}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">{course.totalMinutes.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{course.share}%</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    ${course.earnings.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {listLoading && (
            <div className="mt-4 text-sm text-muted-foreground">{t('instructor_subscription_revenue.loading_data')}</div>
          )}
          {totalCount > 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">
                {t('instructor_subscription_revenue.pagination_summary', { currentPage, totalPages, totalCount })}
              </div>
              <UserPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
