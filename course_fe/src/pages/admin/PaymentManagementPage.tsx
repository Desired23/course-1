import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'motion/react'
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
import { adminRefundAction, getPaymentStatus, getAdminRefunds, getPaymentAdminConfig, updatePaymentAdminConfig } from '../../services/payment.api'
import type { Payment as FullPayment } from '../../services/payment.api'
import type { AdminRefundItem } from '../../services/payment.api'
import type { RefundSettings } from '../../services/payment.api'
import { useTranslation } from 'react-i18next'
import { useRouter } from '../../components/Router'
import { UserPagination } from '../../components/UserPagination'



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


interface RefundRequest {
  id: string
  refund_id: number
  payment_id: string
  payment_details_ids: number[]
  user_name: string
  user_email?: string | null
  course_title: string
  amount: number
  reason: string
  status: 'pending' | 'processing' | 'approved' | 'success' | 'rejected' | 'failed' | 'cancelled' | 'deleted'
  requested_at: Date
  processed_at?: Date
  processed_by?: string | null
  learning_progress: number
  course_completion_days: number
  transaction_id?: string | null
  gateway_attempt_count: number
  last_gateway_attempt_at?: Date
  next_retry_at?: Date
  last_gateway_error?: string | null
  internal_note_summary?: string | null
  is_deleted: boolean
  deleted_at?: Date
  retryable: boolean
  timeline: Array<{ event: string; actor?: string | null; note?: string | null; timestamp: string }>
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

type PaymentConfigEditorType = 'policies' | 'instructor-rates' | 'discounts' | 'refund-settings'
const ITEMS_PER_PAGE = 10

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

function mapRefundRequest(refund: AdminRefundItem): RefundRequest {
  return {
    id: String(refund.refund_id),
    refund_id: refund.refund_id,
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
    gateway_attempt_count: refund.gateway_attempt_count || 0,
    last_gateway_attempt_at: refund.last_gateway_attempt_at ? new Date(refund.last_gateway_attempt_at) : undefined,
    next_retry_at: refund.next_retry_at ? new Date(refund.next_retry_at) : undefined,
    last_gateway_error: refund.last_gateway_error,
    internal_note_summary: refund.internal_note_summary,
    is_deleted: refund.is_deleted,
    deleted_at: refund.deleted_at ? new Date(refund.deleted_at) : undefined,
    retryable: refund.retryable,
    timeline: refund.timeline || [],
  }
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
  const [refundSettings, setRefundSettings] = useState<RefundSettings>({
    refund_mode: 'admin_approval',
    refund_retry_cooldown_minutes: 30,
    refund_max_retry_count: 3,
    refund_timeout_seconds: 15,
    allow_admin_override_refund_status: true,
    allow_admin_soft_delete_refund: true,
  })
  const [filteredPayments, setFilteredPayments] = useState<AdminPayment[]>([])
  const [paymentsPage, setPaymentsPage] = useState(1)
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
    confirmLabel: t('common.confirm'),
    destructive: false,
    loading: false,
    action: null,
  })
  const [refundSettingsDraft, setRefundSettingsDraft] = useState<RefundSettings>(refundSettings)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteDialogValue, setNoteDialogValue] = useState('')
  const [noteTargetRefundId, setNoteTargetRefundId] = useState<number | null>(null)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [overrideTargetRefundId, setOverrideTargetRefundId] = useState<number | null>(null)
  const [overrideStatusValue, setOverrideStatusValue] = useState<'success' | 'failed' | 'rejected' | 'cancelled'>('failed')
  const [overrideNoteValue, setOverrideNoteValue] = useState('')
  const [refundsPage, setRefundsPage] = useState(1)

  const getRefundModeLabel = (mode: RefundSettings['refund_mode']) =>
    t(`payment_management.refunds.settings.mode_options.${mode}`)

  const getToggleStatusLabel = (enabled: boolean) =>
    enabled ? t('payment_management.common.enabled') : t('payment_management.common.disabled')

  const loadRefundQueue = async () => {
    const refunds = await getAdminRefunds({ page: 1, page_size: 200, include_deleted: true })
    const mappedRefunds = (refunds.results || []).map((refund: AdminRefundItem) => mapRefundRequest(refund))
    setRefundRequests(mappedRefunds)
    setFilteredRefundRequests(mappedRefunds.filter((refund) => !refund.is_deleted))
  }

  useEffect(() => {
    const loadData = async () => {
      setLoadingPayments(true)
      try {

        const p = await getAdminPayments()
        setPayments(p)
        setFilteredPayments(p)
      } catch (err) {
        toast.error(t('payment_management.load_failed'))
      } finally {
        setLoadingPayments(false)
      }

      try {
        await loadRefundQueue()
      } catch {
        setRefundRequests([])
        setFilteredRefundRequests([])
      }

      try {
        const [policyConfig, rateConfig, discountConfig, refundConfig] = await Promise.all([
          getPaymentAdminConfig<any[]>('policies'),
          getPaymentAdminConfig<any[]>('instructor-rates'),
          getPaymentAdminConfig<any[]>('discounts'),
          getPaymentAdminConfig<RefundSettings>('refund-settings'),
        ])
        setPolicies(mapPolicies(policyConfig.value))
        setInstructorRates(mapInstructorRates(rateConfig.value))
        setDiscountRules(mapDiscountRules(discountConfig.value))
        setRefundSettings(refundConfig.value)
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
    if (type === 'refund-settings') {
      setRefundSettingsDraft(refundSettings)
      setConfigEditorValue(stringifyConfig(refundSettings))
      return
    }
    setConfigEditorValue(stringifyConfig(discountRules))
  }

  const saveConfigEditor = async () => {
    if (!configEditorType) return
    try {
      setConfigSaving(true)
      const parsed = configEditorType === 'refund-settings' ? refundSettingsDraft : JSON.parse(configEditorValue)
      if (configEditorType !== 'refund-settings' && !Array.isArray(parsed)) {
        toast.error(t('payment_management.config_invalid_array'))
        return
      }
      const response = await updatePaymentAdminConfig(configEditorType, parsed)
      if (configEditorType === 'policies') setPolicies(mapPolicies(response.value))
      if (configEditorType === 'instructor-rates') setInstructorRates(mapInstructorRates(response.value))
      if (configEditorType === 'discounts') setDiscountRules(mapDiscountRules(response.value))
      if (configEditorType === 'refund-settings') setRefundSettings(response.value)
      toast.success(t('payment_management.config_save_success'))
      setConfigEditorType(null)
    } catch (err: any) {
      toast.error(err?.message || t('payment_management.config_save_failed'))
    } finally {
      setConfigSaving(false)
    }
  }


  const paymentFilterConfigs: FilterConfig[] = useMemo(() => [
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
        { label: t('payment_management.methods.vnpay'), value: 'vnpay', count: payments.filter(p => p.payment_method === 'vnpay').length },
        { label: t('payment_management.methods.credit_card'), value: 'credit_card', count: payments.filter(p => p.payment_method === 'credit_card').length },
        { label: t('payment_management.methods.paypal'), value: 'paypal', count: payments.filter(p => p.payment_method === 'paypal').length }
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
  ], [payments, t])

  const refundFilterConfigs: FilterConfig[] = useMemo(() => [
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
        { label: t('payment_management.refunds.processing'), value: 'processing', count: refundRequests.filter(r => r.status === 'processing').length },
        { label: t('payment_management.refunds.failed'), value: 'failed', count: refundRequests.filter(r => r.status === 'failed').length },
        { label: t('payment_management.refunds.approved'), value: 'approved', count: refundRequests.filter(r => r.status === 'approved').length },
        { label: t('payment_management.refunds.rejected'), value: 'rejected', count: refundRequests.filter(r => r.status === 'rejected').length },
        { label: t('payment_management.refunds.deleted'), value: 'deleted', count: refundRequests.filter(r => r.is_deleted).length },
      ]
    },
    {
      key: 'retryable',
      label: t('payment_management.refunds.retryable'),
      type: 'select',
      options: [
        { label: t('payment_management.refunds.ready_to_retry'), value: 'true', count: refundRequests.filter(r => r.retryable).length },
      ]
    }
  ], [refundRequests, t])

  const handlePaymentFilter = useCallback((filters: any) => {
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
    setPaymentsPage(1)
  }, [payments])

  const mergeRefundUpdates = (updatedItems: AdminRefundItem[] = []) => {
    if (updatedItems.length === 0) return
    const mapped = updatedItems.map(mapRefundRequest)
    const mappedById = new Map(mapped.map((item) => [item.id, item]))
    setRefundRequests((prev) => prev.map((item) => mappedById.get(item.id) || item))
    setFilteredRefundRequests((prev) => prev.map((item) => mappedById.get(item.id) || item))
    if (selectedRefund) {
      const next = mappedById.get(selectedRefund.id)
      if (next) setSelectedRefund(next)
    }
  }

  const openNoteDialog = (refundId: number) => {
    setNoteTargetRefundId(refundId)
    setNoteDialogValue('')
    setNoteDialogOpen(true)
  }

  const submitNoteDialog = async () => {
    if (!noteTargetRefundId || !noteDialogValue.trim()) return
    await handleRefundAction([noteTargetRefundId], 'add_note', { note: noteDialogValue.trim() })
    setNoteDialogOpen(false)
    setNoteDialogValue('')
    setNoteTargetRefundId(null)
  }

  const openOverrideDialog = (refundId: number) => {
    setOverrideTargetRefundId(refundId)
    setOverrideStatusValue('failed')
    setOverrideNoteValue('')
    setOverrideDialogOpen(true)
  }

  const submitOverrideDialog = async () => {
    if (!overrideTargetRefundId) return
    await handleRefundAction([overrideTargetRefundId], 'override_status', {
      override_status: overrideStatusValue,
      note: overrideNoteValue.trim() || undefined,
    })
    setOverrideDialogOpen(false)
    setOverrideTargetRefundId(null)
    setOverrideNoteValue('')
  }

  const updateRefundSettingsDraft = <K extends keyof RefundSettings>(key: K, value: RefundSettings[K]) => {
    setRefundSettingsDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleRefundAction = async (
    refundIds: number[],
    action: 'approve' | 'reject' | 'retry' | 'sync' | 'cancel' | 'soft_delete' | 'restore' | 'override_status' | 'add_note',
    options?: { note?: string; override_status?: 'success' | 'failed' | 'rejected' | 'cancelled' }
  ) => {
    try {
      const result = await adminRefundAction({
        action,
        refund_ids: refundIds,
        note: options?.note,
        override_status: options?.override_status,
      })
      mergeRefundUpdates(result.updated_items)
      await loadRefundQueue()
      if (result.errors?.length) {
        toast.error(result.errors[0].message || t('payment_management.refund_action_failed'))
        return
      }
      toast.success(result.message || t('payment_management.toasts_extra.refund_action_completed'))
    } catch (err: any) {
      toast.error(err?.message || t('payment_management.refund_action_failed'))
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
        confirmLabel: t('common.confirm'),
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleRefundFilter = useCallback((filters: any) => {
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
      if (filters.status === 'deleted') {
        filtered = filtered.filter(refund => refund.is_deleted)
      } else {
        filtered = filtered.filter(refund => !refund.is_deleted && refund.status === filters.status)
      }
    } else {
      filtered = filtered.filter(refund => !refund.is_deleted)
    }

    if (filters.retryable) {
      filtered = filtered.filter(refund => refund.retryable === (filters.retryable === 'true'))
    }

    setFilteredRefundRequests(filtered)
    setSelectedRefundIds([])
    setRefundsPage(1)
  }, [refundRequests])

  const togglePaymentSelection = (paymentId: number, checked: boolean) => {
    setSelectedPaymentIds(prev => checked ? [...prev, paymentId] : prev.filter(id => id !== paymentId))
  }

  const toggleAllPayments = (checked: boolean) => {
    const currentPageIds = pagedPayments.map(payment => payment.payment_id)
    if (checked) {
      setSelectedPaymentIds(prev => Array.from(new Set([...prev, ...currentPageIds])))
      return
    }
    setSelectedPaymentIds(prev => prev.filter(id => !currentPageIds.includes(id)))
  }

  const toggleRefundSelection = (refundId: string, checked: boolean) => {
    setSelectedRefundIds(prev => checked ? [...prev, refundId] : prev.filter(id => id !== refundId))
  }

  const toggleAllRefunds = (checked: boolean) => {
    const currentPageIds = pagedRefundRequests.map(refund => refund.id)
    if (checked) {
      setSelectedRefundIds(prev => Array.from(new Set([...prev, ...currentPageIds])))
      return
    }
    setSelectedRefundIds(prev => prev.filter(id => !currentPageIds.includes(id)))
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
      toast.success(t('payment_management.bulk_process_success'))
    } catch {
      toast.error(t('payment_management.fix_failed'))
    }
  }

  const bulkRefundDecision = async (decision: 'approved' | 'rejected') => {
    try {
      await handleRefundAction(
        selectedRefundIds.map((id) => Number(id)),
        decision === 'approved' ? 'approve' : 'reject',
      )
      setSelectedRefundIds([])
    } catch {
      toast.error(t('payment_management.bulk_refund_failed'))
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'secondary',
      completed: 'default',
      failed: 'destructive',
      refunded: 'outline',
      success: 'outline',
      cancelled: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      deleted: 'outline',
    } as const

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const paymentsTotalPages = Math.max(1, Math.ceil(filteredPayments.length / ITEMS_PER_PAGE))
  const refundsTotalPages = Math.max(1, Math.ceil(filteredRefundRequests.length / ITEMS_PER_PAGE))

  const pagedPayments = filteredPayments.slice(
    (paymentsPage - 1) * ITEMS_PER_PAGE,
    paymentsPage * ITEMS_PER_PAGE,
  )
  const pagedRefundRequests = filteredRefundRequests.slice(
    (refundsPage - 1) * ITEMS_PER_PAGE,
    refundsPage * ITEMS_PER_PAGE,
  )

  useEffect(() => {
    if (paymentsPage > paymentsTotalPages) {
      setPaymentsPage(paymentsTotalPages)
    }
  }, [paymentsPage, paymentsTotalPages])

  useEffect(() => {
    if (refundsPage > refundsTotalPages) {
      setRefundsPage(refundsTotalPages)
    }
  }, [refundsPage, refundsTotalPages])

  const handleFix = async (paymentId: number) => {
    try {
      await fixPayment(paymentId)
      toast.success(t('payment_management.fix_success'))

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
    <motion.div
      className="p-6 space-y-6 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">

      <motion.div className="flex justify-between items-center" variants={fadeInUp}>
        <div>
          <h1 className="text-3xl mb-2">{t('payment_management.title')}</h1>
          <p className="text-muted-foreground">{t('payment_management.subtitle')}</p>
        </div>
      </motion.div>


      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={fadeInUp}>
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
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
        <TabsList className="relative h-auto flex-wrap p-1">
          <TabsTrigger value="payments" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'payments' && <motion.span layoutId="payment-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_management.tabs.payments')}</span>
          </TabsTrigger>
          <TabsTrigger value="refunds" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'refunds' && <motion.span layoutId="payment-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_management.tabs.refunds')}</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'policies' && <motion.span layoutId="payment-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_management.tabs.policies')}</span>
          </TabsTrigger>
          <TabsTrigger value="instructor-rates" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'instructor-rates' && <motion.span layoutId="payment-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_management.tabs.instructor_rates')}</span>
          </TabsTrigger>
          <TabsTrigger value="discounts" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {activeTab === 'discounts' && <motion.span layoutId="payment-management-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10">{t('payment_management.tabs.discounts')}</span>
          </TabsTrigger>
        </TabsList>


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
                        checked={
                          pagedPayments.length > 0 &&
                          pagedPayments.every((payment) => selectedPaymentIds.includes(payment.payment_id))
                        }
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
                  {pagedPayments.map((payment) => (
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
                                toast.info(t('payment_management.switch_to_refunds_hint'))
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
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Trang {paymentsPage}/{paymentsTotalPages} - Tổng {filteredPayments.length} giao dịch
                </p>
                <UserPagination currentPage={paymentsPage} totalPages={paymentsTotalPages} onPageChange={setPaymentsPage} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="refunds" className="space-y-6">
          <TableFilter
            title={t('payment_management.refunds.filter_title')}
            configs={refundFilterConfigs}
            onFilterChange={handleRefundFilter}
          />
          <AdminBulkActionBar
            count={selectedRefundIds.length}
            label={t('payment_management.refunds.selected_label')}
            onClear={() => setSelectedRefundIds([])}
            actions={[
              {
                key: 'approve',
                label: t('payment_management.refunds.approve'),
                onClick: () => openConfirm(
                  t('payment_management.refunds.bulk.approve_title'),
                  t('payment_management.refunds.bulk.approve_description', { count: selectedRefundIds.length }),
                  t('payment_management.refunds.bulk.approve_label'),
                  () => bulkRefundDecision('approved'),
                ),
              },
              {
                key: 'reject',
                label: t('payment_management.refunds.reject'),
                destructive: true,
                onClick: () => openConfirm(
                  t('payment_management.refunds.bulk.reject_title'),
                  t('payment_management.refunds.bulk.reject_description', { count: selectedRefundIds.length }),
                  t('payment_management.refunds.bulk.reject_label'),
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
                        checked={
                          pagedRefundRequests.length > 0 &&
                          pagedRefundRequests.every((refund) => selectedRefundIds.includes(refund.id))
                        }
                        onCheckedChange={(checked) => toggleAllRefunds(Boolean(checked))}
                      />
                    </TableHead>
                    <TableHead>{t('payment_management.refunds.table.student')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.course')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.amount')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.progress')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.status')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.attempts')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.retry_at')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.gateway')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.notes')}</TableHead>
                    <TableHead>{t('payment_management.refunds.table.request_date')}</TableHead>
                    <TableHead className="w-[180px]">{t('payment_management.refunds.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRefundRequests.map((refund) => (
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
                      <TableCell>{refund.gateway_attempt_count}</TableCell>
                      <TableCell>{refund.next_retry_at ? refund.next_retry_at.toLocaleString() : '-'}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {refund.last_gateway_error || '-'}
                        </span>
                      </TableCell>
                      <TableCell>{refund.internal_note_summary ? t('common.yes') : t('common.no')}</TableCell>
                      <TableCell>{refund.requested_at.toLocaleDateString()}</TableCell>
                      <TableCell>
                        {refund.status === 'pending' ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => openConfirm(
                                t('payment_management.refunds.actions.approve_title'),
                                t('payment_management.refunds.actions.approve_description', { name: refund.user_name, course: refund.course_title }),
                                t('payment_management.refunds.approve'),
                                () => handleRefundAction([refund.refund_id], 'approve'),
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openConfirm(
                                t('payment_management.refunds.actions.reject_title'),
                                t('payment_management.refunds.actions.reject_description', { name: refund.user_name, course: refund.course_title }),
                                t('payment_management.refunds.reject'),
                                () => handleRefundAction([refund.refund_id], 'reject'),
                                true,
                              )}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRefund(refund)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : refund.status === 'processing' ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => openConfirm(
                                t('payment_management.refunds.actions.sync_title'),
                                t('payment_management.refunds.actions.sync_description', { name: refund.user_name, course: refund.course_title }),
                                t('payment_management.refunds.actions.sync'),
                                () => handleRefundAction([refund.refund_id], 'sync'),
                              )}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openConfirm(
                                t('payment_management.refunds.actions.cancel_title'),
                                t('payment_management.refunds.actions.cancel_description', { name: refund.user_name, course: refund.course_title }),
                                t('payment_management.refunds.actions.cancel'),
                                () => handleRefundAction([refund.refund_id], 'cancel'),
                                true,
                              )}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRefund(refund)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : refund.status === 'failed' ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => openConfirm(
                                t('payment_management.refunds.actions.retry_title'),
                                t('payment_management.refunds.actions.retry_description', { name: refund.user_name, course: refund.course_title }),
                                t('payment_management.refunds.actions.retry'),
                                () => handleRefundAction([refund.refund_id], 'retry'),
                              )}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openConfirm(
                                t('payment_management.refunds.actions.cancel_title'),
                                t('payment_management.refunds.actions.cancel_description', { name: refund.user_name, course: refund.course_title }),
                                t('payment_management.refunds.actions.cancel'),
                                () => handleRefundAction([refund.refund_id], 'cancel'),
                                true,
                              )}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRefund(refund)}>
                              <Eye className="h-4 w-4" />
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
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Trang {refundsPage}/{refundsTotalPages} - Tổng {filteredRefundRequests.length} yêu cầu hoàn tiền
                </p>
                <UserPagination currentPage={refundsPage} totalPages={refundsTotalPages} onPageChange={setRefundsPage} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="policies" className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="pt-6 text-sm text-amber-900">
              {t('payment_management.notices.policies')}
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
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{t('payment_management.refunds.workflow.title')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('payment_management.refunds.workflow.mode_label')} <span className="font-medium">{getRefundModeLabel(refundSettings.refund_mode)}</span> • {t('payment_management.refunds.workflow.cooldown', { minutes: refundSettings.refund_retry_cooldown_minutes })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('payment_management.refunds.workflow.timeout', { seconds: refundSettings.refund_timeout_seconds })} • {t('payment_management.refunds.workflow.override', { status: getToggleStatusLabel(refundSettings.allow_admin_override_refund_status) })} • {t('payment_management.refunds.workflow.soft_delete', { status: getToggleStatusLabel(refundSettings.allow_admin_soft_delete_refund) })}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => openConfigEditor('refund-settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('payment_management.refunds.workflow.configure')}
                  </Button>
                </div>
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


        <TabsContent value="instructor-rates" className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="pt-6 text-sm text-amber-900">
              {t('payment_management.notices.instructor_rates')}
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


        <TabsContent value="discounts" className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="pt-6 text-sm text-amber-900">
              {t('payment_management.notices.discounts')}
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
                        {rule.used_count}/{rule.usage_limit || 'âˆž'}
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
      </motion.div>
      </motion.div>
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
            <DialogTitle>{t('payment_management.config_editor.title')}</DialogTitle>
            <DialogDescription>
              {t('payment_management.config_editor.description', {
                type: configEditorType || t('payment_management.config_editor.default_type'),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {configEditorType === 'refund-settings' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('payment_management.refunds.settings.mode_label')}</Label>
                  <Select
                    value={refundSettingsDraft.refund_mode}
                    onValueChange={(value) => updateRefundSettingsDraft('refund_mode', value as RefundSettings['refund_mode'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('payment_management.refunds.settings.mode_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_approval">{t('payment_management.refunds.settings.mode_options.admin_approval')}</SelectItem>
                      <SelectItem value="direct_system">{t('payment_management.refunds.settings.mode_options.direct_system')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('payment_management.refunds.settings.mode_help')}
                  </p>
                </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('payment_management.refunds.settings.retry_cooldown')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={refundSettingsDraft.refund_retry_cooldown_minutes}
                        onChange={(e) => updateRefundSettingsDraft('refund_retry_cooldown_minutes', Number(e.target.value || 0))}
                      />
                    </div>
                  <div className="space-y-2">
                      <Label>{t('payment_management.refunds.settings.gateway_timeout')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={refundSettingsDraft.refund_timeout_seconds}
                      onChange={(e) => updateRefundSettingsDraft('refund_timeout_seconds', Number(e.target.value || 1))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('payment_management.refunds.settings.allow_admin_override')}</Label>
                    <Select
                      value={refundSettingsDraft.allow_admin_override_refund_status ? 'true' : 'false'}
                      onValueChange={(value) => updateRefundSettingsDraft('allow_admin_override_refund_status', value === 'true')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t('payment_management.common.enabled')}</SelectItem>
                        <SelectItem value="false">{t('payment_management.common.disabled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('payment_management.refunds.settings.allow_admin_archive')}</Label>
                    <Select
                      value={refundSettingsDraft.allow_admin_soft_delete_refund ? 'true' : 'false'}
                      onValueChange={(value) => updateRefundSettingsDraft('allow_admin_soft_delete_refund', value === 'true')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t('payment_management.common.enabled')}</SelectItem>
                        <SelectItem value="false">{t('payment_management.common.disabled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <Textarea
                value={configEditorValue}
                onChange={(e) => setConfigEditorValue(e.target.value)}
                rows={18}
                className="font-mono text-sm"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfigEditorType(null)} disabled={configSaving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={saveConfigEditor} disabled={configSaving}>
                {configSaving ? t('payment_management.config_editor.saving') : t('payment_management.config_editor.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('payment_management.dialogs.note.title')}</DialogTitle>
              <DialogDescription>
                {t('payment_management.dialogs.note.description')}
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refund-internal-note">{t('payment_management.dialogs.note.label')}</Label>
              <Textarea
                id="refund-internal-note"
                value={noteDialogValue}
                onChange={(e) => setNoteDialogValue(e.target.value)}
                rows={5}
                placeholder={t('payment_management.dialogs.note.placeholder')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void submitNoteDialog()} disabled={!noteDialogValue.trim()}>
                {t('payment_management.dialogs.note.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('payment_management.dialogs.override.title')}</DialogTitle>
            <DialogDescription>
              {t('payment_management.dialogs.override.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('payment_management.dialogs.override.status')}</Label>
              <Select
                value={overrideStatusValue}
                onValueChange={(value) => setOverrideStatusValue(value as typeof overrideStatusValue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">{t('payment_management.refunds.approved')}</SelectItem>
                  <SelectItem value="failed">{t('payment_management.refunds.failed')}</SelectItem>
                  <SelectItem value="rejected">{t('payment_management.refunds.rejected')}</SelectItem>
                  <SelectItem value="cancelled">{t('payment_management.refunds.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-override-note">{t('payment_management.dialogs.override.reason')}</Label>
              <Textarea
                id="refund-override-note"
                value={overrideNoteValue}
                onChange={(e) => setOverrideNoteValue(e.target.value)}
                rows={5}
                placeholder={t('payment_management.dialogs.override.placeholder')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void submitOverrideDialog()} disabled={!overrideNoteValue.trim()}>
                {t('payment_management.dialogs.override.apply')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


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
                    <Label className="text-sm font-medium">{t('payment_management.payment_detail.transaction_id')}</Label>
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
              {selectedRefund.processed_by && (
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.processed_by')}</Label>
                  <p>{selectedRefund.processed_by}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.gateway_attempts')}</Label>
                  <p>{selectedRefund.gateway_attempt_count}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.retry_after')}</Label>
                  <p>{selectedRefund.next_retry_at ? selectedRefund.next_retry_at.toLocaleString() : '-'}</p>
                </div>
              </div>
              {selectedRefund.last_gateway_error && (
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.last_gateway_error')}</Label>
                  <p className="text-sm text-muted-foreground">{selectedRefund.last_gateway_error}</p>
                </div>
              )}
              {selectedRefund.internal_note_summary && (
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.internal_note')}</Label>
                  <p className="text-sm text-muted-foreground">{selectedRefund.internal_note_summary}</p>
                </div>
              )}
              {selectedRefund.timeline.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">{t('payment_management.refund_detail.timeline')}</Label>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-2 text-sm">
                    {selectedRefund.timeline.map((entry, index) => (
                      <div key={`${entry.timestamp}-${index}`} className="rounded border p-2">
                        <div className="font-medium">{entry.event}</div>
                        <div className="text-xs text-muted-foreground">
                          {(entry.actor || 'system')} • {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        {entry.note && <div className="text-xs mt-1">{entry.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRefund.status === 'pending' && (
                <div className="flex gap-2 pt-4 flex-wrap">
                  <Button
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'approve')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.approve')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'reject')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.reject')}
                  </Button>
                </div>
              )}
              {selectedRefund.status === 'processing' && (
                <div className="flex gap-2 pt-4 flex-wrap">
                  <Button
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'sync')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.actions.sync')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'cancel')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.actions.cancel')}
                  </Button>
                </div>
              )}
              {selectedRefund.status === 'failed' && (
                <div className="flex gap-2 pt-4 flex-wrap">
                  <Button
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'retry')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.actions.retry')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'cancel')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refunds.actions.cancel')}
                  </Button>
                </div>
              )}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => openNoteDialog(selectedRefund.refund_id)}
                >
                  {t('payment_management.refund_detail.add_note')}
                </Button>
                {!selectedRefund.is_deleted && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'soft_delete')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refund_detail.archive')}
                  </Button>
                )}
                {selectedRefund.is_deleted && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleRefundAction([selectedRefund.refund_id], 'restore')
                      setSelectedRefund(null)
                    }}
                  >
                    {t('payment_management.refund_detail.restore')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => openOverrideDialog(selectedRefund.refund_id)}
                >
                  {t('payment_management.refund_detail.override')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  )
}
