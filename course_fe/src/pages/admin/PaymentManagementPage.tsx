import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { TableFilter, FilterConfig } from '../../components/FilterComponents'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Checkbox } from "../../components/ui/checkbox"
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { 
  CreditCard, 
  DollarSign, 
  RefreshCw, 
  Eye, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Download,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Percent,
  Settings,
  Plus
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { toast } from 'sonner'
import { getAdminPayments, fixPayment } from '../../services/admin.api'
import type { AdminPayment } from '../../services/admin.api'
import { getPaymentStatus, getAdminRefunds, updateAdminRefundStatus, getPaymentAdminConfig, updatePaymentAdminConfig } from '../../services/payment.api'
import type { Payment as FullPayment } from '../../services/payment.api'
import type { AdminRefundItem } from '../../services/payment.api'
import { useTranslation } from 'react-i18next'
import { useRouter } from '../../components/Router'


// Payment interfaces
interface Payment {
  id: string
  user_id: string
  user_name: string
  user_email: string
  course_id: string
  course_title: string
  instructor_name: string
  amount: number
  currency: string
  payment_method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'vnpay'
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  vnpay_transaction_id?: string
  vnpay_response_code?: string
  created_at: Date
  completed_at?: Date
  refund_reason?: string
  commission_rate: number
  instructor_earning: number
  platform_fee: number
}
// NOTE: legacy type above is no longer used in list view; AdminPayment from api.ts replaces it

interface RefundRequest {
  id: string
  payment_id: string
  payment_details_ids: number[]
  user_name: string
  user_email?: string | null
  course_title: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled'
  requested_at: Date
  processed_at?: Date
  processed_by?: string | null
  learning_progress: number
  course_completion_days: number
  transaction_id?: string | null
}

interface PaymentPolicy {
  id: string
  name: string
  type: 'commission' | 'refund_window' | 'minimum_payout' | 'processing_fee'
  value: number
  unit: 'percentage' | 'days' | 'currency'
  description: string
  is_active: boolean
  updated_by: string
  updated_at: Date
}

interface InstructorRate {
  id: string
  instructor_id: string
  instructor_name: string
  commission_rate: number
  effective_from: Date
  effective_to?: Date
  is_custom: boolean
  created_by: string
}

interface DiscountRule {
  id: string
  code: string
  name: string
  type: 'percentage' | 'fixed_amount'
  value: number
  minimum_order?: number
  maximum_discount?: number
  usage_limit?: number
  used_count: number
  valid_from: Date
  valid_to: Date
  applicable_courses: string[]
  created_by: string
  created_by_type: 'admin' | 'instructor'
  status: 'active' | 'inactive' | 'expired'
}

type PaymentConfigEditorType = 'policies' | 'instructor-rates' | 'discounts'

function mapPolicies(value: any[]): PaymentPolicy[] {
  return (value || []).map((item: any) => ({
    ...item,
    updated_at: new Date(item.updated_at || Date.now()),
  }))
}

function mapInstructorRates(value: any[]): InstructorRate[] {
  return (value || []).map((item: any) => ({
    ...item,
    effective_from: new Date(item.effective_from || Date.now()),
    effective_to: item.effective_to ? new Date(item.effective_to) : undefined,
  }))
}

function mapDiscountRules(value: any[]): DiscountRule[] {
  return (value || []).map((item: any) => ({
    ...item,
    valid_from: new Date(item.valid_from || Date.now()),
    valid_to: new Date(item.valid_to || Date.now()),
  }))
}

function stringifyConfig(value: unknown) {
  return JSON.stringify(value, (_key, item) => item instanceof Date ? item.toISOString() : item, 2)
}


export function PaymentManagementPage() {
  const { user, hasPermission } = useAuth()
  const { t } = useTranslation()
  const { currentRoute } = useRouter()
  const initialTab = (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('tab') === 'refunds') return 'refunds'
    }
    return currentRoute.startsWith('/admin/refunds') ? 'refunds' : 'payments'
  })()
  const [activeTab, setActiveTab] = useState<'payments' | 'refunds' | 'policies' | 'instructor-rates' | 'discounts'>(initialTab)
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([])
  const [filteredRefundRequests, setFilteredRefundRequests] = useState<RefundRequest[]>([])
  const [policies, setPolicies] = useState<PaymentPolicy[]>([])
  const [instructorRates, setInstructorRates] = useState<InstructorRate[]>([])
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([])
  const [filteredPayments, setFilteredPayments] = useState<AdminPayment[]>([])
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([])
  const [selectedRefundIds, setSelectedRefundIds] = useState<string[]>([])
  const [selectedPayment, setSelectedPayment] = useState<FullPayment | null>(null)
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null)
  const [configEditorType, setConfigEditorType] = useState<PaymentConfigEditorType | null>(null)
  const [configEditorValue, setConfigEditorValue] = useState('')
  const [configSaving, setConfigSaving] = useState(false)
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

  useEffect(() => {
    const loadData = async () => {
      setLoadingPayments(true)
      try {
        // payments now come from the real API
        const p = await getAdminPayments()
        setPayments(p)
        setFilteredPayments(p)
      } catch (err) {
        toast.error(t('payment_management.load_failed'))
      } finally {
        setLoadingPayments(false)
      }

      try {
        const refunds = await getAdminRefunds({ page: 1, page_size: 200 })
        setRefundRequests((refunds.results || []).map((refund: AdminRefundItem) => ({
          id: String(refund.refund_id),
          payment_id: String(refund.payment_id),
          payment_details_ids: refund.payment_details_ids,
          user_name: refund.user_name || '',
          user_email: refund.user_email,
          course_title: refund.course_title || '',
          amount: refund.amount,
          reason: refund.reason || '',
          status: refund.status,
          requested_at: new Date(refund.requested_at),
          processed_at: refund.processed_at ? new Date(refund.processed_at) : undefined,
          processed_by: refund.processed_by,
          learning_progress: refund.learning_progress,
          course_completion_days: refund.course_completion_days,
          transaction_id: refund.transaction_id,
        })))
        setFilteredRefundRequests((refunds.results || []).map((refund: AdminRefundItem) => ({
          id: String(refund.refund_id),
          payment_id: String(refund.payment_id),
          payment_details_ids: refund.payment_details_ids,
          user_name: refund.user_name || '',
          user_email: refund.user_email,
          course_title: refund.course_title || '',
          amount: refund.amount,
          reason: refund.reason || '',
          status: refund.status,
          requested_at: new Date(refund.requested_at),
          processed_at: refund.processed_at ? new Date(refund.processed_at) : undefined,
          processed_by: refund.processed_by,
          learning_progress: refund.learning_progress,
          course_completion_days: refund.course_completion_days,
          transaction_id: refund.transaction_id,
        })))
      } catch {
        setRefundRequests([])
        setFilteredRefundRequests([])
      }

      try {
        const [policyConfig, rateConfig, discountConfig] = await Promise.all([
          getPaymentAdminConfig<any[]>('policies'),
          getPaymentAdminConfig<any[]>('instructor-rates'),
          getPaymentAdminConfig<any[]>('discounts'),
        ])
        setPolicies(mapPolicies(policyConfig.value))
        setInstructorRates(mapInstructorRates(rateConfig.value))
        setDiscountRules(mapDiscountRules(discountConfig.value))
      } catch {
        setPolicies([])
        setInstructorRates([])
        setDiscountRules([])
      }
    }
    loadData()
  }, [])

  const openConfigEditor = (type: PaymentConfigEditorType) => {
    setConfigEditorType(type)
    if (type === 'policies') {
      setConfigEditorValue(stringifyConfig(policies))
      return
    }
    if (type === 'instructor-rates') {
      setConfigEditorValue(stringifyConfig(instructorRates))
      return
    }
    setConfigEditorValue(stringifyConfig(discountRules))
  }

  const saveConfigEditor = async () => {
    if (!configEditorType) return
    try {
      setConfigSaving(true)
      const parsed = JSON.parse(configEditorValue)
      if (!Array.isArray(parsed)) {
        toast.error('Config payload must be a JSON array.')
        return
      }
      const response = await updatePaymentAdminConfig(configEditorType, parsed)
      if (configEditorType === 'policies') setPolicies(mapPolicies(response.value))
      if (configEditorType === 'instructor-rates') setInstructorRates(mapInstructorRates(response.value))
      if (configEditorType === 'discounts') setDiscountRules(mapDiscountRules(response.value))
      toast.success('Payment config saved')
      setConfigEditorType(null)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save payment config')
    } finally {
      setConfigSaving(false)
    }
  }

  // Filter configurations
  const paymentFilterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: t('payment_management.filters.search'),
      type: 'search',
      placeholder: t('payment_management.filters.search_placeholder')
    },
    {
      key: 'has_problem',
      label: t('payment_management.filters.problem'),
      type: 'select',
      options: [
        { label: t('payment_management.filters.has_problem'), value: 'true' },
        { label: t('payment_management.filters.no_problem'), value: 'false' }
      ]
    },
    {
      key: 'status',
      label: t('payment_management.filters.status'),
      type: 'select',
      options: [
        { label: t('payment_management.status.pending'), value: 'pending', count: payments.filter(p => p.payment_status === 'pending').length },
        { label: t('payment_management.status.completed'), value: 'completed', count: payments.filter(p => p.payment_status === 'completed').length },
        { label: t('payment_management.status.failed'), value: 'failed', count: payments.filter(p => p.payment_status === 'failed').length },
        { label: t('payment_management.status.refunded'), value: 'refunded', count: payments.filter(p => p.payment_status === 'refunded').length }
      ]
    },
    {
      key: 'payment_method',
      label: t('payment_management.filters.method'),
      type: 'select',
      options: [
        { label: 'VNPAY', value: 'vnpay', count: payments.filter(p => p.payment_method === 'vnpay').length },
        { label: t('payment_management.methods.credit_card'), value: 'credit_card', count: payments.filter(p => p.payment_method === 'credit_card').length },
        { label: 'PayPal', value: 'paypal', count: payments.filter(p => p.payment_method === 'paypal').length }
      ]
    },
    {
      key: 'amount',
      label: t('payment_management.filters.amount'),
      type: 'number',
      min: 0,
      max: 10000000
    },
    {
      key: 'date',
      label: t('payment_management.filters.date'),
      type: 'daterange'
    }
  ]

  const refundFilterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: t('payment_management.filters.search'),
      type: 'search',
      placeholder: t('payment_management.refunds.search_placeholder')
    },
    {
      key: 'status',
      label: t('payment_management.filters.status'),
      type: 'select',
      options: [
        { label: t('payment_management.refunds.pending'), value: 'pending', count: refundRequests.filter(r => r.status === 'pending').length },
        { label: t('payment_management.refunds.approved'), value: 'approved', count: refundRequests.filter(r => r.status === 'approved').length },
        { label: t('payment_management.refunds.rejected'), value: 'rejected', count: refundRequests.filter(r => r.status === 'rejected').length }
      ]
    }
  ]

  const handlePaymentFilter = (filters: any) => {
    let filtered = payments

    if (filters.search) {
      filtered = filtered.filter(payment => 
        (payment.user_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (payment.user_email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (payment.course_title || '').toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.status) {
      filtered = filtered.filter(payment => payment.payment_status === filters.status)
    }

    if (filters.payment_method) {
      filtered = filtered.filter(payment => payment.payment_method === filters.payment_method)
    }

    if (filters.amount?.min || filters.amount?.max) {
      filtered = filtered.filter(payment => {
        const amount = parseFloat(payment.total_amount as any) || 0
        const min = filters.amount?.min ? parseFloat(filters.amount.min) : 0
        const max = filters.amount?.max ? parseFloat(filters.amount.max) : Infinity
        return amount >= min && amount <= max
      })
    }

    if (filters.date?.from || filters.date?.to) {
      filtered = filtered.filter(payment => {
        const date = new Date(payment.created_at)
        const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
        const to = filters.date?.to ? new Date(filters.date.to) : new Date()
        return date >= from && date <= to
      })
    }

    if (filters.has_problem) {
      const want = filters.has_problem === 'true'
      filtered = filtered.filter(p => (p as any).has_problem === want)
    }

    setFilteredPayments(filtered)
  }

  const handleRefundDecision = async (refund: RefundRequest, decision: 'approved' | 'rejected') => {
    try {
      await updateAdminRefundStatus({
        payment_id: Number(refund.payment_id),
        payment_details_ids: refund.payment_details_ids,
        status: decision,
      })
      setRefundRequests(prev => prev.map(item =>
        item.id === refund.id
          ? {
              ...item,
              status: decision,
              processed_at: new Date(),
              processed_by: user?.id,
            }
          : item
      ))
      setFilteredRefundRequests(prev => prev.map(item =>
        item.id === refund.id
          ? {
              ...item,
              status: decision,
              processed_at: new Date(),
              processed_by: user?.id,
            }
          : item
      ))
      toast.success(decision === 'approved' ? 'Refund approved' : 'Refund rejected')
    } catch {
      toast.error('Refund action failed')
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

  const handleRefundFilter = (filters: any) => {
    let filtered = refundRequests

    if (filters.search) {
      const query = String(filters.search).toLowerCase()
      filtered = filtered.filter(refund =>
        refund.user_name.toLowerCase().includes(query) ||
        (refund.user_email || '').toLowerCase().includes(query) ||
        refund.course_title.toLowerCase().includes(query) ||
        refund.reason.toLowerCase().includes(query)
      )
    }

    if (filters.status) {
      filtered = filtered.filter(refund => refund.status === filters.status)
    }

    setFilteredRefundRequests(filtered)
    setSelectedRefundIds([])
  }

  const togglePaymentSelection = (paymentId: number, checked: boolean) => {
    setSelectedPaymentIds(prev => checked ? [...prev, paymentId] : prev.filter(id => id !== paymentId))
  }

  const toggleAllPayments = (checked: boolean) => {
    setSelectedPaymentIds(checked ? filteredPayments.map(payment => payment.payment_id) : [])
  }

  const toggleRefundSelection = (refundId: string, checked: boolean) => {
    setSelectedRefundIds(prev => checked ? [...prev, refundId] : prev.filter(id => id !== refundId))
  }

  const toggleAllRefunds = (checked: boolean) => {
    setSelectedRefundIds(checked ? filteredRefundRequests.map(refund => refund.id) : [])
  }

  const bulkFixPayments = async () => {
    try {
      for (const paymentId of selectedPaymentIds) {
        const payment = filteredPayments.find(item => item.payment_id === paymentId)
        if (payment?.payment_status === 'completed' && payment.has_problem) {
          await fixPayment(paymentId)
        }
      }
      const refreshed = await getAdminPayments()
      setPayments(refreshed)
      setFilteredPayments(refreshed)
      setSelectedPaymentIds([])
      toast.success('Da xu ly cac thanh toan da chon')
    } catch {
      toast.error(t('payment_management.fix_failed'))
    }
  }

  const bulkRefundDecision = async (decision: 'approved' | 'rejected') => {
    try {
      for (const refundId of selectedRefundIds) {
        const refund = filteredRefundRequests.find(item => item.id === refundId)
        if (refund && refund.status === 'pending') {
          await updateAdminRefundStatus({
            payment_id: Number(refund.payment_id),
            payment_details_ids: refund.payment_details_ids,
            status: decision,
          })
        }
      }
      const updatedAll = refundRequests.map(item => selectedRefundIds.includes(item.id) && item.status === 'pending'
        ? { ...item, status: decision, processed_at: new Date(), processed_by: user?.id }
        : item
      )
      setRefundRequests(updatedAll)
      setFilteredRefundRequests(prev => prev.map(item => selectedRefundIds.includes(item.id) && item.status === 'pending'
        ? { ...item, status: decision, processed_at: new Date(), processed_by: user?.id }
        : item
      ))
      setSelectedRefundIds([])
      toast.success(decision === 'approved' ? 'Da duyet hoan tien da chon' : 'Da tu choi hoan tien da chon')
    } catch {
      toast.error('Bulk refund action failed')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      completed: 'default',
      failed: 'destructive',
      refunded: 'outline',
      success: 'outline',
      cancelled: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    } as const

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const handleFix = async (paymentId: number) => {
    try {
      await fixPayment(paymentId)
      toast.success(t('payment_management.fix_success'))
      // reload payments list
      const p = await getAdminPayments()
      setPayments(p)
      setFilteredPayments(p)
    } catch (err) {
      toast.error(t('payment_management.fix_failed'))
    }
  }

  if (!hasPermission('admin.payments.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">{t('payment_management.no_access_title')}</h2>
          <p className="text-muted-foreground">{t('payment_management.no_access_description')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">{t('payment_management.title')}</h1>
          <p className="text-muted-foreground">{t('payment_management.subtitle')}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payment_management.stats.total_revenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(1398000)}</div>
            <p className="text-xs text-muted-foreground">
              {t('payment_management.stats.revenue_change')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payment_management.stats.transactions')}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('payment_management.stats.completed_count', { count: payments.filter(p => p.payment_status === 'completed').length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payment_management.stats.refund_requests')}</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{refundRequests.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">
              {t('payment_management.stats.pending_review')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payment_management.stats.success_rate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">94.2%</div>
            <p className="text-xs text-muted-foreground">
              {t('payment_management.stats.success_rate_hint')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="payments">{t('payment_management.tabs.payments')}</TabsTrigger>
          <TabsTrigger value="refunds">{t('payment_management.tabs.refunds')}</TabsTrigger>
          <TabsTrigger value="policies">{t('payment_management.tabs.policies')}</TabsTrigger>
          <TabsTrigger value="instructor-rates">{t('payment_management.tabs.instructor_rates')}</TabsTrigger>
          <TabsTrigger value="discounts">{t('payment_management.tabs.discounts')}</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <TableFilter
            title={t('payment_management.payments.filter_title')}
            configs={paymentFilterConfigs}
            onFilterChange={handlePaymentFilter}
          />
          <AdminBulkActionBar
            count={selectedPaymentIds.length}
            label="payments selected"
            onClear={() => setSelectedPaymentIds([])}
            actions={[
              {
                key: 'fix',
                label: 'Fix selected',
                onClick: () => openConfirm(
                  'Fix selected payments',
                  `Attempt to fix ${selectedPaymentIds.length} selected payments that are marked problematic?`,
                  'Fix payments',
                  bulkFixPayments,
                ),
              },
            ]}
          />
          {loadingPayments && <p>{t('payment_management.payments.loading')}</p>}

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('payment_management.payments.list_title', { count: filteredPayments.length })}</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('payment_management.payments.export')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[48px]">
                      <Checkbox
                        checked={filteredPayments.length > 0 && selectedPaymentIds.length === filteredPayments.length}
                        onCheckedChange={(checked) => toggleAllPayments(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>{t('payment_management.payments.table.id')}</TableHead>
                    <TableHead>{t('payment_management.payments.table.student')}</TableHead>
                    <TableHead>{t('payment_management.payments.table.course')}</TableHead>
                    <TableHead>{t('payment_management.payments.table.amount')}</TableHead>
                    <TableHead>{t('payment_management.payments.table.method')}</TableHead>
                    <TableHead>{t('payment_management.payments.table.status')}</TableHead>
                    <TableHead>{t('payment_management.payments.table.date')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.payment_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPaymentIds.includes(payment.payment_id)}
                          onCheckedChange={(checked) => togglePaymentSelection(payment.payment_id, Boolean(checked))}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{payment.payment_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.user_name || ''}</p>
                          <p className="text-sm text-muted-foreground">{payment.user_email || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{payment.course_title || ''}</p>
                          <p className="text-sm text-muted-foreground">{payment.instructor_name || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(parseFloat(payment.total_amount))}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method || ''}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={async () => {
                              try {
                                const detail = await getPaymentStatus(payment.payment_id)
                                setSelectedPayment(detail)
                              } catch (err) {
                                toast.error(t('payment_management.payments.detail_failed'))
                              }
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('payment_management.payments.view_details')}
                            </DropdownMenuItem>
                            {payment.payment_status === 'completed' && (payment.has_problem || false) && (
                              <DropdownMenuItem onClick={() => openConfirm(
                                'Fix payment',
                                `Attempt to fix payment #${payment.payment_id}?`,
                                t('payment_management.payments.fix'),
                                () => handleFix(payment.payment_id),
                              )}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('payment_management.payments.fix')}
                              </DropdownMenuItem>
                            )}
                            {payment.payment_status === 'completed' && (
                              <DropdownMenuItem onClick={() => {
                                setActiveTab('refunds')
                                toast.info('Chuyen sang tab Refunds de xu ly yeu cau hoan tien.')
                              }}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('payment_management.payments.refund')}
                              </DropdownMenuItem>
                            )}
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

        {/* Refunds Tab */}
        <TabsContent value="refunds" className="space-y-6">
          <TableFilter
            title={t('payment_management.refunds.filter_title')}
            configs={refundFilterConfigs}
            onFilterChange={handleRefundFilter}
          />
          <AdminBulkActionBar
            count={selectedRefundIds.length}
            label="refunds selected"
            onClear={() => setSelectedRefundIds([])}
            actions={[
              {
                key: 'approve',
                label: 'Approve',
                onClick: () => openConfirm(
                  'Approve selected refunds',
                  `Approve ${selectedRefundIds.length} selected refund requests?`,
                  'Approve refunds',
                  () => bulkRefundDecision('approved'),
                ),
              },
              {
                key: 'reject',
                label: 'Reject',
                destructive: true,
                onClick: () => openConfirm(
                  'Reject selected refunds',
                  `Reject ${selectedRefundIds.length} selected refund requests?`,
                  'Reject refunds',
                  () => bulkRefundDecision('rejected'),
                  true,
                ),
              },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('payment_management.refunds.list_title', { count: filteredRefundRequests.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[48px]">
                      <Checkbox
                        checked={filteredRefundRequests.length > 0 && selectedRefundIds.length === filteredRefundRequests.length}
                        onCheckedChange={(checked) => toggleAllRefunds(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>{t('payment_management.refunds.table.student')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.course')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.amount')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.progress')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.status')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.request_date')}</TableHead>
                    <TableHead className="w-[100px]">{t('payment_management.refunds.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRefundRequests.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRefundIds.includes(refund.id)}
                          onCheckedChange={(checked) => toggleRefundSelection(refund.id, Boolean(checked))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{refund.user_name}</TableCell>
                      <TableCell>{refund.course_title}</TableCell>
                      <TableCell>{formatCurrency(refund.amount)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{t('payment_management.refunds.progress_complete', { percent: refund.learning_progress })}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('payment_management.refunds.learning_days', { days: refund.course_completion_days })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(refund.status)}</TableCell>
                      <TableCell>{refund.requested_at.toLocaleDateString()}</TableCell>
                      <TableCell>
                        {refund.status === 'pending' ? (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              onClick={() => openConfirm(
                                'Approve refund',
                                `Approve refund request for ${refund.user_name} on "${refund.course_title}"?`,
                                'Approve',
                                () => handleRefundDecision(refund, 'approved'),
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => openConfirm(
                                'Reject refund',
                                `Reject refund request for ${refund.user_name} on "${refund.course_title}"?`,
                                'Reject',
                                () => handleRefundDecision(refund, 'rejected'),
                                true,
                              )}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRefund(refund)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="pt-6 text-sm text-amber-900">
              Payment policies dang duoc doc va luu qua payment-admin config API. Du lieu van persist tren he thong cau hinh hien tai, nhung contract FE da di qua payments domain.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('payment_management.policies.title')}</CardTitle>
                <Button onClick={() => openConfigEditor('policies')}>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('payment_management.policies.update')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{policy.name}</h4>
                      <p className="text-sm text-muted-foreground">{policy.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('payment_management.policies.updated_at', { date: policy.updated_at.toLocaleDateString() })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium">
                        {policy.value}
                        {policy.unit === 'percentage' ? '%' : 
                         policy.unit === 'days' ? t('payment_management.policies.days_suffix') : ' VND'}
                      </p>
                      <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                        {policy.is_active ? t('payment_management.policies.active') : t('payment_management.policies.paused')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instructor Rates Tab */}
        <TabsContent value="instructor-rates" className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="pt-6 text-sm text-amber-900">
              Instructor commission rates da duoc load/save qua payment-admin config API de FE khong con phu thuoc truc tiep vao generic system settings.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('payment_management.instructor_rates.title')}</CardTitle>
                <Button onClick={() => openConfigEditor('instructor-rates')}>
                  <Percent className="h-4 w-4 mr-2" />
                  {t('payment_management.instructor_rates.configure')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('payment_management.instructor_rates.table.instructor')}</TableHead>
                    <TableHead>{t('payment_management.instructor_rates.table.rate')}</TableHead>
                    <TableHead>{t('payment_management.instructor_rates.table.type')}</TableHead>
                    <TableHead>{t('payment_management.instructor_rates.table.from')}</TableHead>
                    <TableHead>{t('payment_management.instructor_rates.table.to')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructorRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.instructor_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rate.commission_rate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rate.is_custom ? 'default' : 'secondary'}>
                          {rate.is_custom ? t('payment_management.instructor_rates.custom') : t('payment_management.instructor_rates.default')}
                        </Badge>
                      </TableCell>
                      <TableCell>{rate.effective_from.toLocaleDateString()}</TableCell>
                      <TableCell>{rate.effective_to?.toLocaleDateString() || t('payment_management.instructor_rates.no_end')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openConfigEditor('instructor-rates')}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discount Rules Tab */}
        <TabsContent value="discounts" className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="pt-6 text-sm text-amber-900">
              Discount rules dang duoc quan ly qua payment-admin config API. Muc tieu cua batch nay la bo viec FE doc truc tiep generic system settings cho nhom payment configs.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('payment_management.discounts.title')}</CardTitle>
                <Button onClick={() => openConfigEditor('discounts')}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('payment_management.discounts.create')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('payment_management.discounts.table.code')}</TableHead>
                    <TableHead>{t('payment_management.discounts.table.name')}</TableHead>
                    <TableHead>{t('payment_management.discounts.table.value')}</TableHead>
                    <TableHead>{t('payment_management.discounts.table.usage')}</TableHead>
                    <TableHead>{t('payment_management.discounts.table.period')}</TableHead>
                    <TableHead>{t('payment_management.discounts.table.created_by')}</TableHead>
                    <TableHead>{t('payment_management.discounts.table.status')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded">{rule.code}</code>
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        {rule.type === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value)}
                      </TableCell>
                      <TableCell>
                        {rule.used_count}/{rule.usage_limit || '∞'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{rule.valid_from.toLocaleDateString()}</p>
                          <p className="text-muted-foreground">{t('payment_management.discounts.until', { date: rule.valid_to.toLocaleDateString() })}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.created_by_type === 'admin' ? 'default' : 'outline'}>
                          {rule.created_by_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(rule.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openConfigEditor('discounts')}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

      <Dialog open={!!configEditorType} onOpenChange={(open) => {
        if (!open) setConfigEditorType(null)
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Config Editor</DialogTitle>
            <DialogDescription>
              Chinh sua JSON cho {configEditorType || 'payment config'} va luu qua payment-admin config API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={configEditorValue}
              onChange={(e) => setConfigEditorValue(e.target.value)}
              rows={18}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfigEditorType(null)} disabled={configSaving}>
                Cancel
              </Button>
              <Button onClick={saveConfigEditor} disabled={configSaving}>
                {configSaving ? 'Saving...' : 'Save Config'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('payment_management.payment_detail.title')}</DialogTitle>
              <DialogDescription>
                {t('payment_management.payment_detail.description', { id: selectedPayment.id })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.payment_detail.transaction_id')}</Label>
                  <p className="font-mono">{selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.payment_detail.status')}</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayment.payment_status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.payment_detail.email')}</Label>
                  <p>{selectedPayment.user}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.payment_detail.course')}</Label>
                  <p>{selectedPayment.courses[0]?.course_title}</p>
                  <p className="text-sm text-muted-foreground">{t('payment_management.payment_detail.instructor', { name: selectedPayment.courses[0]?.instructor_name })}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.payment_detail.amount')}</Label>
                  <p className="text-lg font-medium">{formatCurrency(selectedPayment.total_amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.payment_detail.method')}</Label>
                  <Badge variant="outline">{selectedPayment.payment_method}</Badge>
                </div>
                {selectedPayment.transaction_id && (
                  <div>
                    <Label className="text-sm font-medium">Transaction ID</Label>
                    <p className="font-mono text-sm">{selectedPayment.transaction_id}</p>
                  </div>
                )}
                <div>
                    <Label className="text-sm font-medium">{t('payment_management.payment_detail.created_at')}</Label>
                  <p>{new Date(selectedPayment.created_at).toLocaleString()}</p>
                </div>
                {selectedPayment.payment_date && (
                  <div>
                    <Label className="text-sm font-medium">{t('payment_management.payment_detail.paid_at')}</Label>
                    <p>{new Date(selectedPayment.payment_date).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Refund Detail Modal */}
      {selectedRefund && (
        <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('payment_management.refund_detail.title')}</DialogTitle>
              <DialogDescription>
                {t('payment_management.refund_detail.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('payment_management.refund_detail.student')}</Label>
                <p>{selectedRefund.user_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('payment_management.refund_detail.course')}</Label>
                <p>{selectedRefund.course_title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('payment_management.refund_detail.amount')}</Label>
                <p className="text-lg font-medium">{formatCurrency(selectedRefund.amount)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('payment_management.refund_detail.reason')}</Label>
                <p className="text-sm">{selectedRefund.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.progress')}</Label>
                  <p>{selectedRefund.learning_progress}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.days')}</Label>
                  <p>{t('payment_management.refund_detail.days_value', { days: selectedRefund.course_completion_days })}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('payment_management.refund_detail.status')}</Label>
                <div className="mt-1">{getStatusBadge(selectedRefund.status)}</div>
              </div>
              {selectedRefund.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => {
                      void handleRefundDecision(selectedRefund, 'approved')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.approve')}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      void handleRefundDecision(selectedRefund, 'rejected')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.reject')}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
