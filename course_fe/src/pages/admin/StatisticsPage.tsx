import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, Users, BookOpen, DollarSign, Star, Download, Calendar, Filter } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminDashboardStats, getAdminRevenueAnalytics, getAdminUserAnalytics, getAdminCourseAnalytics } from '../../services/admin.api'
import { getAllCategories } from '../../services/category.api'
import { useTranslation } from 'react-i18next'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#ff6b6b', '#4ecdc4', '#45b7d1']

export function StatisticsPage() {
  const { t } = useTranslation()
  const { canAccess } = useAuth()
  const [chartType, setChartType] = useState('bar')
  const [timeRange, setTimeRange] = useState('6months')
  const [activeTab, setActiveTab] = useState('overview')

  const [revenueData, setRevenueData] = useState<any[]>([])
  const [courseCategories, setCourseCategories] = useState<any[]>([])
  const [userGrowth, setUserGrowth] = useState<any[]>([])
  const [detailedCourses, setDetailedCourses] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})

  useEffect(() => {
    async function load() {
      try {
        const [dashStats, revenue, users, courses, categories] = await Promise.all([
          getAdminDashboardStats().catch(() => null),
          getAdminRevenueAnalytics(6).catch(() => []),
          getAdminUserAnalytics(6).catch(() => []),
          getAdminCourseAnalytics().catch(() => []),
          getAllCategories().catch(() => [])
        ])
        if (dashStats) setStats(dashStats)
        setRevenueData(revenue.map((r: any) => ({
          month: r.date,
          revenue: r.revenue,
          courses: 0,
          students: 0
        })))
        setUserGrowth(users.map((u: any) => ({
          date: u.date,
          students: u.new_users,
          instructors: 0
        })))
        setDetailedCourses(courses.map((c: any) => ({
          id: c.course_id,
          title: c.title,
          instructor: c.instructor_name || t('admin_statistics.not_available'),
          students: c.enrollment_count,
          revenue: 0,
          rating: c.rating,
          status: 'active'
        })))
        setCourseCategories(categories.map((cat: any, idx: number) => ({
          name: cat.name,
          value: cat.course_count || 1,
          color: COLORS[idx % COLORS.length]
        })))
      } catch (e) {
        console.error('Failed to load statistics', e)
      }
    }
    load()
  }, [])

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
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={courseCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {courseCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6 space-y-6 overflow-x-hidden">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('admin_statistics.title')}</h1>
          <p className="text-muted-foreground">{t('admin_statistics.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('admin_statistics.export')}
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {t('admin_statistics.schedule_report')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('admin_statistics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="detailed">{t('admin_statistics.tabs.detailed')}</TabsTrigger>
          <TabsTrigger value="trends">{t('admin_statistics.tabs.trends')}</TabsTrigger>
          <TabsTrigger value="reports">{t('admin_statistics.tabs.reports')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin_statistics.metrics.total_revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(stats.total_revenue || 0).toLocaleString()}</div>
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

          {/* Chart Controls */}
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
                      <SelectItem value="pie">{t('admin_statistics.charts.pie')}</SelectItem>
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
                <Button variant="outline" size="sm">
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
                      <TableCell>${course.revenue.toLocaleString()}</TableCell>
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
          <div className="grid gap-6 md:grid-cols-2">
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

            <Card>
              <CardHeader>
                <CardTitle>{t('admin_statistics.course_categories.title')}</CardTitle>
                <CardDescription>{t('admin_statistics.course_categories.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={courseCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {courseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin_statistics.reports.monthly.title')}</CardTitle>
                <CardDescription>{t('admin_statistics.reports.monthly.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">{t('admin_statistics.generate_report')}</Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin_statistics.reports.instructor.title')}</CardTitle>
                <CardDescription>{t('admin_statistics.reports.instructor.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">{t('admin_statistics.generate_report')}</Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin_statistics.reports.revenue.title')}</CardTitle>
                <CardDescription>{t('admin_statistics.reports.revenue.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">{t('admin_statistics.generate_report')}</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
