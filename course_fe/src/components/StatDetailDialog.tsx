import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useTranslation } from "react-i18next"

interface StatDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  type: "users" | "courses" | "revenue" | "completions"
  currentValue: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function StatDetailDialog({ open, onOpenChange, title, type, currentValue }: StatDetailDialogProps) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d")

  const getCategoryData = () => {
    if (type === "users") {
      return [
        { name: t("stat_detail_dialog.categories.students"), value: Math.round(currentValue * 0.85) },
        { name: t("stat_detail_dialog.categories.instructors"), value: Math.round(currentValue * 0.12) },
        { name: t("stat_detail_dialog.categories.admins"), value: Math.round(currentValue * 0.03) },
      ]
    }
    if (type === "courses") {
      return [
        { name: t("stat_detail_dialog.categories.development"), value: Math.round(currentValue * 0.35) },
        { name: t("stat_detail_dialog.categories.business"), value: Math.round(currentValue * 0.25) },
        { name: t("stat_detail_dialog.categories.design"), value: Math.round(currentValue * 0.2) },
        { name: t("stat_detail_dialog.categories.marketing"), value: Math.round(currentValue * 0.12) },
        { name: t("stat_detail_dialog.categories.other"), value: Math.round(currentValue * 0.08) },
      ]
    }
    if (type === "revenue") {
      return [
        { name: t("stat_detail_dialog.categories.course_sales"), value: Math.round(currentValue * 0.7) },
        { name: t("stat_detail_dialog.categories.subscriptions"), value: Math.round(currentValue * 0.2) },
        { name: t("stat_detail_dialog.categories.other"), value: Math.round(currentValue * 0.1) },
      ]
    }
    return [
      { name: t("stat_detail_dialog.categories.complete"), value: Math.round(currentValue * 0.65) },
      { name: t("stat_detail_dialog.categories.in_progress"), value: Math.round(currentValue * 0.3) },
      { name: t("stat_detail_dialog.categories.abandoned"), value: Math.round(currentValue * 0.05) },
    ]
  }

  const generateTrendData = () => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365
    const data = []
    const baseValue = currentValue / days

    for (let i = 0; i < days; i++) {
      const variation = Math.random() * 0.3 - 0.15
      data.push({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN", {
          month: "short",
          day: "numeric",
        }),
        value: Math.round(baseValue * (1 + variation)),
      })
    }

    return data
  }

  const generateHourlyData = () =>
    Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      value: Math.round(Math.random() * 1000 + 500),
    }))

  const generateGrowthData = () => [
    { month: "Jan", value: Math.round(currentValue * 0.65) },
    { month: "Feb", value: Math.round(currentValue * 0.72) },
    { month: "Mar", value: Math.round(currentValue * 0.78) },
    { month: "Apr", value: Math.round(currentValue * 0.83) },
    { month: "May", value: Math.round(currentValue * 0.88) },
    { month: "Jun", value: Math.round(currentValue * 0.92) },
    { month: "Jul", value: Math.round(currentValue * 0.95) },
    { month: "Aug", value: Math.round(currentValue * 0.97) },
    { month: "Sep", value: Math.round(currentValue * 0.99) },
    { month: "Oct", value: Math.round(currentValue) },
  ]

  const trendData = generateTrendData()
  const hourlyData = generateHourlyData()
  const categoryData = getCategoryData()
  const growthData = generateGrowthData()

  const values = trendData.map((item) => item.value)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const max = Math.max(...values)
  const growth = ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {title} - {t("stat_detail_dialog.detail_statistics")}
          </DialogTitle>
          <DialogDescription>{t("stat_detail_dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{t("stat_detail_dialog.current")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{currentValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{t("stat_detail_dialog.average")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{Math.round(avg).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{t("stat_detail_dialog.highest")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{max.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{t("stat_detail_dialog.growth")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${parseFloat(growth) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {growth}%
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          {(["7d", "30d", "90d", "1y"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-4 py-2 rounded ${period === value ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              {t(`stat_detail_dialog.periods.${value}`)}
            </button>
          ))}
        </div>

        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trend">{t("stat_detail_dialog.tabs.trend")}</TabsTrigger>
            <TabsTrigger value="hourly">{t("stat_detail_dialog.tabs.hourly")}</TabsTrigger>
            <TabsTrigger value="category">{t("stat_detail_dialog.tabs.category")}</TabsTrigger>
            <TabsTrigger value="growth">{t("stat_detail_dialog.tabs.growth")}</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("stat_detail_dialog.trend_chart_title")}</CardTitle>
                <CardDescription>{t("stat_detail_dialog.trend_chart_description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
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
                <CardTitle>{t("stat_detail_dialog.hourly_chart_title")}</CardTitle>
                <CardDescription>{t("stat_detail_dialog.hourly_chart_description")}</CardDescription>
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
                <CardTitle>{t("stat_detail_dialog.category_chart_title")}</CardTitle>
                <CardDescription>{t("stat_detail_dialog.category_chart_description")}</CardDescription>
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
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
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
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
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
                <CardTitle>{t("stat_detail_dialog.growth_chart_title")}</CardTitle>
                <CardDescription>{t("stat_detail_dialog.growth_chart_description")}</CardDescription>
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
