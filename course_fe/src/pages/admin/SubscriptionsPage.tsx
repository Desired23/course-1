import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import { Progress } from '../../components/ui/progress'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  DollarSign, 
  Calendar,
  TrendingUp,
  Star,
  Crown,
  Gift,
  RefreshCw,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  X,
  BarChart3,
  Target,
  Percent,
  Clock
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { getAdminSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, getPlanSubscribers, getAdminRevenueAnalytics } from '../../services/admin.api'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useTranslation } from 'react-i18next'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  type: 'monthly' | 'yearly' | 'lifetime'
  price: number
  originalPrice?: number
  currency: string
  features: string[]
  limitations: string[]
  isPopular: boolean
  isActive: boolean
  trialDays: number
  maxCourses: number | 'unlimited'
  maxStudents: number | 'unlimited'
  supportLevel: 'basic' | 'priority' | 'dedicated'
  downloadQuota: number | 'unlimited'
  certificatesIncluded: boolean
  analytics: boolean
  customBranding: boolean
  apiAccess: boolean
  createdAt: Date
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
  paymentMethod: string
  autoRenew: boolean
  trialEnd?: Date
  canceledAt?: Date
  pausedAt?: Date
  user: {
    name: string
    email: string
    avatar?: string
  }
}

interface SubscriptionMetrics {
  totalRevenue: number
  monthlyRecurringRevenue: number
  annualRecurringRevenue: number
  totalSubscribers: number
  activeSubscribers: number
  churnRate: number
  averageRevenuePerUser: number
  lifetimeValue: number
  conversionRate: number
  trialConversion: number
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe']

export function SubscriptionsPage() {
  const { canAccess } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [metrics, setMetrics] = useState<SubscriptionMetrics>({
    totalRevenue: 0, monthlyRecurringRevenue: 0, annualRecurringRevenue: 0,
    totalSubscribers: 0, activeSubscribers: 0, churnRate: 0,
    averageRevenuePerUser: 0, lifetimeValue: 0, conversionRate: 0, trialConversion: 0
  })
  const [revenueChartData, setRevenueChartData] = useState<any[]>([])
  const [planDistributionData, setPlanDistributionData] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [apiPlans, revTrends] = await Promise.all([
          getAdminSubscriptionPlans().catch(() => []),
          getAdminRevenueAnalytics(6).catch(() => [])
        ])
        const mappedPlans: SubscriptionPlan[] = apiPlans.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          description: p.description || '',
          type: (p.duration_days <= 31 ? 'monthly' : p.duration_days <= 366 ? 'yearly' : 'lifetime') as SubscriptionPlan['type'],
          price: Number(p.price) || 0,
          currency: 'USD',
          features: (p.features || '').split(',').filter(Boolean),
          limitations: [],
          isPopular: false,
          isActive: p.is_active !== false,
          trialDays: p.trial_days || 0,
          maxCourses: p.max_courses || 'unlimited',
          maxStudents: 1,
          supportLevel: 'basic' as const,
          downloadQuota: 0,
          certificatesIncluded: false,
          analytics: false,
          customBranding: false,
          apiAccess: false,
          createdAt: new Date(p.created_at || Date.now()),
          subscriberCount: 0,
          revenue: 0,
          churnRate: 0
        }))
        setPlans(mappedPlans)

        // Load subscribers per plan
        let totalSubs = 0
        let totalRev = 0
        const allSubs: Subscription[] = []
        for (const plan of mappedPlans) {
          try {
            const subs = await getPlanSubscribers(Number(plan.id))
            plan.subscriberCount = subs.length
            totalSubs += subs.length
            totalRev += subs.length * plan.price
            subs.forEach((s: any) => {
              allSubs.push({
                id: String(s.id),
                userId: String(s.user),
                planId: plan.id,
                status: s.is_active ? 'active' : 'canceled',
                startDate: new Date(s.start_date || Date.now()),
                endDate: new Date(s.end_date || Date.now()),
                nextBillingDate: new Date(s.end_date || Date.now()),
                amount: plan.price,
                currency: 'USD',
                paymentMethod: 'N/A',
                autoRenew: s.auto_renew !== false,
                user: { name: s.user_name || `User ${s.user}`, email: s.user_email || '' }
              })
            })
          } catch { /* skip */ }
        }
        setPlans([...mappedPlans])
        setSubscriptions(allSubs)

        const mrr = totalRev
        setMetrics({
          totalRevenue: totalRev,
          monthlyRecurringRevenue: mrr,
          annualRecurringRevenue: mrr * 12,
          totalSubscribers: totalSubs,
          activeSubscribers: totalSubs,
          churnRate: 0,
          averageRevenuePerUser: totalSubs > 0 ? Math.round(totalRev / totalSubs * 100) / 100 : 0,
          lifetimeValue: 0,
          conversionRate: 0,
          trialConversion: 0
        })

        setRevenueChartData(revTrends.map((r: any) => ({
          month: r.date,
          revenue: r.revenue,
          subscribers: 0
        })))

        setPlanDistributionData(mappedPlans.map((p, i) => ({
          name: p.name,
          value: p.subscriberCount || 1,
          subscribers: p.subscriberCount,
          color: COLORS[i % COLORS.length]
        })))
      } catch (e) {
        console.error('Failed to load subscriptions', e)
      }
    }
    load()
  }, [])
  
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    type: 'monthly' as SubscriptionPlan['type'],
    price: 0,
    currency: 'USD',
    features: '',
    trialDays: 7,
    isPopular: false
  })

  if (!canAccess(['admin'], ['admin.platform.settings'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('subscriptions_page.admin.access_denied')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleCreatePlan = async () => {
    try {
      await createSubscriptionPlan({
        name: newPlan.name,
        description: newPlan.description,
        price: newPlan.price,
        duration_days: newPlan.type === 'monthly' ? 30 : newPlan.type === 'yearly' ? 365 : 9999,
        features: newPlan.features,
        is_active: true
      })
      toast.success(t('subscriptions_page.admin.create_success'))
      setIsCreatePlanOpen(false)
      setNewPlan({ name: '', description: '', type: 'monthly', price: 0, currency: 'USD', features: '', trialDays: 7, isPopular: false })
      // Reload
      window.location.reload()
    } catch (e) {
      toast.error(t('subscriptions_page.admin.create_failed'))
    }
  }

  const handleTogglePlan = async (planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId)
      if (plan) {
        await updateSubscriptionPlan(Number(planId), { is_active: !plan.isActive })
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, isActive: !p.isActive } : p))
        toast.success(t('subscriptions_page.admin.update_success'))
      }
    } catch (e) {
      toast.error(t('subscriptions_page.admin.update_failed'))
    }
  }

  const handleCancelSubscription = (subscriptionId: string) => {
    toast.info(t('subscriptions_page.admin.cancel_in_progress'))
  }

  const getStatusColor = (status: Subscription['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'trialing': return 'text-blue-600 bg-blue-100'
      case 'past_due': return 'text-red-600 bg-red-100'
      case 'canceled': return 'text-gray-600 bg-gray-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: Subscription['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'trialing': return <Clock className="h-4 w-4" />
      case 'past_due': return <AlertCircle className="h-4 w-4" />
      case 'canceled': return <X className="h-4 w-4" />
      case 'paused': return <Pause className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: Subscription['status']) => {
    switch (status) {
      case 'active': return t('subscriptions_page.admin.status.active')
      case 'trialing': return t('subscriptions_page.admin.status.trialing')
      case 'past_due': return t('subscriptions_page.admin.status.past_due')
      case 'canceled': return t('subscriptions_page.admin.status.canceled')
      case 'paused': return t('subscriptions_page.admin.status.paused')
      default: return status
    }
  }

  const getPlanTypeLabel = (type: SubscriptionPlan['type']) => {
    switch (type) {
      case 'monthly': return t('subscriptions_page.admin.plan_type.monthly')
      case 'yearly': return t('subscriptions_page.admin.plan_type.yearly')
      case 'lifetime': return t('subscriptions_page.admin.plan_type.lifetime')
      default: return type
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('subscriptions_page.admin.title')}</h1>
          <p className="text-muted-foreground">{t('subscriptions_page.admin.subtitle')}</p>
        </div>
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('subscriptions_page.admin.plan_name')}</Label>
                  <Input
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                    placeholder={t('subscriptions_page.admin.plan_name_placeholder')}
                  />
                </div>
                <div>
                  <Label>{t('subscriptions_page.admin.billing_type')}</Label>
                  <Select value={newPlan.type} onValueChange={(value) => setNewPlan({...newPlan, type: value as SubscriptionPlan['type']})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t('subscriptions_page.admin.plan_type.monthly')}</SelectItem>
                      <SelectItem value="yearly">{t('subscriptions_page.admin.plan_type.yearly')}</SelectItem>
                      <SelectItem value="lifetime">{t('subscriptions_page.admin.plan_type.lifetime')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>{t('subscriptions_page.admin.description')}</Label>
                <Textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  placeholder={t('subscriptions_page.admin.description_placeholder')}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{t('subscriptions_page.admin.price')}</Label>
                  <Input
                    type="number"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({...newPlan, price: parseFloat(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>{t('subscriptions_page.admin.currency')}</Label>
                  <Select value={newPlan.currency} onValueChange={(value) => setNewPlan({...newPlan, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('subscriptions_page.admin.trial_days')}</Label>
                  <Input
                    type="number"
                    value={newPlan.trialDays}
                    onChange={(e) => setNewPlan({...newPlan, trialDays: parseInt(e.target.value)})}
                    placeholder="7"
                  />
                </div>
              </div>
              
              <div>
                <Label>{t('subscriptions_page.admin.features')}</Label>
                <Textarea
                  value={newPlan.features}
                  onChange={(e) => setNewPlan({...newPlan, features: e.target.value})}
                  placeholder={t('subscriptions_page.admin.features_placeholder')}
                  rows={5}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="popular"
                  checked={newPlan.isPopular}
                  onCheckedChange={(checked) => setNewPlan({...newPlan, isPopular: checked})}
                />
                <Label htmlFor="popular">{t('subscriptions_page.admin.mark_popular')}</Label>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatePlanOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreatePlan}>
                  {t('subscriptions_page.admin.create_plan')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('subscriptions_page.admin.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="plans">{t('subscriptions_page.admin.tabs.plans')}</TabsTrigger>
          <TabsTrigger value="subscriptions">{t('subscriptions_page.admin.tabs.subscriptions')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('subscriptions_page.admin.tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="billing">{t('subscriptions_page.admin.tabs.billing')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.metrics.mrr')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.monthlyRecurringRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {t('subscriptions_page.admin.metrics.from_last_month_12')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.metrics.active_subscribers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeSubscribers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {t('subscriptions_page.admin.metrics.from_last_month_8')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.metrics.churn_rate')}</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.churnRate}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1 text-red-500" />
                  {t('subscriptions_page.admin.metrics.from_last_month_02')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.metrics.arpu')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.averageRevenuePerUser}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {t('subscriptions_page.admin.metrics.from_last_month_57')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('subscriptions_page.admin.revenue_growth')}</CardTitle>
                <CardDescription>{t('subscriptions_page.admin.revenue_growth_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('subscriptions_page.admin.plan_distribution')}</CardTitle>
                <CardDescription>{t('subscriptions_page.admin.plan_distribution_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistributionData.map((entry, index) => (
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

        <TabsContent value="plans" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.isPopular ? 'border-2 border-blue-500' : ''}`}>
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      <Star className="h-3 w-3 mr-1" />
                      {t('subscriptions_page.admin.most_popular')}
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {plan.name}
                        {plan.name === 'Business' && <Crown className="h-5 w-5 text-yellow-500" />}
                      </CardTitle>
                      <CardDescription className="mt-1">{plan.description}</CardDescription>
                    </div>
                    <Switch checked={plan.isActive} onCheckedChange={() => handleTogglePlan(plan.id)} />
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    {plan.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">${plan.originalPrice}</span>
                    )}
                    <span className="text-muted-foreground">/{getPlanTypeLabel(plan.type)}</span>
                  </div>
                  
                  {plan.trialDays > 0 && (
                    <Badge variant="outline" className="w-fit">
                      <Gift className="h-3 w-3 mr-1" />
                      {t('subscriptions_page.admin.free_trial_days', { count: plan.trialDays })}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">{t('subscriptions_page.admin.features_title')}</h4>
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {plan.limitations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">{t('subscriptions_page.admin.limitations_title')}</h4>
                      <ul className="space-y-1">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                            {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscriptions_page.admin.subscribers')}</p>
                      <p className="font-semibold">{plan.subscriberCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscriptions_page.admin.monthly_revenue')}</p>
                      <p className="font-semibold">${plan.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscriptions_page.admin.metrics.churn_rate')}</p>
                      <p className="font-semibold">{plan.churnRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('subscriptions_page.admin.support_level')}</p>
                      <p className="font-semibold capitalize">{plan.supportLevel}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedPlan(plan)}>
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      {t('subscriptions_page.admin.tabs.analytics')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('subscriptions_page.admin.active_subscriptions')}</CardTitle>
              <CardDescription>{t('subscriptions_page.admin.active_subscriptions_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('subscriptions_page.admin.customer')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.plan')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.amount')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.next_billing')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.payment_method')}</TableHead>
                    <TableHead>{t('subscriptions_page.admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => {
                    const plan = plans.find(p => p.id === subscription.planId)
                    return (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{subscription.user.name}</p>
                            <p className="text-sm text-muted-foreground">{subscription.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{plan?.name}</span>
                            {plan?.isPopular && <Star className="h-4 w-4 text-yellow-500" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(subscription.status)}>
                            {getStatusIcon(subscription.status)}
                            <span className="ml-1">{getStatusLabel(subscription.status)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>${subscription.amount}/{plan ? getPlanTypeLabel(plan.type) : ''}</TableCell>
                        <TableCell>
                          {subscription.status === 'trialing' && subscription.trialEnd
                            ? t('subscriptions_page.admin.trial_ends', { date: subscription.trialEnd.toLocaleDateString() })
                            : subscription.nextBillingDate.toLocaleDateString()
                          }
                        </TableCell>
                        <TableCell>{subscription.paymentMethod}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedSubscription(subscription)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleCancelSubscription(subscription.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.analytics_metrics.conversion_rate')}</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">{t('subscriptions_page.admin.analytics_metrics.visitor_to_subscriber')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.analytics_metrics.trial_conversion')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.trialConversion}%</div>
                <p className="text-xs text-muted-foreground">{t('subscriptions_page.admin.analytics_metrics.trial_to_paid')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.analytics_metrics.lifetime_value')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.lifetimeValue}</div>
                <p className="text-xs text-muted-foreground">{t('subscriptions_page.admin.analytics_metrics.average_customer_ltv')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('subscriptions_page.admin.analytics_metrics.annual_revenue')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.annualRecurringRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{t('subscriptions_page.admin.analytics_metrics.arr_projection')}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('subscriptions_page.admin.subscriber_growth')}</CardTitle>
                <CardDescription>{t('subscriptions_page.admin.subscriber_growth_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="subscribers" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('subscriptions_page.admin.churn_analysis')}</CardTitle>
                <CardDescription>{t('subscriptions_page.admin.churn_analysis_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{plan.name}</span>
                        <span className="text-sm text-muted-foreground">{plan.churnRate}%</span>
                      </div>
                      <Progress value={plan.churnRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('subscriptions_page.admin.billing_configuration')}</CardTitle>
              <CardDescription>{t('subscriptions_page.admin.billing_configuration_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('subscriptions_page.admin.invoice_settings')}</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">{t('subscriptions_page.admin.auto_send_invoices')}</Label>
                      <p className="text-sm text-muted-foreground">{t('subscriptions_page.admin.auto_send_invoices_description')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">{t('subscriptions_page.admin.payment_reminders')}</Label>
                      <p className="text-sm text-muted-foreground">{t('subscriptions_page.admin.payment_reminders_description')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div>
                    <Label>{t('subscriptions_page.admin.invoice_due_days')}</Label>
                    <Select defaultValue="7">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('subscriptions_page.admin.retry_settings')}</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">{t('subscriptions_page.admin.auto_retry_failed_payments')}</Label>
                      <p className="text-sm text-muted-foreground">{t('subscriptions_page.admin.auto_retry_failed_payments_description')}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div>
                    <Label>{t('subscriptions_page.admin.retry_attempts')}</Label>
                    <Select defaultValue="3">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 attempt</SelectItem>
                        <SelectItem value="2">2 attempts</SelectItem>
                        <SelectItem value="3">3 attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>{t('subscriptions_page.admin.grace_period')}</Label>
                    <Select defaultValue="3">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Details Dialog */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('subscriptions_page.admin.plan_details_title', { name: selectedPlan.name })}</DialogTitle>
              <DialogDescription>{t('subscriptions_page.admin.plan_details_description')}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('subscriptions_page.admin.plan_name')}</Label>
                  <Input value={selectedPlan.name} readOnly />
                </div>
                <div>
                  <Label>{t('subscriptions_page.admin.price')}</Label>
                  <Input value={`$${selectedPlan.price}/${getPlanTypeLabel(selectedPlan.type)}`} readOnly />
                </div>
              </div>
              
              <div>
                <Label>{t('subscriptions_page.admin.description')}</Label>
                <Textarea value={selectedPlan.description} readOnly rows={2} />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{t('subscriptions_page.admin.subscribers')}</Label>
                  <p className="text-2xl font-bold">{selectedPlan.subscriberCount.toLocaleString()}</p>
                </div>
                <div>
                  <Label>{t('subscriptions_page.admin.monthly_revenue')}</Label>
                  <p className="text-2xl font-bold">${selectedPlan.revenue.toLocaleString()}</p>
                </div>
                <div>
                  <Label>{t('subscriptions_page.admin.metrics.churn_rate')}</Label>
                  <p className="text-2xl font-bold">{selectedPlan.churnRate}%</p>
                </div>
              </div>
              
              <div>
                <Label>{t('subscriptions_page.admin.features_title')}</Label>
                <div className="mt-2 space-y-1">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

