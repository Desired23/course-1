import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { TableFilter, FilterConfig } from '../../components/FilterComponents'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
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
import { getSystemSettings, createSystemSetting, updateSystemSetting, getAdminPayments, fixPayment } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'
import type { AdminPayment } from '../../services/admin.api'
import { getPaymentStatus } from '../../services/payment.api'
import type { Payment as FullPayment } from '../../services/payment.api'
import { useTranslation } from 'react-i18next'


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
  user_name: string
  course_title: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: Date
  processed_at?: Date
  processed_by?: string
  learning_progress: number
  course_completion_days: number
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



export function PaymentManagementPage() {
  const { user, hasPermission } = useAuth()
  const { t } = useTranslation()
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([])
  const [policies, setPolicies] = useState<PaymentPolicy[]>([])
  const [instructorRates, setInstructorRates] = useState<InstructorRate[]>([])
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([])
  const [filteredPayments, setFilteredPayments] = useState<AdminPayment[]>([])
  const [selectedPayment, setSelectedPayment] = useState<FullPayment | null>(null)
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null)

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

      // legacy sections (refunds, policies, etc.) remain from settings data
      try {
        const settings = await getSystemSettings()
        const refundsS = settings.find(s => s.key === 'refund_requests')
        const policiesS = settings.find(s => s.key === 'payment_policies')
        const ratesS = settings.find(s => s.key === 'instructor_rates')
        const discountsS = settings.find(s => s.key === 'discount_rules')
        if (refundsS) { try { const r = JSON.parse(refundsS.value); setRefundRequests(r.map((x: any) => ({ ...x, requested_at: new Date(x.requested_at), processed_at: x.processed_at ? new Date(x.processed_at) : undefined }))); } catch {} }
        if (policiesS) { try { setPolicies(JSON.parse(policiesS.value).map((x: any) => ({ ...x, updated_at: new Date(x.updated_at) }))); } catch {} }
        if (ratesS) { try { setInstructorRates(JSON.parse(ratesS.value).map((x: any) => ({ ...x, effective_from: new Date(x.effective_from) }))); } catch {} }
        if (discountsS) { try { setDiscountRules(JSON.parse(discountsS.value).map((x: any) => ({ ...x, valid_from: new Date(x.valid_from), valid_to: new Date(x.valid_to) }))); } catch {} }
      } catch {
        // ignore
      }
    }
    loadData()
  }, [])

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

  const handleRefundDecision = (refundId: string, decision: 'approved' | 'rejected', reason?: string) => {
    setRefundRequests(prev => prev.map(refund => 
      refund.id === refundId 
        ? { 
            ...refund, 
            status: decision, 
            processed_at: new Date(), 
            processed_by: user?.id 
          }
        : refund
    ))
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      completed: 'default',
      failed: 'destructive',
      refunded: 'outline',
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

      <Tabs defaultValue="payments" className="space-y-6">
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
                              <DropdownMenuItem onClick={() => handleFix(payment.payment_id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('payment_management.payments.fix')}
                              </DropdownMenuItem>
                            )}
                            {payment.payment_status === 'completed' && (
                              <DropdownMenuItem>
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
            onFilterChange={() => {}}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('payment_management.refunds.list_title', { count: refundRequests.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {refundRequests.map((refund) => (
                    <TableRow key={refund.id}>
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
                              onClick={() => handleRefundDecision(refund.id, 'approved')}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRefundDecision(refund.id, 'rejected')}
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
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('payment_management.policies.title')}</CardTitle>
                <Button>
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
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('payment_management.instructor_rates.title')}</CardTitle>
                <Button>
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
                        <Button variant="ghost" size="sm">
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
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('payment_management.discounts.title')}</CardTitle>
                <Button>
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
                        <Button variant="ghost" size="sm">
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
                      handleRefundDecision(selectedRefund.id, 'approved')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.approve')}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      handleRefundDecision(selectedRefund.id, 'rejected')
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
