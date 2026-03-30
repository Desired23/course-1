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
import { useTranslation } from 'react-i18next'
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
  const { canAccess } = useAuth(); const { t } = useTranslation()
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
    confirmLabel: '',
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
        toast.error(t('subscriptions_page.admin.toasts.load_failed'))
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
      toast.error(t('subscriptions_page.admin.validation.name_price_required'))
      return
    }
    if (!Number.isFinite(parsedDurationDays) || parsedDurationDays <= 0) {
      toast.error(t('subscriptions_page.admin.validation.duration_days_invalid'))
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
      toast.success(t('subscriptions_page.admin.create_success'))
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
    } catch { toast.error(t('subscriptions_page.admin.create_failed')) }
  }

  const handleSaveSettings = () => {
     toast.success(t('subscriptions_page.admin.toasts.revenue_pool_updated'))
  }

  const persistRevenueSettings = async () => {
    const parsedPoolPercentage = Number(poolPercentage)
    const parsedMinPayoutThreshold = Number(minPayoutThreshold)
    const parsedEngagementRate = Number(engagementRate)

    if (!Number.isFinite(parsedPoolPercentage) || parsedPoolPercentage < 0 || parsedPoolPercentage > 100) {
      toast.error(t('subscriptions_page.admin.toasts.revenue_pool_percentage_invalid'))
      return
    }
    if (!Number.isFinite(parsedMinPayoutThreshold) || parsedMinPayoutThreshold < 0) {
      toast.error(t('subscriptions_page.admin.toasts.revenue_pool_min_payout_invalid'))
      return
    }
    if (!Number.isFinite(parsedEngagementRate) || parsedEngagementRate < 0) {
      toast.error(t('subscriptions_page.admin.toasts.revenue_pool_engagement_invalid'))
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
      description: t('subscriptions_page.admin.settings_panel.config_description'),
    }

    try {
      if (revenueSettingId) {
        await updateSystemSetting(revenueSettingId, { value: payload.value })
      } else {
        const created = await createSystemSetting(payload)
        setRevenueSettingId(created.id)
      }
      toast.success(t('subscriptions_page.admin.toasts.revenue_pool_updated'))
    } catch {
      toast.error(t('subscriptions_page.admin.toasts.revenue_pool_save_failed'))
    }
  }

  const handleExtendSubscription = async () => {
    if (!selectedSub) {
      toast.error(t('subscriptions_page.admin.toasts.subscription_not_found_extend'))
      return
    }

    const parsedExtendDays = Number(extendDays)
    if (!Number.isFinite(parsedExtendDays) || parsedExtendDays <= 0) {
      toast.error(t('subscriptions_page.admin.validation.duration_days_invalid'))
      return
    }

    try {
      await adminExtendSubscription(Number(selectedSub.id), parsedExtendDays)
      const apiPlans = await getAdminSubscriptionPlans()
      setPlans(apiPlans.map(mapPlan))
      await reloadSubscriptions(apiPlans)
      setIsEditSubOpen(false)
      setSelectedSub(null)
      toast.success(t('subscriptions_page.admin.toasts.extend_success'))
    } catch {
      toast.error(t('subscriptions_page.admin.toasts.extend_failed'))
    }
  }

  const handleCancelSubscription = async () => {
    if (!selectedSub) {
      toast.error(t('subscriptions_page.admin.toasts.subscription_not_found_cancel'))
      return
    }

    try {
      await adminCancelSubscription(Number(selectedSub.id))
      const apiPlans = await getAdminSubscriptionPlans()
      setPlans(apiPlans.map(mapPlan))
      await reloadSubscriptions(apiPlans)
      setIsEditSubOpen(false)
      setSelectedSub(null)
      toast.success(t('subscriptions_page.admin.toasts.cancel_success_admin'))
    } catch {
      toast.error(t('subscriptions_page.admin.toasts.cancel_failed_admin'))
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
        confirmLabel: '',
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
    toast.success(plan.isActive ? t('subscriptions_page.admin.toasts.plan_deactivated') : t('subscriptions_page.admin.toasts.plan_activated'))
  }

  const handleToggleFeaturedPlan = async (plan: SubscriptionPlan) => {
    await updateSubscriptionPlan(Number(plan.id), { is_featured: !plan.isPopular })
    await refreshPlansAndSubscriptions()
    toast.success(!plan.isPopular ? t('subscriptions_page.admin.toasts.featured_marked') : t('subscriptions_page.admin.toasts.featured_unmarked'))
  }

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    await deleteSubscriptionPlan(Number(plan.id))
    await refreshPlansAndSubscriptions()
    toast.success(t('subscriptions_page.admin.toasts.plan_deleted'))
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
      toast.error(t('subscriptions_page.admin.validation.duration_days_invalid'))
      return
    }
    for (const id of selectedSubscriptionIds) {
      await adminExtendSubscription(Number(id), parsedExtendDays)
    }
    await refreshPlansAndSubscriptions()
    setSelectedSubscriptionIds([])
    toast.success(t('subscriptions_page.admin.toasts.bulk_extend_success'))
  }

  const bulkCancelSubscriptions = async () => {
    for (const id of selectedSubscriptionIds) {
      await adminCancelSubscription(Number(id))
    }
    await refreshPlansAndSubscriptions()
    setSelectedSubscriptionIds([])
    toast.success(t('subscriptions_page.admin.toasts.bulk_cancel_success'))
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
          <h1 className="text-3xl font-bold">{t('subscriptions_page.admin.title')}</h1>
          <p className="text-muted-foreground">{t('subscriptions_page.admin.subtitle')}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab('settings')}>
                <Settings className="h-4 w-4 mr-2" />
                {t('subscriptions_page.admin.settings_button')}
            </Button>
            <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
            <DialogTrigger asChild>
                <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('subscriptions_page.admin.create_plan')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                <DialogTitle>{t('subscriptions_page.admin.create_plan_dialog_title')}</DialogTitle>
                <DialogDescription>{t('subscriptions_page.admin.create_plan_dialog_description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label>{t('subscriptions_page.admin.plan_name')}</Label>
                    <Input
                      placeholder={t('subscriptions_page.admin.plan_name_placeholder')}
                      value={planForm.name}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label>{t('subscriptions_page.admin.billing_type')}</Label>
                    <Select value={planForm.duration_type} onValueChange={(value) => setPlanForm(prev => ({ ...prev, duration_type: value }))}>
                        <SelectTrigger>
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="monthly">{t('subscriptions_page.admin.plan_type.monthly')}</SelectItem>
                        <SelectItem value="quarterly">{t('subscriptions_page.admin.plan_type.quarterly')}</SelectItem>
                        <SelectItem value="semi_annual">{t('subscriptions_page.admin.plan_type.semi_annual')}</SelectItem>
                        <SelectItem value="annual">{t('subscriptions_page.admin.plan_type.annual')}</SelectItem>
                        <SelectItem value="lifetime">{t('subscriptions_page.admin.plan_type.lifetime')}</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label>{t('subscriptions_page.admin.price')} (VND)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={planForm.price}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('subscriptions_page.admin.description')}</Label>
                    <Input
                      placeholder={t('subscriptions_page.admin.description_placeholder')}
                      value={planForm.description}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('subscriptions_page.admin.form.duration_days')}</Label>
                      <Input
                        type="number"
                        placeholder="30"
                        value={planForm.duration_days}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, duration_days: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('subscriptions_page.admin.form.status')}</Label>
                      <Select value={planForm.status} onValueChange={(value) => setPlanForm(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('subscriptions_page.admin.form.status_active')}</SelectItem>
                          <SelectItem value="inactive">{t('subscriptions_page.admin.form.status_inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('subscriptions_page.admin.form.discount_price')}</Label>
                      <Input
                        type="number"
                        placeholder={t('subscriptions_page.admin.form.discount_price_placeholder')}
                        value={planForm.discount_price}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, discount_price: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('subscriptions_page.admin.form.yearly_discount_percent')}</Label>
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
                      <Label className="block">{t('subscriptions_page.admin.mark_popular')}</Label>
                      <p className="text-xs text-muted-foreground">{t('subscriptions_page.admin.form.featured_hint')}</p>
                    </div>
                    <Switch
                      checked={planForm.is_featured}
                      onCheckedChange={(checked) => setPlanForm(prev => ({ ...prev, is_featured: checked }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('subscriptions_page.admin.features')}</Label>
                    <textarea
                      className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder={t('subscriptions_page.admin.features_placeholder')}
                      value={planForm.features}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreatePlanOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleCreatePlan}>{t('subscriptions_page.admin.form.save_plan')}</Button>
                </div>
                </div>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-[500px]">
          <TabsTrigger value="overview">{t('subscriptions_page.admin.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="plans">{t('subscriptions_page.admin.tabs.plans')}</TabsTrigger>
          <TabsTrigger value="subscriptions">{t('subscriptions_page.admin.tabs.subscriptions')}</TabsTrigger>
          <TabsTrigger value="settings">{t('subscriptions_page.admin.tabs.settings')}</TabsTrigger>
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
                   <h3 className="text-lg font-medium text-slate-400 uppercase tracking-wider mb-1">{t('subscriptions_page.admin.overview.instructor_revenue_pool')}</h3>
                   <div className="text-4xl font-bold text-white mb-2">
                      {formatCurrency(INSTRUCTOR_POOL_AMOUNT)}
                   </div>
                   <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                      {t('subscriptions_page.admin.overview.total_revenue_share', { value: poolPercentage })}
                   </Badge>
                </div>
                <div className="col-span-1 border-l border-slate-700 pl-8">
                   <h4 className="text-sm font-medium text-slate-400 mb-1">{t('subscriptions_page.admin.overview.total_consumption')}</h4>
                   <div className="text-2xl font-bold text-white mb-2">
                      {TOTAL_SYSTEM_MINUTES.toLocaleString()} <span className="text-lg font-normal text-slate-500">{t('subscriptions_page.admin.overview.mins')}</span>
                   </div>
                   <p className="text-xs text-slate-400">
                      {t('subscriptions_page.admin.overview.consumption_includes')}
                   </p>
                </div>
                <div className="col-span-1 border-l border-slate-700 pl-8">
                   <h4 className="text-sm font-medium text-slate-400 mb-1">{t('subscriptions_page.admin.overview.avg_payout_rate')}</h4>
                   <div className="text-2xl font-bold text-green-400 mb-2">
                      {formatCurrency(INSTRUCTOR_POOL_AMOUNT / TOTAL_SYSTEM_MINUTES)} <span className="text-lg font-normal text-slate-500">{t('subscriptions_page.admin.overview.per_minute')}</span>
                   </div>
                   <p className="text-xs text-slate-400">
                      {t('subscriptions_page.admin.overview.based_on_current_settings')}
                   </p>
                </div>
             </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.overview.monthly_revenue')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(TOTAL_MONTHLY_REVENUE)}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {t('subscriptions_page.admin.metrics.from_last_month_12')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.overview.total_subscriptions')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subscriptions.length.toLocaleString('vi-VN')}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {t('subscriptions_page.admin.metrics.from_last_month_8')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.overview.churn_rate_label')}</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5.8%</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
                  {t('subscriptions_page.admin.metrics.from_last_month_02')}
                </p>
              </CardContent>
            </Card>

             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.overview.arpu_title')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(245000)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('subscriptions_page.admin.overview.arpu_description')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('subscriptions_page.admin.overview.revenue_growth_title')}</CardTitle>
                <CardDescription>{t('subscriptions_page.admin.overview.revenue_growth_description')}</CardDescription>
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
                <CardTitle>{t('subscriptions_page.admin.overview.plan_distribution_title')}</CardTitle>
                <CardDescription>{t('subscriptions_page.admin.overview.plan_distribution_description')}</CardDescription>
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
                    {t('subscriptions_page.admin.most_popular')}
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
                    <span className="text-muted-foreground text-sm">{t('subscriptions_page.admin.plan_card.per_month')}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('subscriptions_page.admin.plan_card.subscribers_label')}</span>
                      <span className="font-medium">{plan.subscriberCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('subscriptions_page.admin.plan_card.revenue_label')}</span>
                      <span className="font-medium">{formatCurrency(plan.revenue)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="w-4 h-4 mr-2" /> {t('subscriptions_page.admin.plan_card.edit')}
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      <BarChart3 className="w-4 h-4 mr-2" /> {t('subscriptions_page.admin.plan_card.details')}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="w-full"
                      size="sm"
                      onClick={() => openConfirm(
                        plan.isActive ? t('subscriptions_page.admin.actions.deactivate_title') : t('subscriptions_page.admin.actions.activate_title'),
                        plan.isActive ? t('subscriptions_page.admin.actions.deactivate_description', { name: plan.name }) : t('subscriptions_page.admin.actions.activate_description', { name: plan.name }),
                        plan.isActive ? t('subscriptions_page.admin.actions.deactivate') : t('subscriptions_page.admin.actions.activate'),
                        () => handleTogglePlanStatus(plan),
                      )}
                    >
                      {plan.isActive ? t('subscriptions_page.admin.actions.deactivate') : t('subscriptions_page.admin.actions.activate')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      size="sm"
                      onClick={() => openConfirm(
                        plan.isPopular ? t('subscriptions_page.admin.actions.unfeature_title') : t('subscriptions_page.admin.actions.feature_title'),
                        plan.isPopular ? t('subscriptions_page.admin.actions.unfeature_description', { name: plan.name }) : t('subscriptions_page.admin.actions.feature_description', { name: plan.name }),
                        plan.isPopular ? t('subscriptions_page.admin.actions.unmark_featured') : t('subscriptions_page.admin.actions.mark_featured'),
                        () => handleToggleFeaturedPlan(plan),
                      )}
                    >
                      {plan.isPopular ? t('subscriptions_page.admin.actions.unmark_featured') : t('subscriptions_page.admin.actions.mark_featured')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-red-600"
                      size="sm"
                      onClick={() => openConfirm(
                        t('subscriptions_page.admin.actions.delete_title'),
                        t('subscriptions_page.admin.actions.delete_description', { name: plan.name }),
                        t('common.delete'),
                        () => handleDeletePlan(plan),
                        true,
                      )}
                    >
                      {t('common.delete')}
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
            label={t('subscriptions_page.admin.bulk.selected_label')}
            onClear={() => setSelectedSubscriptionIds([])}
            actions={[
              {
                key: 'extend',
                label: t('subscriptions_page.admin.bulk.extend'),
                onClick: () => openConfirm(
                  t('subscriptions_page.admin.bulk.extend_title'),
                  t('subscriptions_page.admin.bulk.extend_description', { count: selectedSubscriptionIds.length, days: extendDays }),
                  t('subscriptions_page.admin.bulk.extend'),
                  bulkExtendSubscriptions,
                ),
              },
              {
                key: 'cancel',
                label: t('subscriptions_page.admin.bulk.cancel'),
                destructive: true,
                onClick: () => openConfirm(
                  t('subscriptions_page.admin.bulk.cancel_title'),
                  t('subscriptions_page.admin.bulk.cancel_description', { count: selectedSubscriptionIds.length }),
                  t('subscriptions_page.admin.bulk.cancel'),
                  bulkCancelSubscriptions,
                  true,
                ),
              },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t('subscriptions_page.admin.subscriptions_table.title')}</CardTitle>
              <CardDescription>{t('subscriptions_page.admin.subscriptions_table.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Input placeholder={t('subscriptions_page.admin.subscriptions_table.search_placeholder')} className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('subscriptions_page.admin.subscriptions_table.status_filter_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('subscriptions_page.admin.subscriptions_table.all_statuses')}</SelectItem>
                    <SelectItem value="active">{t('subscriptions_page.admin.status.active')}</SelectItem>
                    <SelectItem value="canceled">{t('subscriptions_page.admin.status.canceled')}</SelectItem>
                    <SelectItem value="trialing">{t('subscriptions_page.admin.status.trialing')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <Input
                  placeholder={t('subscriptions_page.admin.subscriptions_table.search_placeholder')}
                  className="max-w-sm"
                  value={subscriptionSearchQuery}
                  onChange={(e) => setSubscriptionSearchQuery(e.target.value)}
                />
                <Select value={subscriptionStatusFilter} onValueChange={(value: 'all' | Subscription['status']) => setSubscriptionStatusFilter(value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t('subscriptions_page.admin.subscriptions_table.status_filter_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('subscriptions_page.admin.subscriptions_table.all_statuses')}</SelectItem>
                    <SelectItem value="active">{t('subscriptions_page.admin.status.active')}</SelectItem>
                    <SelectItem value="canceled">{t('subscriptions_page.admin.status.canceled')}</SelectItem>
                    <SelectItem value="trialing">{t('subscriptions_page.admin.status.trialing')}</SelectItem>
                    <SelectItem value="paused">{t('subscriptions_page.admin.status.paused')}</SelectItem>
                    <SelectItem value="past_due">{t('subscriptions_page.admin.status.past_due')}</SelectItem>
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
                    <TableHead>{t('subscriptions_page.admin.subscriptions_table.user')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.plan')}</TableHead>
                    <TableHead>{t('forum.status_label')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.subscriptions_table.end_date')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.subscriptions_table.revenue')}</TableHead>
                    <TableHead className="text-right">{t('subscriptions_page.admin.table_actions')}</TableHead>
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
                          {t(`subscriptions_page.admin.status.${sub.status}`)}
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
                                <DropdownMenuLabel>{t('subscriptions_page.admin.table_actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                    setSelectedSub(sub)
                                    setIsEditSubOpen(true)
                                }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    {t('subscriptions_page.admin.subscriptions_table.edit_extend')}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => openConfirm(
                                     t('subscriptions_page.admin.subscriptions_table.cancel_now_title'),
                                     t('subscriptions_page.admin.subscriptions_table.cancel_now_description', { name: sub.user.name }),
                                     t('subscriptions_page.admin.bulk.cancel'),
                                     async () => {
                                       await adminCancelSubscription(Number(sub.id))
                                       await refreshPlansAndSubscriptions()
                                     },
                                     true,
                                )}>
                                    <X className="w-4 h-4 mr-2" />
                                    {t('subscriptions_page.admin.subscriptions_table.cancel_now')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                        {t('subscriptions_page.admin.subscriptions_table.empty')}
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
                    <CardTitle>{t('subscriptions_page.admin.settings_panel.title')}</CardTitle>
                    <CardDescription>
                        {t('subscriptions_page.admin.settings_panel.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="poolPercentage">{t('subscriptions_page.admin.settings_panel.pool_percentage_label')}</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="poolPercentage" 
                                        type="number" 
                                        value={poolPercentage} 
                                        onChange={(e) => setPoolPercentage(e.target.value)} 
                                    />
                                    <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                                        {t('subscriptions_page.admin.settings_panel.total_revenue_suffix')}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {t('subscriptions_page.admin.settings_panel.pool_percentage_help')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="minThreshold">{t('subscriptions_page.admin.settings_panel.min_payout_label')}</Label>
                                <Input 
                                    id="minThreshold" 
                                    type="number" 
                                    value={minPayoutThreshold} 
                                    onChange={(e) => setMinPayoutThreshold(e.target.value)} 
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('subscriptions_page.admin.settings_panel.min_payout_help')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="rate">{t('subscriptions_page.admin.settings_panel.estimated_rate_label')}</Label>
                                <Input 
                                    id="rate" 
                                    disabled 
                                    value={`~ ${formatCurrency((TOTAL_MONTHLY_REVENUE * (parseInt(poolPercentage) / 100)) / TOTAL_SYSTEM_MINUTES)} / ${t('subscriptions_page.admin.overview.mins')}`}
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('subscriptions_page.admin.settings_panel.estimated_rate_help')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="engagementRate">{t('subscriptions_page.admin.settings_panel.engagement_rate_label')}</Label>
                                <Input
                                    id="engagementRate"
                                    type="number"
                                    step="0.01"
                                    value={engagementRate}
                                    onChange={(e) => setEngagementRate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('subscriptions_page.admin.settings_panel.engagement_rate_help')}
                                </p>
                            </div>

                            <div className="flex items-center space-x-2 pt-4">
                                <Switch id="auto-payout" checked={autoPayoutEnabled} onCheckedChange={setAutoPayoutEnabled} />
                                <Label htmlFor="auto-payout">{t('subscriptions_page.admin.settings_panel.auto_payout_label')}</Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardContent className="border-t pt-6">
                    <Button onClick={() => void persistRevenueSettings()}>
                        <Save className="w-4 h-4 mr-2" />
                        {t('subscriptions_page.admin.settings_panel.save')}
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditSubOpen} onOpenChange={setIsEditSubOpen}>
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('subscriptions_page.admin.edit_dialog.title')}</DialogTitle>
                <DialogDescription>
                    {t('subscriptions_page.admin.edit_dialog.description', { email: selectedSub?.user.email || '' })}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>{t('subscriptions_page.admin.edit_dialog.extend_days_label')}</Label>
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            value={extendDays} 
                            onChange={(e) => setExtendDays(e.target.value)} 
                        />
                        <span className="flex items-center text-sm">{t('subscriptions_page.admin.edit_dialog.days')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t('subscriptions_page.admin.edit_dialog.extend_days_help')}
                    </p>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditSubOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleExtendSubscription}>{t('subscriptions_page.admin.edit_dialog.update')}</Button>
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



