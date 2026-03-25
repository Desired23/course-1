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
import { Checkbox } from '../../components/ui/checkbox'
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
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
import { getAdminSubscriptionPlans, createSubscriptionPlan, getPlanSubscribers, getAdminRevenueAnalytics, getSystemSettings, createSystemSetting, updateSystemSetting, adminExtendSubscription, adminCancelSubscription, updateSubscriptionPlan, deleteSubscriptionPlan } from '../../services/admin.api'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  type: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'lifetime'
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

function normalizeSubscriptionStatus(status: string | null | undefined): Subscription['status'] {
  if (status === 'cancelled' || status === 'canceled') return 'canceled'
  if (status === 'active') return 'active'
  if (status === 'trialing') return 'trialing'
  if (status === 'paused') return 'paused'
  if (status === 'past_due') return 'past_due'
  return 'active'
}



export function AdminSubscriptionPage() {
  const { canAccess } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [subscriptionSearchQuery, setSubscriptionSearchQuery] = useState('')
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'all' | Subscription['status']>('all')
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false)
  const [revenueSettingId, setRevenueSettingId] = useState<number | null>(null)
  
  // Settings State
  const [poolPercentage, setPoolPercentage] = useState('15')
  const [minPayoutThreshold, setMinPayoutThreshold] = useState('50')
  const [engagementRate, setEngagementRate] = useState('0.03')
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true)
  
  // Plans & Chart State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [revenueData, setRevenueData] = useState<{month: string; revenue: number}[]>([])
  const [planDistribution, setPlanDistribution] = useState<{name: string; value: number; color: string}[]>([])

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<string[]>([])
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [isEditSubOpen, setIsEditSubOpen] = useState(false)
  const [extendDays, setExtendDays] = useState('30')
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    destructive: false,
    loading: false,
    action: null,
  })
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    duration_type: 'monthly',
    duration_days: '30',
    price: '',
    discount_price: '',
    status: 'active',
    is_featured: false,
    yearly_discount_percent: '0',
    features: '',
  })

  const mapPlan = (p: any): SubscriptionPlan => ({
    id: String(p.id),
    name: p.name || '',
    description: p.description || '',
    type: p.duration_type || 'monthly',
    price: Number(p.price) || 0,
    currency: 'VND',
    features: Array.isArray(p.features) ? p.features : [],
    isPopular: !!p.is_featured,
    isActive: p.status === 'active',
    trialDays: 0,
    subscriberCount: p.current_subscribers || 0,
    revenue: (Number(p.effective_price || p.price) || 0) * (Number(p.current_subscribers) || 0),
    churnRate: 0
  })

  const mapSubscription = (subscription: any, plan: any): Subscription => ({
    id: String(subscription.id),
    userId: String(subscription.user),
    planId: String(plan.id),
    status: normalizeSubscriptionStatus(subscription.status),
    startDate: new Date(subscription.start_date || subscription.created_at || Date.now()),
    endDate: new Date(subscription.end_date || subscription.created_at || Date.now()),
    nextBillingDate: new Date(subscription.end_date || subscription.created_at || Date.now()),
    amount: Number(plan.effective_price || plan.price) || 0,
    currency: 'VND',
    autoRenew: subscription.auto_renew !== false,
    user: {
      name: subscription.user_name || `User ${subscription.user}`,
      email: subscription.user_email || '',
    },
  })

  const reloadSubscriptions = async (apiPlans: any[]) => {
    const allSubs: Subscription[] = []
    for (const plan of apiPlans) {
      try {
        const subs = await getPlanSubscribers(plan.id)
        allSubs.push(...subs.map((subscription: any) => mapSubscription(subscription, plan)))
      } catch {
        // plan may have no subscribers
      }
    }
    setSubscriptions(allSubs)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apiPlans, revTrend, settings] = await Promise.all([
          getAdminSubscriptionPlans(),
          getAdminRevenueAnalytics(6),
          getSystemSettings(),
        ])
        const mapped: SubscriptionPlan[] = apiPlans.map(mapPlan)
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
        await reloadSubscriptions(apiPlans)
        const revenueSetting = settings.find((setting) => setting.key === 'subscription_revenue_pool')
        if (revenueSetting) {
          setRevenueSettingId(revenueSetting.id)
          try {
            const parsed = JSON.parse(revenueSetting.value || '{}')
            setPoolPercentage(String(parsed.poolPercentage ?? '15'))
            setMinPayoutThreshold(String(parsed.minPayoutThreshold ?? '50'))
            setEngagementRate(String(parsed.engagementRate ?? '0.03'))
            setAutoPayoutEnabled(parsed.autoPayoutEnabled !== false)
          } catch {
            // Keep defaults when saved payload is invalid
          }
        }
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
    const parsedPrice = Number(planForm.price)
    const parsedDurationDays = Number(planForm.duration_days)
    if (!planForm.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.error('Vui long nhap ten goi va gia hop le')
      return
    }
    if (!Number.isFinite(parsedDurationDays) || parsedDurationDays <= 0) {
      toast.error('So ngay hieu luc phai lon hon 0')
      return
    }
    try {
      await createSubscriptionPlan({
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        duration_type: planForm.duration_type,
        duration_days: parsedDurationDays,
        price: parsedPrice,
        discount_price: planForm.discount_price ? Number(planForm.discount_price) : undefined,
        status: planForm.status,
        is_featured: planForm.is_featured,
        yearly_discount_percent: Number(planForm.yearly_discount_percent || 0),
        features: planForm.features.split('\n').map(item => item.trim()).filter(Boolean),
      })
      toast.success('Tạo gói mới thành công')
      setIsCreatePlanOpen(false)
      const apiPlans = await getAdminSubscriptionPlans()
      setPlans(apiPlans.map(mapPlan))
      setPlanForm({
        name: '',
        description: '',
        duration_type: 'monthly',
        duration_days: '30',
        price: '',
        discount_price: '',
        status: 'active',
        is_featured: false,
        yearly_discount_percent: '0',
        features: '',
      })
    } catch { toast.error('Tạo gói thất bại') }
  }

  const handleSaveSettings = () => {
     toast.success("Đã cập nhật cấu hình Revenue Pool thành công!")
  }

  const persistRevenueSettings = async () => {
    const parsedPoolPercentage = Number(poolPercentage)
    const parsedMinPayoutThreshold = Number(minPayoutThreshold)
    const parsedEngagementRate = Number(engagementRate)

    if (!Number.isFinite(parsedPoolPercentage) || parsedPoolPercentage < 0 || parsedPoolPercentage > 100) {
      toast.error('Ty le revenue pool phai nam trong khoang 0-100')
      return
    }
    if (!Number.isFinite(parsedMinPayoutThreshold) || parsedMinPayoutThreshold < 0) {
      toast.error('Nguong thanh toan toi thieu khong hop le')
      return
    }
    if (!Number.isFinite(parsedEngagementRate) || parsedEngagementRate < 0) {
      toast.error('He so engagement khong hop le')
      return
    }

    const payload = {
      key: 'subscription_revenue_pool',
      value: JSON.stringify({
        poolPercentage: parsedPoolPercentage,
        minPayoutThreshold: parsedMinPayoutThreshold,
        engagementRate: parsedEngagementRate,
        autoPayoutEnabled,
      }),
      description: 'Subscription revenue pool configuration',
    }

    try {
      if (revenueSettingId) {
        await updateSystemSetting(revenueSettingId, { value: payload.value })
      } else {
        const created = await createSystemSetting(payload)
        setRevenueSettingId(created.id)
      }
      toast.success('Da cap nhat cau hinh Revenue Pool thanh cong!')
    } catch {
      toast.error('Luu cau hinh Revenue Pool that bai')
    }
  }

  const handleExtendSubscription = async () => {
    if (!selectedSub) {
      toast.error('Khong tim thay subscription can gia han')
      return
    }

    const parsedExtendDays = Number(extendDays)
    if (!Number.isFinite(parsedExtendDays) || parsedExtendDays <= 0) {
      toast.error('So ngay gia han phai lon hon 0')
      return
    }

    try {
      await adminExtendSubscription(Number(selectedSub.id), parsedExtendDays)
      const apiPlans = await getAdminSubscriptionPlans()
      setPlans(apiPlans.map(mapPlan))
      await reloadSubscriptions(apiPlans)
      setIsEditSubOpen(false)
      setSelectedSub(null)
      toast.success('Da gia han subscription thanh cong')
    } catch {
      toast.error('Gia han subscription that bai')
    }
  }

  const handleCancelSubscription = async () => {
    if (!selectedSub) {
      toast.error('Khong tim thay subscription can huy')
      return
    }

    try {
      await adminCancelSubscription(Number(selectedSub.id))
      const apiPlans = await getAdminSubscriptionPlans()
      setPlans(apiPlans.map(mapPlan))
      await reloadSubscriptions(apiPlans)
      setIsEditSubOpen(false)
      setSelectedSub(null)
      toast.success('Da huy subscription thanh cong')
    } catch {
      toast.error('Huy subscription that bai')
    }
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: 'Confirm',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const refreshPlansAndSubscriptions = async () => {
    const apiPlans = await getAdminSubscriptionPlans()
    setPlans(apiPlans.map(mapPlan))
    await reloadSubscriptions(apiPlans)
  }

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    await updateSubscriptionPlan(Number(plan.id), { status: plan.isActive ? 'inactive' : 'active' })
    await refreshPlansAndSubscriptions()
    toast.success(plan.isActive ? 'Da tam an goi cuoc' : 'Da kich hoat goi cuoc')
  }

  const handleToggleFeaturedPlan = async (plan: SubscriptionPlan) => {
    await updateSubscriptionPlan(Number(plan.id), { is_featured: !plan.isPopular })
    await refreshPlansAndSubscriptions()
    toast.success(!plan.isPopular ? 'Da danh dau goi noi bat' : 'Da bo danh dau goi noi bat')
  }

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    await deleteSubscriptionPlan(Number(plan.id))
    await refreshPlansAndSubscriptions()
    toast.success('Da xoa goi cuoc')
  }

  const toggleSubscriptionSelection = (subscriptionId: string, checked: boolean) => {
    setSelectedSubscriptionIds(prev => checked ? [...prev, subscriptionId] : prev.filter(id => id !== subscriptionId))
  }

  const toggleAllSubscriptions = (checked: boolean) => {
    setSelectedSubscriptionIds(checked ? filteredSubscriptions.map(sub => sub.id) : [])
  }

  const bulkExtendSubscriptions = async () => {
    const parsedExtendDays = Number(extendDays)
    if (!Number.isFinite(parsedExtendDays) || parsedExtendDays <= 0) {
      toast.error('So ngay gia han phai lon hon 0')
      return
    }
    for (const id of selectedSubscriptionIds) {
      await adminExtendSubscription(Number(id), parsedExtendDays)
    }
    await refreshPlansAndSubscriptions()
    setSelectedSubscriptionIds([])
    toast.success('Da gia han cac subscription da chon')
  }

  const bulkCancelSubscriptions = async () => {
    for (const id of selectedSubscriptionIds) {
      await adminCancelSubscription(Number(id))
    }
    await refreshPlansAndSubscriptions()
    setSelectedSubscriptionIds([])
    toast.success('Da huy cac subscription da chon')
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

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const planName = plans.find((plan) => plan.id === sub.planId)?.name || ''
    const matchesSearch = [sub.user.name, sub.user.email, planName]
      .join(' ')
      .toLowerCase()
      .includes(subscriptionSearchQuery.toLowerCase())
    const matchesStatus = subscriptionStatusFilter === 'all' || sub.status === subscriptionStatusFilter

    return matchesSearch && matchesStatus
  })

  useEffect(() => {
    const visibleIds = new Set(filteredSubscriptions.map((sub) => sub.id))
    setSelectedSubscriptionIds((prev) => {
      const next = prev.filter((id) => visibleIds.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [subscriptions, subscriptionSearchQuery, subscriptionStatusFilter, plans])

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
                    <Input
                      placeholder="Vi du: Super Premium"
                      value={planForm.name}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label>Loại thanh toán</Label>
                    <Select value={planForm.duration_type} onValueChange={(value) => setPlanForm(prev => ({ ...prev, duration_type: value }))}>
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="monthly">Theo tháng</SelectItem>
                        <SelectItem value="quarterly">Theo quy</SelectItem>
                        <SelectItem value="semi_annual">6 thang</SelectItem>
                        <SelectItem value="annual">Theo nam</SelectItem>
                        <SelectItem value="lifetime">Vĩnh viễn</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>Giá (VND)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={planForm.price}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Mo ta</Label>
                    <Input
                      placeholder="Goi danh cho hoc vien can quyen loi nang cao"
                      value={planForm.description}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>So ngay hieu luc</Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={planForm.duration_days}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, duration_days: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trang thai</Label>
                      <Select value={planForm.status} onValueChange={(value) => setPlanForm(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Hoat dong</SelectItem>
                          <SelectItem value="inactive">Tam an</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gia khuyen mai (VND)</Label>
                      <Input
                        type="number"
                        placeholder="De trong neu khong co"
                        value={planForm.discount_price}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, discount_price: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Uu dai goi nam (%)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={planForm.yearly_discount_percent}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, yearly_discount_percent: e.target.value }))}
                      />
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-3">
                    <div>
                      <Label className="block">Goi noi bat</Label>
                      <p className="text-xs text-muted-foreground">Uu tien hien thi o cac man gioi thieu subscription</p>
                    </div>
                    <Switch
                      checked={planForm.is_featured}
                      onCheckedChange={(checked) => setPlanForm(prev => ({ ...prev, is_featured: checked }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Tinh nang</Label>
                    <textarea
                      className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder={"Moi dong la mot tinh nang\nVi du: Hoc khong gioi han"}
                      value={planForm.features}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
                    />
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
                <div className="text-2xl font-bold">{subscriptions.length.toLocaleString('vi-VN')}</div>
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
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="w-full"
                      size="sm"
                      onClick={() => openConfirm(
                        plan.isActive ? 'Tam an goi cuoc' : 'Kich hoat goi cuoc',
                        plan.isActive ? `Tam an "${plan.name}"?` : `Kich hoat "${plan.name}"?`,
                        plan.isActive ? 'Tam an' : 'Kich hoat',
                        () => handleTogglePlanStatus(plan),
                      )}
                    >
                      {plan.isActive ? 'Tam an' : 'Kich hoat'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      size="sm"
                      onClick={() => openConfirm(
                        plan.isPopular ? 'Bo goi noi bat' : 'Danh dau noi bat',
                        plan.isPopular ? `Bo danh dau noi bat cho "${plan.name}"?` : `Danh dau "${plan.name}" la goi noi bat?`,
                        plan.isPopular ? 'Bo noi bat' : 'Danh dau',
                        () => handleToggleFeaturedPlan(plan),
                      )}
                    >
                      {plan.isPopular ? 'Bo noi bat' : 'Noi bat'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-red-600"
                      size="sm"
                      onClick={() => openConfirm(
                        'Xoa goi cuoc',
                        `Xoa "${plan.name}"? Hanh dong nay khong the hoan tac.`,
                        'Xoa',
                        () => handleDeletePlan(plan),
                        true,
                      )}
                    >
                      Xoa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="space-y-6 mt-6">
          <AdminBulkActionBar
            count={selectedSubscriptionIds.length}
            label="subscriptions selected"
            onClear={() => setSelectedSubscriptionIds([])}
            actions={[
              {
                key: 'extend',
                label: 'Extend',
                onClick: () => openConfirm(
                  'Gia han subscription da chon',
                  `Gia han ${selectedSubscriptionIds.length} subscription theo so ngay hien tai (${extendDays} ngay)?`,
                  'Gia han',
                  bulkExtendSubscriptions,
                ),
              },
              {
                key: 'cancel',
                label: 'Cancel',
                destructive: true,
                onClick: () => openConfirm(
                  'Huy subscription da chon',
                  `Huy ${selectedSubscriptionIds.length} subscription da chon?`,
                  'Huy subscription',
                  bulkCancelSubscriptions,
                  true,
                ),
              },
            ]}
          />
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

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <Input
                  placeholder="Search subscriptions..."
                  className="max-w-sm"
                  value={subscriptionSearchQuery}
                  onChange={(e) => setSubscriptionSearchQuery(e.target.value)}
                />
                <Select value={subscriptionStatusFilter} onValueChange={(value: 'all' | Subscription['status']) => setSubscriptionStatusFilter(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[48px]">
                      <Checkbox
                        checked={filteredSubscriptions.length > 0 && selectedSubscriptionIds.length === filteredSubscriptions.length}
                        onCheckedChange={(checked) => toggleAllSubscriptions(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày hết hạn</TableHead>
                    <TableHead>Doanh thu</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSubscriptionIds.includes(sub.id)}
                          onCheckedChange={(checked) => toggleSubscriptionSelection(sub.id, Boolean(checked))}
                        />
                      </TableCell>
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
                                <DropdownMenuItem className="text-red-600" onClick={() => openConfirm(
                                     'Huy subscription',
                                     `Huy ngay subscription cua ${sub.user.name}?`,
                                     'Huy subscription',
                                     async () => {
                                       await adminCancelSubscription(Number(sub.id))
                                       await refreshPlansAndSubscriptions()
                                     },
                                     true,
                                )}>
                                    <X className="w-4 h-4 mr-2" />
                                    Hủy ngay lập tức
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                        Khong co subscription phu hop voi bo loc hien tai.
                      </TableCell>
                    </TableRow>
                  )}
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

                            <div className="space-y-2">
                                <Label htmlFor="engagementRate">He so engagement tham chieu</Label>
                                <Input
                                    id="engagementRate"
                                    type="number"
                                    step="0.01"
                                    value={engagementRate}
                                    onChange={(e) => setEngagementRate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Luu cau hinh noi bo de doi chieu khi can tinh trong so tuong tac trong revenue pool.
                                </p>
                            </div>

                            <div className="flex items-center space-x-2 pt-4">
                                <Switch id="auto-payout" checked={autoPayoutEnabled} onCheckedChange={setAutoPayoutEnabled} />
                                <Label htmlFor="auto-payout">Tự động chốt sổ ngày 01 hàng tháng</Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardContent className="border-t pt-6">
                    <Button onClick={() => void persistRevenueSettings()}>
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
      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </div>
  )
}



