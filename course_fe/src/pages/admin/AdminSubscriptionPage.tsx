import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Switch } from '../../components/ui/switch'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  DollarSign, 
  TrendingUp,
  Star,
  Crown,
  Gift,
  AlertCircle,
  CheckCircle,
  Pause,
  X,
  BarChart3,
  Target,
  Percent,
  Clock,
  Zap,
  Shield,
  Briefcase,
  Settings,
  Save,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { getAdminSubscriptionPlans, createSubscriptionPlan, getPlanSubscribers, getAdminRevenueAnalytics } from '../../services/admin.api'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  type: 'monthly' | 'yearly' | 'lifetime'
  price: number
  currency: string
  features: string[]
  isPopular: boolean
  isActive: boolean
  trialDays: number
  subscriberCount: number
  revenue: number
  churnRate: number
}

interface Subscription {
  id: string
  userId: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
  startDate: Date
  endDate: Date
  nextBillingDate: Date
  amount: number
  currency: string
  autoRenew: boolean
  user: {
    name: string
    email: string
  }
}



export function AdminSubscriptionPage() {
  const { canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false)
  
  // Settings State
  const [poolPercentage, setPoolPercentage] = useState('15')
  const [minPayoutThreshold, setMinPayoutThreshold] = useState('50')
  const [engagementRate, setEngagementRate] = useState('0.03')
  
  // Plans & Chart State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [revenueData, setRevenueData] = useState<{month: string; revenue: number}[]>([])
  const [planDistribution, setPlanDistribution] = useState<{name: string; value: number; color: string}[]>([])

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [isEditSubOpen, setIsEditSubOpen] = useState(false)
  const [extendDays, setExtendDays] = useState('30')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apiPlans, revTrend] = await Promise.all([
          getAdminSubscriptionPlans(),
          getAdminRevenueAnalytics(6)
        ])
        const mapped: SubscriptionPlan[] = apiPlans.map((p: any) => ({
          id: String(p.id),
          name: p.name || '',
          description: p.description || '',
          type: p.billing_cycle || 'monthly',
          price: Number(p.price) || 0,
          currency: 'VND',
          features: p.features ? (typeof p.features === 'string' ? JSON.parse(p.features) : p.features) : [],
          isPopular: !!p.is_popular,
          isActive: p.is_active !== false,
          trialDays: p.trial_days || 0,
          subscriberCount: p.subscriber_count || 0,
          revenue: Number(p.revenue) || 0,
          churnRate: p.churn_rate || 0
        }))
        setPlans(mapped)
        const colors = ['#94a3b8', '#3b82f6', '#eab308', '#ef4444', '#22c55e', '#a855f7']
        const total = mapped.reduce((s, p) => s + p.subscriberCount, 0) || 1
        setPlanDistribution(mapped.map((p, i) => ({
          name: p.name,
          value: Math.round((p.subscriberCount / total) * 100),
          color: colors[i % colors.length]
        })))
        setRevenueData(revTrend.map(r => ({
          month: new Date(r.date).toLocaleString('en', { month: 'short' }),
          revenue: r.revenue
        })))
        // Load subscribers for each plan
        const allSubs: Subscription[] = []
        for (const p of apiPlans) {
          try {
            const subs = await getPlanSubscribers(p.id)
            allSubs.push(...subs.map((s: any) => ({
              id: String(s.id),
              userId: String(s.user),
              planId: String(p.id),
              status: s.status || 'active',
              startDate: new Date(s.start_date || s.created_at),
              endDate: new Date(s.end_date || s.created_at),
              nextBillingDate: new Date(s.next_billing_date || s.end_date || s.created_at),
              amount: Number(p.price) || 0,
              currency: 'VND',
              autoRenew: s.auto_renew !== false,
              user: { name: s.user_name || `User ${s.user}`, email: s.user_email || '' }
            })))
          } catch { /* plan may have no subscribers */ }
        }
        setSubscriptions(allSubs)
      } catch {
        toast.error('Không thể tải dữ liệu thuê bao')
      }
    }
    fetchData()
  }, [])

  // Format currency
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const handleCreatePlan = async () => {
    try {
      await createSubscriptionPlan({ name: 'New Plan', price: 0, billing_cycle: 'monthly' })
      toast.success('Tạo gói mới thành công')
      setIsCreatePlanOpen(false)
      const apiPlans = await getAdminSubscriptionPlans()
      setPlans(apiPlans.map((p: any) => ({
        id: String(p.id), name: p.name || '', description: p.description || '',
        type: p.billing_cycle || 'monthly', price: Number(p.price) || 0, currency: 'VND',
        features: p.features ? (typeof p.features === 'string' ? JSON.parse(p.features) : p.features) : [],
        isPopular: !!p.is_popular, isActive: p.is_active !== false, trialDays: p.trial_days || 0,
        subscriberCount: p.subscriber_count || 0, revenue: Number(p.revenue) || 0, churnRate: p.churn_rate || 0
      })))
    } catch { toast.error('Tạo gói thất bại') }
  }

  const handleSaveSettings = () => {
     toast.success("Đã cập nhật cấu hình Revenue Pool thành công!")
  }

  const handleExtendSubscription = () => {
    if (selectedSub) {
      const days = parseInt(extendDays)
      const newEndDate = new Date(selectedSub.endDate)
      newEndDate.setDate(newEndDate.getDate() + days)
      
      const updatedSubs = subscriptions.map(sub => 
        sub.id === selectedSub.id 
          ? { ...sub, endDate: newEndDate, status: 'active' as const } 
          : sub
      )
      
      setSubscriptions(updatedSubs)
      toast.success(`Đã gia hạn thuê bao thêm ${days} ngày cho ${selectedSub.user.email}`)
      setIsEditSubOpen(false)
    }
  }

  const handleCancelSubscription = () => {
     if (selectedSub) {
      const updatedSubs = subscriptions.map(sub => 
        sub.id === selectedSub.id 
          ? { ...sub, status: 'canceled' as const, autoRenew: false } 
          : sub
      )
      setSubscriptions(updatedSubs)
      toast.success(`Đã hủy thuê bao của ${selectedSub.user.email}`)
      setIsEditSubOpen(false)
    }
  }

  const getStatusColor = (status: Subscription['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'trialing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'past_due': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'canceled': return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
      case 'paused': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  // Calculate Revenue Pool Stats
  const TOTAL_MONTHLY_REVENUE = plans.reduce((s, p) => s + p.revenue, 0) || 0
  const INSTRUCTOR_POOL_PERCENTAGE = parseInt(poolPercentage) / 100
  const INSTRUCTOR_POOL_AMOUNT = TOTAL_MONTHLY_REVENUE * INSTRUCTOR_POOL_PERCENTAGE
  const TOTAL_SYSTEM_MINUTES = 250000

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Thuê bao</h1>
          <p className="text-muted-foreground">Hệ thống Subscription & Bể doanh thu (Revenue Pool)</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab('settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Cấu hình
            </Button>
            <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
            <DialogTrigger asChild>
                <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo gói mới
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                <DialogTitle>Tạo gói cước mới</DialogTitle>
                <DialogDescription>Thiết lập thông tin cho gói thuê bao mới</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label>Tên gói</Label>
                    <Input placeholder="Ví dụ: Super Premium" />
                    </div>
                    <div className="space-y-2">
                    <Label>Loại thanh toán</Label>
                    <Select defaultValue="monthly">
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="monthly">Theo tháng</SelectItem>
                        <SelectItem value="yearly">Theo năm</SelectItem>
                        <SelectItem value="lifetime">Vĩnh viễn</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Giá (VND)</Label>
                    <Input type="number" placeholder="0" />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreatePlanOpen(false)}>Hủy</Button>
                    <Button onClick={handleCreatePlan}>Lưu gói cước</Button>
                </div>
                </div>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-[500px]">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="plans">Gói cước</TabsTrigger>
          <TabsTrigger value="subscriptions">Người dùng</TabsTrigger>
          <TabsTrigger value="settings">Cấu hình</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          
          {/* Revenue Pool Banner */}
          <div className="bg-slate-900 text-slate-100 rounded-lg p-6 shadow-md relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Briefcase size={120} />
             </div>
             <div className="relative z-10 grid md:grid-cols-3 gap-8 items-center">
                <div className="col-span-1">
                   <h3 className="text-lg font-medium text-slate-400 uppercase tracking-wider mb-1">Instructor Revenue Pool</h3>
                   <div className="text-4xl font-bold text-white mb-2">
                      {formatCurrency(INSTRUCTOR_POOL_AMOUNT)}
                   </div>
                   <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                      {poolPercentage}% of Total Revenue
                   </Badge>
                </div>
                <div className="col-span-1 border-l border-slate-700 pl-8">
                   <h4 className="text-sm font-medium text-slate-400 mb-1">Total Consumption</h4>
                   <div className="text-2xl font-bold text-white mb-2">
                      {TOTAL_SYSTEM_MINUTES.toLocaleString()} <span className="text-lg font-normal text-slate-500">mins</span>
                   </div>
                   <p className="text-xs text-slate-400">
                      Including Videos, Quizzes & Coding Exercises
                   </p>
                </div>
                <div className="col-span-1 border-l border-slate-700 pl-8">
                   <h4 className="text-sm font-medium text-slate-400 mb-1">Avg. Payout Rate</h4>
                   <div className="text-2xl font-bold text-green-400 mb-2">
                      {formatCurrency(INSTRUCTOR_POOL_AMOUNT / TOTAL_SYSTEM_MINUTES)} <span className="text-lg font-normal text-slate-500">/ min</span>
                   </div>
                   <p className="text-xs text-slate-400">
                      Based on current settings
                   </p>
                </div>
             </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Doanh thu tháng</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(TOTAL_MONTHLY_REVENUE)}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +12.3% so với tháng trước
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng thuê bao</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4,180</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +8.1% so với tháng trước
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tỷ lệ rời bỏ (Churn)</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5.8%</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
                  +0.2% so với tháng trước
                </p>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(245000)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Doanh thu TB trên mỗi user
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tăng trưởng doanh thu</CardTitle>
                <CardDescription>Doanh thu định kỳ hàng tháng (MRR)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000000}M`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phân bổ gói cước</CardTitle>
                <CardDescription>Tỷ lệ người dùng theo các gói</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4">
                    {planDistribution.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name} ({item.value}%)
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative overflow-hidden ${plan.isPopular ? 'border-blue-500 shadow-md' : ''}`}>
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {plan.id === 'basic' && <Shield className="w-5 h-5 text-slate-500" />}
                    {plan.id === 'pro' && <Zap className="w-5 h-5 text-blue-500" />}
                    {plan.id === 'premium' && <Crown className="w-5 h-5 text-yellow-500" />}
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground text-sm">/tháng</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Người đăng ký</span>
                      <span className="font-medium">{plan.subscriberCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Doanh thu</span>
                      <span className="font-medium">{formatCurrency(plan.revenue)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="w-4 h-4 mr-2" /> Sửa
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <BarChart3 className="w-4 h-4 mr-2" /> Chi tiết
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách thuê bao</CardTitle>
              <CardDescription>Quản lý trạng thái và gia hạn của người dùng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Input placeholder="Tìm kiếm theo email hoặc tên..." className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="canceled">Đã hủy</SelectItem>
                    <SelectItem value="trialing">Dùng thử</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày hết hạn</TableHead>
                    <TableHead>Doanh thu</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.user.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plans.find(p => p.id === sub.planId)?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(sub.status)}>
                          {sub.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {sub.status === 'trialing' && <Clock className="w-3 h-3 mr-1" />}
                          {sub.status === 'canceled' && <X className="w-3 h-3 mr-1" />}
                          {sub.status === 'paused' && <Pause className="w-3 h-3 mr-1" />}
                          {sub.status === 'active' ? 'Đang hoạt động' : 
                           sub.status === 'trialing' ? 'Dùng thử' : 
                           sub.status === 'paused' ? 'Tạm dừng' : 'Đã hủy'}
                        </Badge>
                      </TableCell>
                      <TableCell>{sub.endDate.toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>{formatCurrency(sub.amount)}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                    setSelectedSub(sub)
                                    setIsEditSubOpen(true)
                                }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Chỉnh sửa / Gia hạn
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => {
                                     setSelectedSub(sub)
                                     handleCancelSubscription()
                                }}>
                                    <X className="w-4 h-4 mr-2" />
                                    Hủy ngay lập tức
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cấu hình Revenue Pool (Bể doanh thu)</CardTitle>
                    <CardDescription>
                        Điều chỉnh các tham số phân chia doanh thu cho giảng viên.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="poolPercentage">Tỷ lệ Pool cho Giảng viên (%)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="poolPercentage" 
                                        type="number" 
                                        value={poolPercentage} 
                                        onChange={(e) => setPoolPercentage(e.target.value)} 
                                    />
                                    <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                                        % doanh thu tổng
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Hiện tại: 15% (Theo chính sách 2026). Tăng số này sẽ tăng thu nhập cho giảng viên.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="minThreshold">Ngưỡng thanh toán tối thiểu (USD)</Label>
                                <Input 
                                    id="minThreshold" 
                                    type="number" 
                                    value={minPayoutThreshold} 
                                    onChange={(e) => setMinPayoutThreshold(e.target.value)} 
                                />
                                <p className="text-xs text-muted-foreground">
                                    Giảng viên cần đạt mức này để được phép rút tiền.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="rate">Ước tính giá mỗi phút (Tham khảo)</Label>
                                <Input 
                                    id="rate" 
                                    disabled 
                                    value={`~ ${formatCurrency((TOTAL_MONTHLY_REVENUE * (parseInt(poolPercentage)/100)) / TOTAL_SYSTEM_MINUTES)} / phút`} 
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Con số này tự động thay đổi dựa trên tổng thời gian học thực tế.
                                </p>
                            </div>

                            <div className="flex items-center space-x-2 pt-4">
                                <Switch id="auto-payout" />
                                <Label htmlFor="auto-payout">Tự động chốt sổ ngày 01 hàng tháng</Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardContent className="border-t pt-6">
                    <Button onClick={handleSaveSettings}>
                        <Save className="w-4 h-4 mr-2" />
                        Lưu cấu hình
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditSubOpen} onOpenChange={setIsEditSubOpen}>
         <DialogContent>
            <DialogHeader>
                <DialogTitle>Chỉnh sửa thuê bao</DialogTitle>
                <DialogDescription>
                    Thao tác cho tài khoản: {selectedSub?.user.email}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Gia hạn thêm ngày</Label>
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            value={extendDays} 
                            onChange={(e) => setExtendDays(e.target.value)} 
                        />
                        <span className="flex items-center text-sm">Ngày</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Sử dụng khi cần đền bù hoặc tặng thêm thời gian cho user.
                    </p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditSubOpen(false)}>Hủy</Button>
                <Button onClick={handleExtendSubscription}>Cập nhật</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  )
}
