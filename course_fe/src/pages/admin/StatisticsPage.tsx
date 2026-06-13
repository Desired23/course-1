import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, Users, BookOpen, DollarSign, Star, Download, Calendar, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getAdminDashboardStats, getAdminRevenueAnalytics, getAdminUserAnalytics, getAdminCourseAnalytics, getAdminRevenueMonthlyBreakdown, getAdminCommissionAnalytics, exportAdminRevenue } from '../../services/admin.api'
import { useTranslation } from 'react-i18next'

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

export function StatisticsPage() {
  const { t } = useTranslation()
  const { canAccess } = useAuth()
  const [chartType, setChartType] = useState('bar')
  const [timeRange, setTimeRange] = useState('6months')
  const [activeTab, setActiveTab] = useState('overview')

  const [revenueData, setRevenueData] = useState<any[]>([])
  const [userGrowth, setUserGrowth] = useState<any[]>([])
  const [detailedCourses, setDetailedCourses] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)

  useEffect(() => {
    const ensureArray = <T,>(payload: unknown): T[] => {
      if (Array.isArray(payload)) return payload as T[]
      if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[]
      }
      return []
    }

    async function load() {
      try {
        const [dashStats, revenue, users, courses] = await Promise.all([
          getAdminDashboardStats().catch(() => null),
          getAdminRevenueAnalytics(timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : timeRange === '1year' ? 12 : 6).catch(() => []),
          getAdminUserAnalytics(timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : timeRange === '1year' ? 12 : 6).catch(() => []),
          getAdminCourseAnalytics().catch(() => []),
        ])
        if (dashStats) setStats(dashStats)
        const revenueRows = ensureArray<any>(revenue)
        const userRows = ensureArray<any>(users)
        const courseRows = ensureArray<any>(courses)

        setRevenueData(revenueRows.map((r: any) => ({
          month: r.date,
          revenue: r.revenue,
          courses: 0,
          students: 0
        })))
        setUserGrowth(userRows.map((u: any) => ({
          date: u.date,
          students: u.new_users,
          instructors: 0
        })))
        setDetailedCourses(courseRows.map((c: any) => ({
          id: c.course_id,
          title: c.title,
          instructor: c.instructor_name || t('admin_statistics.not_available'),
          students: c.enrollment_count,
          revenue: c.revenue ?? 0,
          rating: c.rating,
          status: c.status || 'active'
        })))
      } catch (e) {
        console.error('Failed to load statistics', e)
      }
    }
    load()
  }, [timeRange])

  const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleMonthlyReport = async () => {
    setGeneratingReport('monthly')
    try {
      const data = await getAdminRevenueMonthlyBreakdown(12)
      const rows = [
        [t('admin_statistics.reports.csv.month'), t('admin_statistics.reports.csv.retail'), t('admin_statistics.reports.csv.subscription'), t('admin_statistics.reports.csv.gross'), t('admin_statistics.reports.csv.refunded'), t('admin_statistics.reports.csv.net')],
        ...data.map(r => [r.date, String(r.retail), String(r.subscription), String(r.gross), String(r.refunded), String(r.net)]),
      ]
      downloadCsv(rows, `monthly_report_${new Date().toISOString().slice(0, 7)}.csv`)
      toast.success(t('admin_statistics.reports.toast.success'))
    } catch {
      toast.error(t('admin_statistics.reports.toast.error'))
    } finally {
      setGeneratingReport(null)
    }
  }

  const handleInstructorReport = async () => {
    setGeneratingReport('instructor')
    try {
      const data = await getAdminCommissionAnalytics()
      const rows = [
        [t('admin_statistics.reports.csv.instructor'), t('admin_statistics.reports.csv.gross'), t('admin_statistics.reports.csv.earnings'), t('admin_statistics.reports.csv.retail_earnings'), t('admin_statistics.reports.csv.sub_earnings'), t('admin_statistics.reports.csv.pending'), t('admin_statistics.reports.csv.available'), t('admin_statistics.reports.csv.paid')],
        ...data.per_instructor.map(r => [
          r.instructor_name ?? t('admin_statistics.not_available'),
          String(r.gross),
          String(r.total_earnings),
          String(r.retail_earnings),
          String(r.sub_earnings),
          String(r.pending),
          String(r.available),
          String(r.paid),
        ]),
      ]
      downloadCsv(rows, `instructor_performance_${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(t('admin_statistics.reports.toast.success'))
    } catch {
      toast.error(t('admin_statistics.reports.toast.error'))
    } finally {
      setGeneratingReport(null)
    }
  }

  const handleRevenueReport = async () => {
    setGeneratingReport('revenue')
    try {
      await exportAdminRevenue('csv')
      toast.success(t('admin_statistics.reports.toast.success'))
    } catch {
      toast.error(t('admin_statistics.reports.toast.error'))
    } finally {
      setGeneratingReport(null)
    }
  }

  if (!canAccess(['admin'], ['admin.statistics.view'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('admin_statistics.permission_denied')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#8884d8" />
              <Bar dataKey="courses" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        )
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="students" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="students" stackId="1" stroke="#8884d8" fill="#8884d8" />
              <Area type="monotone" dataKey="instructors" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        )
      default:
        return null
    }
  }

  return (
    <motion.div
      className="p-6 space-y-6 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl font-bold">{t('admin_statistics.title')}</h1>
          <p className="text-muted-foreground">{t('admin_statistics.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportAdminRevenue()}>
            <Download className="h-4 w-4 mr-2" />
            {t('admin_statistics.export')}
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Calendar className="h-4 w-4 mr-2" />
            {t('admin_statistics.schedule_report')}
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="relative grid w-full grid-cols-4 p-1">
          <TabsTrigger value="overview" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'overview' && <motion.span layoutId="statistics-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_statistics.tabs.overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="detailed" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'detailed' && <motion.span layoutId="statistics-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_statistics.tabs.detailed')}</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'trends' && <motion.span layoutId="statistics-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_statistics.tabs.trends')}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'reports' && <motion.span layoutId="statistics-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('admin_statistics.tabs.reports')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin_statistics.metrics.total_revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.total_revenue || 0).toLocaleString('vi-VN')}₫</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {t('admin_statistics.metrics.this_month_revenue', { amount: (stats.this_month_revenue || 0).toLocaleString() })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin_statistics.metrics.active_students')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.active_students || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {t('admin_statistics.metrics.new_users_this_month', { count: stats.new_users_this_month || 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin_statistics.metrics.published_courses')}</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.published_courses || 0}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {t('admin_statistics.metrics.pending_courses', { count: stats.pending_courses || 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin_statistics.metrics.average_rating')}</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.platform_rating || 0}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {t('admin_statistics.metrics.from_last_month')}
                </p>
              </CardContent>
            </Card>
          </div>


          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('admin_statistics.revenue_analytics.title')}</CardTitle>
                  <CardDescription>{t('admin_statistics.revenue_analytics.description')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">{t('admin_statistics.charts.bar')}</SelectItem>
                      <SelectItem value="line">{t('admin_statistics.charts.line')}</SelectItem>
                      <SelectItem value="area">{t('admin_statistics.charts.area')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1month">{t('admin_statistics.time_ranges.1month')}</SelectItem>
                      <SelectItem value="3months">{t('admin_statistics.time_ranges.3months')}</SelectItem>
                      <SelectItem value="6months">{t('admin_statistics.time_ranges.6months')}</SelectItem>
                      <SelectItem value="1year">{t('admin_statistics.time_ranges.1year')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('admin_statistics.course_performance.title')}</CardTitle>
                  <CardDescription>{t('admin_statistics.course_performance.description')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Filter className="h-4 w-4 mr-2" />
                  {t('common.filter')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin_statistics.table.course_title')}</TableHead>
                    <TableHead>{t('admin_statistics.table.instructor')}</TableHead>
                    <TableHead>{t('admin_statistics.table.students')}</TableHead>
                    <TableHead>{t('admin_statistics.table.revenue')}</TableHead>
                    <TableHead>{t('admin_statistics.table.rating')}</TableHead>
                    <TableHead>{t('admin_statistics.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailedCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>{course.instructor}</TableCell>
                      <TableCell>{course.students.toLocaleString()}</TableCell>
                      <TableCell>{course.revenue.toLocaleString('vi-VN')}₫</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          {course.rating}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                          {course.status === 'active' ? t('admin_statistics.status.active') : t('admin_statistics.status.inactive')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_statistics.user_growth.title')}</CardTitle>
              <CardDescription>{t('admin_statistics.user_growth.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="students" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="instructors" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin_statistics.reports.monthly.title')}</CardTitle>
                <CardDescription>{t('admin_statistics.reports.monthly.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled={generatingReport !== null} onClick={handleMonthlyReport}>
                  <Download className="h-4 w-4 mr-2" />
                  {generatingReport === 'monthly' ? t('admin_statistics.reports.generating') : t('admin_statistics.generate_report')}
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin_statistics.reports.instructor.title')}</CardTitle>
                <CardDescription>{t('admin_statistics.reports.instructor.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled={generatingReport !== null} onClick={handleInstructorReport}>
                  <Download className="h-4 w-4 mr-2" />
                  {generatingReport === 'instructor' ? t('admin_statistics.reports.generating') : t('admin_statistics.generate_report')}
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin_statistics.reports.revenue.title')}</CardTitle>
                <CardDescription>{t('admin_statistics.reports.revenue.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled={generatingReport !== null} onClick={handleRevenueReport}>
                  <Download className="h-4 w-4 mr-2" />
                  {generatingReport === 'revenue' ? t('admin_statistics.reports.generating') : t('admin_statistics.generate_report')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </motion.div>
      </motion.div>
    </motion.div>
  )
}
