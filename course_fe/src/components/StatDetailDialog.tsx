import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface StatDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  type: 'users' | 'courses' | 'revenue' | 'completions'
  currentValue: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function StatDetailDialog({ open, onOpenChange, title, type, currentValue }: StatDetailDialogProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  // Mock data generators
  const generateTrendData = () => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
    const data = []
    const baseValue = currentValue / days
    
    for (let i = 0; i < days; i++) {
      const variation = Math.random() * 0.3 - 0.15 // ±15% variation
      data.push({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
        value: Math.round(baseValue * (1 + variation))
      })
    }
    return data
  }

  const generateHourlyData = () => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      value: Math.round(Math.random() * 1000 + 500)
    }))
  }

  const generateCategoryData = () => {
    if (type === 'users') {
      return [
        { name: 'Students', value: Math.round(currentValue * 0.85) },
        { name: 'Instructors', value: Math.round(currentValue * 0.12) },
        { name: 'Admins', value: Math.round(currentValue * 0.03) }
      ]
    } else if (type === 'courses') {
      return [
        { name: 'Development', value: Math.round(currentValue * 0.35) },
        { name: 'Business', value: Math.round(currentValue * 0.25) },
        { name: 'Design', value: Math.round(currentValue * 0.20) },
        { name: 'Marketing', value: Math.round(currentValue * 0.12) },
        { name: 'Other', value: Math.round(currentValue * 0.08) }
      ]
    } else if (type === 'revenue') {
      return [
        { name: 'Course Sales', value: Math.round(currentValue * 0.70) },
        { name: 'Subscriptions', value: Math.round(currentValue * 0.20) },
        { name: 'Other', value: Math.round(currentValue * 0.10) }
      ]
    } else {
      return [
        { name: 'Complete', value: Math.round(currentValue * 0.65) },
        { name: 'In Progress', value: Math.round(currentValue * 0.30) },
        { name: 'Abandoned', value: Math.round(currentValue * 0.05) }
      ]
    }
  }

  const generateGrowthData = () => {
    return [
      { month: 'Jan', value: Math.round(currentValue * 0.65) },
      { month: 'Feb', value: Math.round(currentValue * 0.72) },
      { month: 'Mar', value: Math.round(currentValue * 0.78) },
      { month: 'Apr', value: Math.round(currentValue * 0.83) },
      { month: 'May', value: Math.round(currentValue * 0.88) },
      { month: 'Jun', value: Math.round(currentValue * 0.92) },
      { month: 'Jul', value: Math.round(currentValue * 0.95) },
      { month: 'Aug', value: Math.round(currentValue * 0.97) },
      { month: 'Sep', value: Math.round(currentValue * 0.99) },
      { month: 'Oct', value: Math.round(currentValue * 1.00) }
    ]
  }

  const trendData = generateTrendData()
  const hourlyData = generateHourlyData()
  const categoryData = generateCategoryData()
  const growthData = generateGrowthData()

  // Calculate statistics
  const calculateStats = () => {
    const values = trendData.map(d => d.value)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const max = Math.max(...values)
    const min = Math.min(...values)
    const growth = ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1)
    
    return { avg: Math.round(avg), max, min, growth }
  }

  const stats = calculateStats()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title} - Thống Kê Chi Tiết</DialogTitle>
          <DialogDescription>
            Phân tích chi tiết và xu hướng theo thời gian
          </DialogDescription>
        </DialogHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Hiện Tại</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{currentValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Trung Bình</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats.avg.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Cao Nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{stats.max.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Tăng Trưởng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${parseFloat(stats.growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.growth}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-4 py-2 rounded ${period === '7d' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            7 Ngày
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-4 py-2 rounded ${period === '30d' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            30 Ngày
          </button>
          <button
            onClick={() => setPeriod('90d')}
            className={`px-4 py-2 rounded ${period === '90d' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            90 Ngày
          </button>
          <button
            onClick={() => setPeriod('1y')}
            className={`px-4 py-2 rounded ${period === '1y' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          >
            1 Năm
          </button>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trend">Xu Hướng</TabsTrigger>
            <TabsTrigger value="hourly">Theo Giờ</TabsTrigger>
            <TabsTrigger value="category">Phân Loại</TabsTrigger>
            <TabsTrigger value="growth">Tăng Trưởng</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Biểu Đồ Xu Hướng</CardTitle>
                <CardDescription>Theo dõi biến động theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hourly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thống Kê Theo Giờ</CardTitle>
                <CardDescription>Hoạt động trong 24 giờ</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="category" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân Loại Chi Tiết</CardTitle>
                <CardDescription>Phân bổ theo danh mục</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-2">
                    {categoryData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tăng Trưởng Theo Tháng</CardTitle>
                <CardDescription>10 tháng gần nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
