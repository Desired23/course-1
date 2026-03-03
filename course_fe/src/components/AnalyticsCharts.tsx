import { useState, useEffect } from "react"
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { TrendingUp, TrendingDown, DollarSign, Users, BookOpen, Star } from "lucide-react"
import { cn } from "./ui/utils"
import { getInstructorDashboardStats, getInstructorAnalyticsTimeseries } from "../services/instructor.api"
import { formatCurrency } from "../utils/formatters"

interface AnalyticsChartsProps {
  type?: 'platform' | 'course' | 'instructor'
  className?: string
}

export function AnalyticsCharts({ type = 'platform', className }: AnalyticsChartsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line')

  const CATEGORY_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  // API-driven state
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [engagementData, setEngagementData] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([
    { label: 'Total Revenue', value: '...', change: '-', trend: 'up', icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
    { label: 'Total Students', value: '...', change: '-', trend: 'up', icon: Users, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Active Courses', value: '...', change: '-', trend: 'up', icon: BookOpen, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Avg Rating', value: '...', change: '-', trend: 'up', icon: Star, color: 'text-yellow-600 dark:text-yellow-400' },
  ])

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const monthsMap: Record<string, number> = { '7d': 1, '30d': 3, '90d': 6, '1y': 12 }
        const months = monthsMap[timeRange] || 12

        const [dashStats, timeseries] = await Promise.all([
          getInstructorDashboardStats(),
          getInstructorAnalyticsTimeseries(months),
        ])

        // Map revenue + enrollment timeseries into chart data
        const revData = timeseries.revenue_trend.map((r, i) => {
          const enr = timeseries.enrollment_trend[i]
          const monthLabel = new Date(r.date + '-01').toLocaleString('en', { month: 'short' })
          return {
            name: monthLabel,
            revenue: r.revenue,
            students: enr?.enrollments ?? 0,
            courses: dashStats.total_courses,
          }
        })
        setRevenueData(revData)

        // Map course_stats as category-like pie data
        const catData = dashStats.course_stats.slice(0, 6).map((c, i) => ({
          name: c.title.length > 20 ? c.title.slice(0, 20) + '…' : c.title,
          value: c.total_students,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        }))
        setCategoryData(catData)

        // Map engagement timeseries
        const engData = timeseries.engagement_trend.map((e) => {
          const monthLabel = new Date(e.date + '-01').toLocaleString('en', { month: 'short' })
          return {
            name: monthLabel,
            completionRate: e.completions,
            avgTime: e.active_learners,
            satisfaction: 0,
          }
        })
        setEngagementData(engData)

        // Stats cards
        setStats([
          {
            label: 'Total Revenue',
            value: formatCurrency(dashStats.total_earnings),
            change: `+${formatCurrency(dashStats.this_month_earnings)} this month`,
            trend: 'up',
            icon: DollarSign,
            color: 'text-green-600 dark:text-green-400',
          },
          {
            label: 'Total Students',
            value: dashStats.total_students.toLocaleString(),
            change: `+${dashStats.new_students_this_month} this month`,
            trend: 'up',
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'Active Courses',
            value: dashStats.published_courses.toLocaleString(),
            change: `${dashStats.draft_courses} drafts`,
            trend: 'up',
            icon: BookOpen,
            color: 'text-purple-600 dark:text-purple-400',
          },
          {
            label: 'Avg Rating',
            value: String(dashStats.average_rating),
            change: `${dashStats.total_reviews} reviews`,
            trend: dashStats.average_rating >= 4 ? 'up' : 'down',
            icon: Star,
            color: 'text-yellow-600 dark:text-yellow-400',
          },
        ])
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      }
    }
    fetchAnalytics()
  }, [timeRange])

  const renderChart = (data: any[], dataKey: string, color: string) => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    }

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#color${dataKey})`} 
            />
          </AreaChart>
        )
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const isPositive = stat.trend === 'up'
          
          return (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center",
                  "bg-muted"
                )}>
                  <Icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-sm",
                  isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Revenue Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-medium mb-1">Revenue Overview</h3>
            <p className="text-sm text-muted-foreground">
              Track your earnings over time
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          {renderChart(revenueData, 'revenue', '#8b5cf6')}
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students Chart */}
        <Card className="p-6">
          <h3 className="font-medium mb-1">Student Growth</h3>
          <p className="text-sm text-muted-foreground mb-6">
            New student enrollments
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={revenueData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="students" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorStudents)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Distribution */}
        <Card className="p-6">
          <h3 className="font-medium mb-1">Course Categories</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Enrollment by category
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card className="p-6">
        <h3 className="font-medium mb-1">Student Engagement</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Completion rates and satisfaction scores
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={engagementData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Bar dataKey="completionRate" fill="#10b981" radius={[8, 8, 0, 0]} name="Completion Rate %" />
            <Bar dataKey="satisfaction" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Satisfaction Score" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
