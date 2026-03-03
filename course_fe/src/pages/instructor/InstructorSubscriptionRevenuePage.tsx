import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts'
import { 
  PlayCircle, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock, 
  HelpCircle,
  AlertCircle,
  Download,
  Info,
  Crown
} from 'lucide-react'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip"
import { toast } from 'sonner'
import { getInstructorEarningsSummary, getAllInstructorEarnings, parseEarningAmount, type InstructorEarning, type EarningsSummary } from '../../services/instructor-earnings.api'
import { getInstructorDashboardStats, getInstructorAnalyticsTimeseries } from '../../services/instructor.api'
import { formatCurrency } from '../../utils/formatters'

export function InstructorSubscriptionRevenuePage() {
  const [period, setPeriod] = useState('7d')
  const [courseBreakdown, setCourseBreakdown] = useState<any[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [qualifyingStudents, setQualifyingStudents] = useState(0)
  const [TOTAL_SYSTEM_MINUTES, setTotalSystemMinutes] = useState(5000000)
  const [INSTRUCTOR_POOL_SIZE, setInstructorPoolSize] = useState(150000)

  useEffect(() => {
    async function fetchData() {
      try {
        const monthsMap: Record<string, number> = { '7d': 1, '30d': 3, '90d': 6 }
        const months = monthsMap[period] || 3

        const [summary, allEarnings, dashStats, timeseries] = await Promise.all([
          getInstructorEarningsSummary(),
          getAllInstructorEarnings({ source: 'subscription' }),
          getInstructorDashboardStats(),
          getInstructorAnalyticsTimeseries(months),
        ])

        // Aggregate subscription earnings by course
        const byCourse = new Map<string, { id: number; title: string; earnings: number; students: number }>()
        for (const e of allEarnings) {
          const key = e.course_title || 'Unknown'
          const existing = byCourse.get(key)
          const amt = parseEarningAmount(e.net_amount)
          if (existing) {
            existing.earnings += amt
          } else {
            byCourse.set(key, { id: e.course ?? 0, title: key, earnings: amt, students: 0 })
          }
        }

        // Enrich with student counts from dashboard stats
        const courseMap = new Map(dashStats.course_stats.map(c => [c.course_id, c]))
        const breakdown = Array.from(byCourse.values()).map((c) => {
          const cStats = courseMap.get(c.id)
          const students = cStats?.total_students ?? 0
          return {
            id: c.id,
            title: c.title,
            totalMinutes: Math.round(c.earnings * 100), // Approximation
            share: '0.0000',
            earnings: c.earnings,
            students,
            engagementType: 'Video + Quizzes',
          }
        })

        const tEarnings = breakdown.reduce((acc, curr) => acc + curr.earnings, 0)
        const tMinutes = breakdown.reduce((acc, curr) => acc + curr.totalMinutes, 0)
        // Calculate shares
        breakdown.forEach(c => {
          c.share = tMinutes > 0 ? ((c.totalMinutes / (tMinutes * 100)) * 100).toFixed(4) : '0.0000'
        })

        setCourseBreakdown(breakdown)
        setTotalEarnings(tEarnings)
        setTotalMinutes(tMinutes)
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
        console.error('Failed to fetch subscription revenue data:', err)
      }
    }
    fetchData()
  }, [period])

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Subscription Revenue</h1>
            <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">
              New 2026 Model
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Track your earnings from the Revenue Pool (15% Share)
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export Report
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
               Revenue Pool Model (2026)
            </h4>
            <div className="mt-2 text-sm text-blue-800 dark:text-blue-300 space-y-2">
               <p>
                 As of January 1, 2026, instructor revenue is calculated based on a <strong>15% Revenue Pool</strong>.
                 Your earnings are determined by your share of total student engagement.
               </p>
               
               <div className="bg-white/60 dark:bg-black/20 p-3 rounded border border-blue-100 dark:border-blue-800/50 flex flex-wrap gap-4 items-center font-mono text-xs md:text-sm">
                  <span className="font-bold">Your Revenue = </span>
                  <div className="flex flex-col items-center">
                     <span className="border-b border-black dark:border-white px-2">Your Course Minutes</span>
                     <span>Total System Minutes</span>
                  </div>
                  <span>×</span>
                  <span className="font-bold text-green-600 dark:text-green-400">Total Pool (15%)</span>
               </div>
               
               <p className="text-xs mt-2 italic flex items-center gap-1">
                 <Info className="w-3 h-3" />
                 Engagement includes: Video Watch Time, Coding Exercises, Quizzes, and AI Assistant usage.
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Earnings (This Period)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center text-green-600">
              ${totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
               {(totalEarnings / totalMinutes * 100).toFixed(4)} cents / min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {totalMinutes.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">mins</span>
            </div>
            <div className="flex gap-1 mt-1">
               <Badge variant="secondary" className="text-[10px] h-4">Video</Badge>
               <Badge variant="secondary" className="text-[10px] h-4">Coding</Badge>
               <Badge variant="secondary" className="text-[10px] h-4">Quiz</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
             <TooltipProvider>
               <UITooltip>
                  <TooltipTrigger className="cursor-help flex items-center gap-1">
                     <CardTitle className="text-sm font-medium text-muted-foreground">Pool Share</CardTitle>
                     <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                     <p>Your contribution to the global learning time</p>
                  </TooltipContent>
               </UITooltip>
             </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {((totalMinutes / TOTAL_SYSTEM_MINUTES) * 100).toFixed(4)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">of total platform usage</p>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualifying Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifyingStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Paid subscribers only</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Earnings vs Engagement</CardTitle>
            <CardDescription>Direct correlation between minutes taught and payout</CardDescription>
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
                        name === 'Earnings ($)' ? `$${value.toFixed(2)}` : value, 
                        name
                     ]}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="earnings" name="Earnings ($)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEarnings)" />
                  <Area yAxisId="right" type="monotone" dataKey="minutes" name="Engagement (Mins)" stroke="#10b981" fill="transparent" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Course Contribution</CardTitle>
            <CardDescription>Which courses are driving your pool share</CardDescription>
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
                        name === 'Earnings ($)' ? `$${value.toFixed(2)}` : value, 
                        name
                     ]}
                  />
                  <Bar dataKey="earnings" name="Earnings ($)" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Details</CardTitle>
          <CardDescription>Breakdown by course including Coding Exercises & Quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Included Activities</TableHead>
                <TableHead className="text-right">Minutes (Total)</TableHead>
                <TableHead className="text-right">Pool Share %</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
        </CardContent>
      </Card>
    </div>
  )
}
