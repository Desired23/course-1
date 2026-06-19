import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { Input as AntInput, InputNumber, Select as AntSelect, Switch as AntSwitch } from 'antd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Switch } from '../../components/ui/switch'
import { Checkbox } from '../../components/ui/checkbox'
import { Skeleton } from '../../components/ui/skeleton'
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import {
  Plus,
  Edit,
  Star,
  Crown,
  Gift,
  AlertCircle,
  CheckCircle,
  Pause,
  X,
  BarChart3,
  Clock,
  Zap,
  Shield,
  Save,
  MoreHorizontal
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import { getAdminSubscriptionPlans, getPlanSubscribers, adminExtendSubscription, adminCancelSubscription, updateSubscriptionPlan, deleteSubscriptionPlan, addPlanCourse, removePlanCourse } from '../../services/admin.api'
import { useRouter } from '../../components/Router'
import { useTranslation } from 'react-i18next'
import { getCourses, type CourseListItem } from '../../services/course.api'
import { getPlanCourses, type PlanCourse } from '../../services/subscription.api'
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



export function AdminSubscriptionPage() {
  const { canAccess } = useAuth(); const { t } = useTranslation()
  const { navigate } = useRouter()
  const [activeTab, setActiveTab] = useState('plans')
  const [subscriptionSearchQuery, setSubscriptionSearchQuery] = useState('')
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'all' | Subscription['status']>('all')


  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false)
  const [editPlanForm, setEditPlanForm] = useState({ name: '', description: '', price: '', isActive: true, isPopular: false })
  const [savingEditPlan, setSavingEditPlan] = useState(false)
  const [editPlanCourseSearch, setEditPlanCourseSearch] = useState('')
  const [editPlanCourseOptions, setEditPlanCourseOptions] = useState<CourseListItem[]>([])
  const [editPlanCourseIds, setEditPlanCourseIds] = useState<number[]>([])
  const [initialEditPlanCourseIds, setInitialEditPlanCourseIds] = useState<number[]>([])
  const [editPlanCourseLabels, setEditPlanCourseLabels] = useState<Record<number, string>>({})
  const [editPlanCoursesLoading, setEditPlanCoursesLoading] = useState(false)


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

      }
    }
    setSubscriptions(allSubs)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true)
        const apiPlans = await getAdminSubscriptionPlans()
        const mapped = apiPlans.map(mapPlan)
        setPlans(mapped)
        await reloadSubscriptions(apiPlans)
      } catch {
        toast.error(t('subscriptions_page.admin.toasts.load_failed'))
      } finally {
        setDataLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const getCourseOptionLabel = (course: CourseListItem) =>
    `${course.title}${course.instructor_name ? ` - ${course.instructor_name}` : ''}`

  const getPlanCourseLabel = (planCourse: PlanCourse) =>
    `${planCourse.course_title}${planCourse.course_instructor ? ` - ${planCourse.course_instructor}` : ''}`

  useEffect(() => {
    if (!isEditPlanOpen) return

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        setEditPlanCoursesLoading(true)
        const res = await getCourses({
          page: 1,
          page_size: 50,
          status: 'published',
          search: editPlanCourseSearch.trim() || undefined,
          ordering: '-total_students',
        })
        if (!cancelled) {
          setEditPlanCourseOptions(res.results || [])
        }
      } catch {
        if (!cancelled) {
          setEditPlanCourseOptions([])
          toast.error(t('subscriptions_page.admin.form.courses_load_failed'))
        }
      } finally {
        if (!cancelled) setEditPlanCoursesLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [isEditPlanOpen, editPlanCourseSearch, t])

  const editPlanCourseSelectOptions = useMemo(() => {
    const optionMap = new Map<number, string>()
    editPlanCourseOptions.forEach((course) => optionMap.set(course.id, getCourseOptionLabel(course)))
    Object.entries(editPlanCourseLabels).forEach(([courseId, label]) => {
      optionMap.set(Number(courseId), label)
    })
    return Array.from(optionMap.entries()).map(([value, label]) => ({ value, label }))
  }, [editPlanCourseOptions, editPlanCourseLabels])

  const openEditPlan = async (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setEditPlanForm({ name: plan.name, description: plan.description, price: String(plan.price), isActive: plan.isActive, isPopular: plan.isPopular })
    setEditPlanCourseSearch('')
    setEditPlanCourseOptions([])
    setEditPlanCourseIds([])
    setInitialEditPlanCourseIds([])
    setEditPlanCourseLabels({})
    setIsEditPlanOpen(true)
    setEditPlanCoursesLoading(true)
    try {
      const planCourses = await getPlanCourses(Number(plan.id))
      const activeCourseIds = planCourses.map((item) => item.course)
      const labels = planCourses.reduce<Record<number, string>>((acc, item) => {
        acc[item.course] = getPlanCourseLabel(item)
        return acc
      }, {})
      setEditPlanCourseIds(activeCourseIds)
      setInitialEditPlanCourseIds(activeCourseIds)
      setEditPlanCourseLabels(labels)
    } catch {
      toast.error(t('subscriptions_page.admin.form.courses_load_failed'))
    } finally {
      setEditPlanCoursesLoading(false)
    }
  }

  const handleSaveEditPlan = async () => {
    if (!editingPlan) return
    const parsedPrice = Number(editPlanForm.price)
    if (!editPlanForm.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.error(t('subscriptions_page.admin.validation.name_price_required'))
      return
    }

    const planId = Number(editingPlan.id)
    const initialIds = new Set(initialEditPlanCourseIds)
    const nextIds = new Set(editPlanCourseIds)
    const courseIdsToAdd = editPlanCourseIds.filter((courseId) => !initialIds.has(courseId))
    const courseIdsToRemove = initialEditPlanCourseIds.filter((courseId) => !nextIds.has(courseId))

    try {
      setSavingEditPlan(true)
      await updateSubscriptionPlan(planId, {
        name: editPlanForm.name.trim(),
        description: editPlanForm.description.trim(),
        price: parsedPrice,
        status: editPlanForm.isActive ? 'active' : 'inactive',
        is_featured: editPlanForm.isPopular,
      })
      for (const courseId of courseIdsToAdd) {
        await addPlanCourse(planId, courseId)
      }
      for (const courseId of courseIdsToRemove) {
        await removePlanCourse(planId, courseId)
      }
      toast.success(t('subscriptions_page.admin.plan_updated', 'Plan updated'))
      const apiPlans = await getAdminSubscriptionPlans()
      setPlans(apiPlans.map(mapPlan))
      setIsEditPlanOpen(false)
    } catch (error: any) {
      toast.error(error?.message || t('subscriptions_page.admin.plan_update_failed', 'Failed to update plan'))
    } finally {
      setSavingEditPlan(false)
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

  const renderSubscriptionTableSkeleton = () => (
    Array.from({ length: 6 }).map((_, index) => (
      <TableRow key={`subscription-skeleton-${index}`}>
        <TableCell><Skeleton className="h-5 w-5" /></TableCell>
        <TableCell><Skeleton className="h-10 w-40" /></TableCell>
        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="ml-auto h-8 w-8" /></TableCell>
      </TableRow>
    ))
  )

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl font-bold">{t('subscriptions_page.admin.title')}</h1>
          <p className="text-muted-foreground">{t('subscriptions_page.admin.subtitle')}</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/subscriptions/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('subscriptions_page.admin.create_plan')}
            </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="relative grid w-full grid-cols-2 max-w-[360px] p-1">
          <TabsTrigger value="plans" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'plans' && <motion.span layoutId="admin-subscription-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('subscriptions_page.admin.tabs.plans')}</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'subscriptions' && <motion.span layoutId="admin-subscription-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('subscriptions_page.admin.tabs.subscriptions')}</span>
          </TabsTrigger>
        </TabsList>


        <TabsContent value="plans" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dataLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={`subscription-plan-skeleton-${index}`}>
                  <CardHeader>
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : plans.length === 0 ? (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <div>
                    <h3 className="text-lg font-semibold">{t('subscriptions_page.admin.empty_plans_title')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('subscriptions_page.admin.empty_plans_description')}</p>
                  </div>
                  <Button onClick={() => navigate('/admin/subscriptions/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('subscriptions_page.admin.create_plan')}
                  </Button>
                </CardContent>
              </Card>
            ) : plans.map((plan) => (
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
                    <Button variant="outline" className="w-full" size="sm" onClick={() => openEditPlan(plan)}>
                      <Edit className="w-4 h-4 mr-2" /> {t('subscriptions_page.admin.plan_card.edit')}
                    </Button>
                    <Button variant="outline" className="w-full" size="sm" onClick={() => setActiveTab('subscriptions')}>
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
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
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
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>


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
                  {dataLoading ? renderSubscriptionTableSkeleton() : filteredSubscriptions.map((sub) => (
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
                  {!dataLoading && filteredSubscriptions.length === 0 && (
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

      </Tabs>
      </motion.div>


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
      <Dialog open={isEditPlanOpen} onOpenChange={setIsEditPlanOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('subscriptions_page.admin.plan_card.edit')}</DialogTitle>
            <DialogDescription>{editingPlan?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('subscriptions_page.admin.create_dialog.name_label')}</Label>
              <AntInput value={editPlanForm.name} onChange={e => setEditPlanForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('subscriptions_page.admin.create_dialog.description_label')}</Label>
              <AntInput value={editPlanForm.description} onChange={e => setEditPlanForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('subscriptions_page.admin.create_dialog.price_label')}</Label>
              <InputNumber
                min={0}
                value={editPlanForm.price === '' ? null : Number(editPlanForm.price)}
                onChange={(value) => setEditPlanForm(p => ({ ...p, price: value === null ? '' : String(value) }))}
                style={{ width: '100%' }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t('subscriptions_page.admin.form.plan_courses')}</Label>
                <Badge variant="outline">
                  {t('subscriptions_page.admin.form.courses_selected', { count: editPlanCourseIds.length })}
                </Badge>
              </div>
              <AntSelect
                mode="multiple"
                allowClear
                showSearch
                filterOption={false}
                maxTagCount="responsive"
                value={editPlanCourseIds}
                options={editPlanCourseSelectOptions}
                loading={editPlanCoursesLoading}
                placeholder={t('subscriptions_page.admin.form.course_search_placeholder')}
                notFoundContent={editPlanCoursesLoading ? t('common.loading') : t('subscriptions_page.admin.form.courses_empty')}
                onSearch={setEditPlanCourseSearch}
                onChange={(value) => setEditPlanCourseIds(value)}
                style={{ width: '100%' }}
              />
              <p className="text-xs text-muted-foreground">
                {t('subscriptions_page.admin.form.course_search_placeholder')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <AntSwitch checked={editPlanForm.isActive} onChange={v => setEditPlanForm(p => ({ ...p, isActive: v }))} />
                <Label>{t('subscriptions_page.admin.actions.activate')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <AntSwitch checked={editPlanForm.isPopular} onChange={v => setEditPlanForm(p => ({ ...p, isPopular: v }))} />
                <Label>{t('subscriptions_page.admin.actions.mark_featured')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPlanOpen(false)} disabled={savingEditPlan}>{t('common.cancel')}</Button>
            <Button onClick={() => void handleSaveEditPlan()} disabled={savingEditPlan}>
              <Save className="w-4 h-4 mr-2" />
              {savingEditPlan ? t('common.loading') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </motion.div>
    </motion.div>
  )
}



