import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Skeleton } from "../../components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Textarea } from "../../components/ui/textarea"
import { motion } from 'motion/react'
import { useRouter } from "../../components/Router"
import { UserPagination } from "../../components/UserPagination"
import {
  cancelRefundRequest,
  createMomoPayment,
  createVnpayPayment,
  formatCurrency,
  getMyPayments,
  getUserRefunds,
  requestRefund,
  type MyPayment,
  type MyPaymentItem,
  type UserRefundItem,
} from "../../services/payment.api"
import { Calendar, CheckCircle2, CreditCard, ExternalLink, Info, PackageOpen, Receipt, ShoppingBag, XCircle } from "lucide-react"
import { ScrollArea } from "../../components/ui/scroll-area"
import { toast } from "sonner"
import { listItemTransition } from '../../lib/motion'
import { useNotificationRefetch } from '../../hooks/useNotificationRefetch'

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

interface RefundDialogState {
  paymentId: number
  paymentType: string
  items: MyPaymentItem[]
}

function interpretIPN(gateway: string | null | undefined, code: string | null | undefined) {
  if (code === null || code === undefined || code === '') return null
  const isSuccess = gateway === 'momo' ? code === '0' : code === '00'
  return { isSuccess, label: isSuccess ? 'Thành công' : `Lỗi` }
}

function refundEventLabel(event: string) {
  const map: Record<string, string> = {
    requested: 'Yêu cầu hoàn tiền',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    processing: 'Đang xử lý',
    gateway_attempted: 'Gửi yêu cầu đến cổng',
    gateway_success: 'Cổng xác nhận thành công',
    gateway_failed: 'Cổng phản hồi thất bại',
    cancelled: 'Đã hủy',
    failed: 'Thất bại',
    success: 'Hoàn tiền thành công',
    note_added: 'Ghi chú được thêm',
  }
  return map[event] || event
}

function formatRetryCountdown(target: string | null | undefined, nowMs: number) {
  if (!target) return null
  const diff = new Date(target).getTime() - nowMs
  if (diff <= 0) return null
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

export function TransactionHistoryPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"purchases" | "refunds">("purchases")
  const [payments, setPayments] = useState<MyPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1)
  const [paymentsCount, setPaymentsCount] = useState(0)
  const [purchaseStatus, setPurchaseStatus] = useState<"all" | MyPayment["payment_status"]>("all")
  const [purchaseType, setPurchaseType] = useState<"all" | MyPayment["payment_type"]>("all")
  const [purchaseRefundEligibility, setPurchaseRefundEligibility] = useState<"all" | "eligible" | "ineligible">("all")
  const [purchaseSearch, setPurchaseSearch] = useState("")
  const [purchaseSearchInput, setPurchaseSearchInput] = useState("")
  const [refunds, setRefunds] = useState<UserRefundItem[]>([])
  const [refundsLoading, setRefundsLoading] = useState(true)
  const [refundsError, setRefundsError] = useState<string | null>(null)
  const [refundsPage, setRefundsPage] = useState(1)
  const [refundsTotalPages, setRefundsTotalPages] = useState(1)
  const [refundsCount, setRefundsCount] = useState(0)
  const [refundStatusFilter, setRefundStatusFilter] = useState<"all" | UserRefundItem["status"]>("all")
  const [refundSearch, setRefundSearch] = useState("")
  const [refundSearchInput, setRefundSearchInput] = useState("")
  const [refundDateFrom, setRefundDateFrom] = useState("")
  const [refundDateTo, setRefundDateTo] = useState("")
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refundDialogData, setRefundDialogData] = useState<RefundDialogState | null>(null)
  const [selectedRefundItemIds, setSelectedRefundItemIds] = useState<number[]>([])
  const [refundReason, setRefundReason] = useState("")
  const [submittingRefund, setSubmittingRefund] = useState(false)
  const [cancellingRefundId, setCancellingRefundId] = useState<number | null>(null)
  const [retryingPaymentId, setRetryingPaymentId] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const [detailPayment, setDetailPayment] = useState<MyPayment | null>(null)
  const [detailRefund, setDetailRefund] = useState<UserRefundItem | null>(null)

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{t("transaction_history_page.purchase_status.completed")}</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{t("transaction_history_page.purchase_status.pending")}</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t("transaction_history_page.purchase_status.failed")}</Badge>
      case "refunded":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">{t("transaction_history_page.purchase_status.refunded")}</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{t("transaction_history_page.purchase_status.cancelled")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const paymentTypeLabel = (type: string) => {
    switch (type) {
      case "course_purchase":
        return t("transaction_history_page.payment_types.course_purchase")
      case "subscription":
        return t("transaction_history_page.payment_types.subscription")
      default:
        return type
    }
  }

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case "vnpay":
        return t("transaction_history_page.payment_methods.vnpay")
      case "momo":
        return t("transaction_history_page.payment_methods.momo")
      default:
        return method
    }
  }

  const refundStatusBadge = (status: string, hasRequest = true) => {
    // 'pending' is the model default on every purchase detail; a real refund request
    // always sets refund_request_time. Without one, show no badge (no request was made).
    if (status === "pending" && !hasRequest) return null
    switch (status) {
      case "processing":
        return <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">{t("transaction_history_page.refund_status.processing")}</Badge>
      case "success":
        return <Badge variant="outline" className="text-green-600 border-green-300 text-xs">{t("transaction_history_page.refund_status.success")}</Badge>
      case "approved":
        return <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">{t("transaction_history_page.refund_status.approved")}</Badge>
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">{t("transaction_history_page.refund_status.pending")}</Badge>
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-300 text-xs">{t("transaction_history_page.refund_status.rejected")}</Badge>
      case "cancelled":
        return <Badge variant="outline" className="text-gray-500 border-gray-300 text-xs">{t("transaction_history_page.refund_status.cancelled")}</Badge>
      case "failed":
        return <Badge variant="outline" className="text-red-500 border-red-200 text-xs">{t("transaction_history_page.refund_status.failed")}</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    setPaymentsLoading(true)
    setPaymentsError(null)
    getMyPayments({
      page: paymentsPage,
      page_size: 5,
      payment_status: purchaseStatus,
      payment_type: purchaseType,
      refund_eligibility: purchaseRefundEligibility,
      search: purchaseSearch,
    })
      .then((res) => {
        if (cancelled) return
        setPayments(res.results)
        setPaymentsTotalPages(res.total_pages || 1)
        setPaymentsCount(res.count || 0)
      })
      .catch((err: any) => {
        if (!cancelled) setPaymentsError(err?.message || t("transaction_history_page.errors.load_transactions"))
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [paymentsPage, purchaseStatus, purchaseType, purchaseRefundEligibility, purchaseSearch, t])

  useEffect(() => {
    let cancelled = false
    setRefundsLoading(true)
    setRefundsError(null)
    getUserRefunds({
      page: refundsPage,
      page_size: 5,
      status: refundStatusFilter,
      search: refundSearch,
      date_from: refundDateFrom || undefined,
      date_to: refundDateTo || undefined,
    })
      .then((res) => {
        if (cancelled) return
        setRefunds(res.results)
        setRefundsTotalPages(res.total_pages || 1)
        setRefundsCount(res.count || 0)
      })
      .catch((err: any) => {
        if (!cancelled) setRefundsError(err?.message || t("transaction_history_page.errors.load_refunds"))
      })
      .finally(() => {
        if (!cancelled) setRefundsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refundsPage, refundStatusFilter, refundSearch, refundDateFrom, refundDateTo, t])

  const eligibleItemsByPayment = (payment: MyPayment) =>
    payment.items.filter((item) => payment.payment_type === "course_purchase" && item.refund_eligible)

  const openRefundDialog = (payment: MyPayment) => {
    const selectableIds = eligibleItemsByPayment(payment).map((item) => item.id)
    if (selectableIds.length === 0) {
      toast.error(t("transaction_history_page.toasts.no_refundable_courses"))
      return
    }
    setRefundDialogData({ paymentId: payment.id, paymentType: payment.payment_type, items: payment.items })
    setSelectedRefundItemIds(selectableIds)
    setRefundReason("")
    setRefundDialogOpen(true)
  }

  const closeRefundDialog = () => {
    if (submittingRefund) return
    setRefundDialogOpen(false)
    setRefundDialogData(null)
    setSelectedRefundItemIds([])
    setRefundReason("")
  }

  const toggleRefundItem = (itemId: number, enabled: boolean) => {
    if (!enabled) return
    setSelectedRefundItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const loadCurrentData = async () => {
    const [paymentsRes, refundsRes] = await Promise.all([
      getMyPayments({
        page: paymentsPage,
        page_size: 5,
        payment_status: purchaseStatus,
        payment_type: purchaseType,
        refund_eligibility: purchaseRefundEligibility,
        search: purchaseSearch,
      }),
      getUserRefunds({
        page: refundsPage,
        page_size: 5,
        status: refundStatusFilter,
        search: refundSearch,
        date_from: refundDateFrom || undefined,
        date_to: refundDateTo || undefined,
      }),
    ])
    setPayments(paymentsRes.results)
    setPaymentsTotalPages(paymentsRes.total_pages || 1)
    setPaymentsCount(paymentsRes.count || 0)
    setRefunds(refundsRes.results)
    setRefundsTotalPages(refundsRes.total_pages || 1)
    setRefundsCount(refundsRes.count || 0)
  }

  useNotificationRefetch(
    ['refund_processed', 'refund_failed', 'refund_rejected', 'payment_completed', 'payment_failed'],
    () => { loadCurrentData().catch(() => {}) },
  )

  const submitRefundRequest = async () => {
    if (!refundDialogData) return
    if (!refundReason.trim()) {
      toast.error(t("transaction_history_page.toasts.refund_reason_required"))
      return
    }
    if (selectedRefundItemIds.length === 0) {
      toast.error(t("transaction_history_page.toasts.select_refund_items"))
      return
    }
    setSubmittingRefund(true)
    try {
      const response = await requestRefund({
        payment_id: refundDialogData.paymentId,
        payment_details_ids: selectedRefundItemIds,
        reason: refundReason.trim(),
      })
      const hasProcessing = response.results.some((item) => item.status === "processing")
      toast.success(hasProcessing ? t("transaction_history_page.toasts.refund_request_processing") : t("transaction_history_page.toasts.refund_request_submitted"))
      closeRefundDialog()
      await loadCurrentData()
    } catch (err: any) {
      toast.error(err?.message || t("transaction_history_page.errors.submit_refund"))
    } finally {
      setSubmittingRefund(false)
    }
  }

  const handleCancelRefund = async (refund: UserRefundItem) => {
    setCancellingRefundId(refund.refund_id)
    try {
      await cancelRefundRequest({ payment_id: refund.payment_id, payment_details_ids: [refund.refund_id] })
      toast.success(t("transaction_history_page.toasts.refund_cancelled"))
      await loadCurrentData()
    } catch (err: any) {
      toast.error(err?.message || t("transaction_history_page.errors.cancel_refund"))
    } finally {
      setCancellingRefundId(null)
    }
  }

  const handleRetryPayment = async (payment: MyPayment) => {
    setRetryingPaymentId(payment.id)
    try {
      if (payment.payment_method === "momo") {
        const response = await createMomoPayment({ payment_id: payment.id, return_url: `${window.location.origin}/payment/result` })
        if (!response.payUrl) throw new Error(t("transaction_history_page.errors.create_momo_url"))
        window.location.href = response.payUrl
        return
      }
      const response = await createVnpayPayment({
        order_id: String(payment.id),
        amount: Math.round(parseFloat(payment.total_amount)),
        order_desc: t("transaction_history_page.retry_order_description", { id: payment.id }),
        return_url: `${window.location.origin}/payment/result`,
      })
      if (!response.payment_url) throw new Error(t("transaction_history_page.errors.create_vnpay_url"))
      window.location.href = response.payment_url
    } catch (err: any) {
      toast.error(err?.message || err?.error || t("transaction_history_page.errors.retry_payment"))
      await loadCurrentData()
    } finally {
      setRetryingPaymentId(null)
    }
  }

  const isInitialLoading = paymentsLoading && refundsLoading
  const refundDialogItems = useMemo(() => refundDialogData?.items || [], [refundDialogData])

  const renderPaymentSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`payment-skeleton-${index}`} className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )

  if (isInitialLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          {renderPaymentSkeleton()}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="max-w-5xl mx-auto" variants={sectionStagger} initial="hidden" animate="show">
        <motion.div className="mb-6 md:mb-8" variants={fadeInUp}>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            {t("transaction_history_page.title")}
          </h1>
          <p className="text-muted-foreground">{t("transaction_history_page.subtitle")}</p>
        </motion.div>

        <motion.div variants={fadeInUp}>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "purchases" | "refunds")}>
          <TabsList className="relative mb-4 w-full justify-start overflow-x-auto p-1">
            <TabsTrigger value="purchases" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {activeTab === 'purchases' && (
                <motion.span
                  layoutId="transaction-history-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t("transaction_history_page.tabs.purchases", { count: paymentsCount })}</span>
            </TabsTrigger>
            <TabsTrigger value="refunds" className="relative shrink-0 whitespace-nowrap data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {activeTab === 'refunds' && (
                <motion.span
                  layoutId="transaction-history-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t("transaction_history_page.tabs.refunds", { count: refundsCount })}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            <motion.div variants={fadeInUp}>
            <Card className="app-surface-elevated">
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  className="h-9 rounded-md border px-3 text-sm"
                  value={purchaseSearchInput}
                  onChange={(e) => setPurchaseSearchInput(e.target.value)}
                  placeholder={t("transaction_history_page.purchase_filters.search_placeholder")}
                />
                <Button variant="outline" className="h-9" onClick={() => { setPaymentsPage(1); setPurchaseSearch(purchaseSearchInput.trim()) }}>
                  {t("transaction_history_page.purchase_filters.apply")}
                </Button>
                <select className="h-9 rounded-md border px-3 text-sm" value={purchaseStatus} onChange={(e) => { setPaymentsPage(1); setPurchaseStatus(e.target.value as "all" | MyPayment["payment_status"]) }}>
                  <option value="all">{t("transaction_history_page.purchase_filters.status_all")}</option>
                  <option value="completed">{t("transaction_history_page.purchase_status.completed")}</option>
                  <option value="pending">{t("transaction_history_page.purchase_status.pending")}</option>
                  <option value="failed">{t("transaction_history_page.purchase_status.failed")}</option>
                  <option value="refunded">{t("transaction_history_page.purchase_status.refunded")}</option>
                  <option value="cancelled">{t("transaction_history_page.purchase_status.cancelled")}</option>
                </select>
                <select className="h-9 rounded-md border px-3 text-sm" value={purchaseType} onChange={(e) => { setPaymentsPage(1); setPurchaseType(e.target.value as "all" | MyPayment["payment_type"]) }}>
                  <option value="all">{t("transaction_history_page.purchase_filters.type_all")}</option>
                  <option value="course_purchase">{t("transaction_history_page.payment_types.course_purchase")}</option>
                  <option value="subscription">{t("transaction_history_page.payment_types.subscription")}</option>
                </select>
                <select className="h-9 rounded-md border px-3 text-sm" value={purchaseRefundEligibility} onChange={(e) => { setPaymentsPage(1); setPurchaseRefundEligibility(e.target.value as "all" | "eligible" | "ineligible") }}>
                  <option value="all">{t("transaction_history_page.purchase_filters.refund_all")}</option>
                  <option value="eligible">{t("transaction_history_page.purchase_filters.refund_eligible")}</option>
                  <option value="ineligible">{t("transaction_history_page.purchase_filters.refund_ineligible")}</option>
                </select>
              </CardContent>
            </Card>
            </motion.div>

            {paymentsLoading ? (
              renderPaymentSkeleton()
            ) : paymentsError ? (
              <div className="p-8 text-center"><p className="text-destructive mb-4">{paymentsError}</p></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <PackageOpen className="h-16 w-16 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-medium mb-2">{t("transaction_history_page.empty_purchases_title")}</p>
                <p className="text-sm mb-6">{t("transaction_history_page.empty_purchases_description")}</p>
                <Button onClick={() => navigate("/courses")}>{t("transaction_history_page.explore_courses")}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment, index) => {
                  const eligibleItems = eligibleItemsByPayment(payment)
                  const retryCountdown = formatRetryCountdown(payment.retryable_until, nowMs)
                  const canRetryPayment = !!payment.can_retry_payment && !!retryCountdown
                  return (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={listItemTransition(index)}
                    >
                    <Card className="app-interactive overflow-hidden">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {payment.payment_type === "subscription" ? <CreditCard className="h-5 w-5 text-primary" /> : <ShoppingBag className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{paymentTypeLabel(payment.payment_type)}</span>
                                {statusBadge(payment.payment_status)}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : t("transaction_history_page.not_available")}
                                </span>
                                <span>{paymentMethodLabel(payment.payment_method)}</span>
                                {payment.transaction_id && <span className="hidden sm:inline truncate max-w-[180px]">#{payment.transaction_id}</span>}
                              </div>
                              {canRetryPayment && <p className="mt-1 text-xs text-amber-700">{t("transaction_history_page.retry_available", { countdown: retryCountdown })}</p>}
                            </div>
                          </div>
                          <div className="flex items-start gap-2 flex-shrink-0">
                            <div className="text-right">
                              <div className="font-bold text-base">{formatCurrency(payment.total_amount)}</div>
                              {parseFloat(payment.discount_amount) > 0 && <div className="text-xs text-green-600">-{formatCurrency(payment.discount_amount)}</div>}
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 mt-0.5" onClick={(e) => { e.stopPropagation(); setDetailPayment(payment) }} title="Xem chi tiết IPN">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>

                      {payment.items.length > 0 && (
                        <div className="border-t bg-muted/30">
                          <div className="p-4 sm:p-5 space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("transaction_history_page.order_details_title")}</h4>
                            {payment.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 py-2">
                                <img src={item.course_thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=80&h=50&fit=crop"} alt={item.course_title} className="w-16 h-10 rounded object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.course_title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {parseFloat(item.discount) > 0 && <span className="text-xs text-muted-foreground line-through">{formatCurrency(item.price)}</span>}
                                    <span className="text-sm font-semibold">{formatCurrency(item.final_price)}</span>
                                    {refundStatusBadge(item.refund_status, !!item.refund_request_time)}
                                  </div>
                                  <p className={`text-xs mt-1 ${item.refund_eligible ? "text-green-700" : "text-muted-foreground"}`}>
                                    {item.refund_eligible ? t("transaction_history_page.refund_eligible") : item.refund_disabled_reason || t("transaction_history_page.refund_ineligible_default")}
                                  </p>
                                </div>
                                {item.course_id && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/course/${item.course_id}`) }}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <div className="mt-3 flex flex-col gap-3 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">{t("transaction_history_page.total_paid_label")}</span>
                                  <span className="font-bold">{formatCurrency(payment.total_amount)}</span>
                                </div>
                                {parseFloat(payment.refund_amount) > 0 && (
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">{t("transaction_history_page.total_refunded_label")}</span>
                                    <span className="font-semibold text-purple-600">{formatCurrency(payment.refund_amount)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                {canRetryPayment && (
                                  <Button variant="secondary" size="sm" disabled={retryingPaymentId === payment.id} onClick={(e) => { e.stopPropagation(); void handleRetryPayment(payment) }}>
                                    {retryingPaymentId === payment.id ? t("transaction_history_page.retry_creating_link") : t("transaction_history_page.retry_payment")}
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" disabled={eligibleItems.length === 0} onClick={(e) => { e.stopPropagation(); openRefundDialog(payment) }}>
                                  {eligibleItems.length > 0 ? t("transaction_history_page.request_refund_with_count", { count: eligibleItems.length }) : t("transaction_history_page.cannot_refund")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {payment.items.length === 0 && canRetryPayment && (
                        <div className="border-t bg-muted/30">
                          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-end sm:p-5">
                            <Button variant="secondary" size="sm" disabled={retryingPaymentId === payment.id} onClick={(e) => { e.stopPropagation(); void handleRetryPayment(payment) }}>
                              {retryingPaymentId === payment.id ? t("transaction_history_page.retry_creating_link") : t("transaction_history_page.retry_payment")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                    </motion.div>
                  )
                })}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">{t("transaction_history_page.purchase_pagination", { current: paymentsPage, totalPages: paymentsTotalPages, totalCount: paymentsCount })}</p>
                  <UserPagination currentPage={paymentsPage} totalPages={paymentsTotalPages} onPageChange={setPaymentsPage} />
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="refunds" className="space-y-4">
            <motion.div variants={fadeInUp}>
            <Card className="app-surface-elevated">
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <input
                  className="h-9 rounded-md border px-3 text-sm"
                  value={refundSearchInput}
                  onChange={(e) => setRefundSearchInput(e.target.value)}
                  placeholder={t("transaction_history_page.refund_filters.search_placeholder")}
                />
                <Button variant="outline" className="h-9" onClick={() => { setRefundsPage(1); setRefundSearch(refundSearchInput.trim()) }}>
                  {t("transaction_history_page.refund_filters.apply")}
                </Button>
                <select className="h-9 rounded-md border px-3 text-sm" value={refundStatusFilter} onChange={(e) => { setRefundsPage(1); setRefundStatusFilter(e.target.value as "all" | UserRefundItem["status"]) }}>
                  <option value="all">{t("transaction_history_page.refund_filters.status_all")}</option>
                  <option value="pending">{t("transaction_history_page.refund_status.pending")}</option>
                  <option value="approved">{t("transaction_history_page.refund_status.approved")}</option>
                  <option value="success">{t("transaction_history_page.refund_status.success")}</option>
                  <option value="rejected">{t("transaction_history_page.refund_status.rejected")}</option>
                  <option value="failed">{t("transaction_history_page.refund_status.failed")}</option>
                  <option value="cancelled">{t("transaction_history_page.refund_status.cancelled")}</option>
                </select>
                <input type="date" className="h-9 rounded-md border px-3 text-sm" value={refundDateFrom} onChange={(e) => { setRefundsPage(1); setRefundDateFrom(e.target.value) }} />
                <input type="date" className="h-9 rounded-md border px-3 text-sm" value={refundDateTo} onChange={(e) => { setRefundsPage(1); setRefundDateTo(e.target.value) }} />
                <Button variant="ghost" className="h-9" onClick={() => { setRefundsPage(1); setRefundStatusFilter("all"); setRefundDateFrom(""); setRefundDateTo(""); setRefundSearch(""); setRefundSearchInput("") }}>
                  {t("transaction_history_page.refund_filters.clear")}
                </Button>
              </CardContent>
            </Card>
            </motion.div>

            {refundsLoading ? (
              renderPaymentSkeleton()
            ) : refundsError ? (
              <div className="p-8 text-center"><p className="text-destructive mb-4">{refundsError}</p></div>
            ) : refunds.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">{t("transaction_history_page.empty_refunds")}</div>
            ) : (
              <div className="space-y-2">
                {refunds.map((refund, index) => (
                  <motion.div
                    key={`${refund.payment_id}-${refund.refund_id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={listItemTransition(index)}
                  >
                  <Card className="app-interactive">
                    <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{refund.course_title || t("transaction_history_page.course_fallback", { id: refund.course_id })}</p>
                        <p className="text-xs text-muted-foreground">{t("transaction_history_page.refund_payment_reference", { paymentId: refund.payment_id, date: new Date(refund.request_date).toLocaleString("vi-VN") })}</p>
                        {refund.reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t("transaction_history_page.reason_prefix")} {refund.reason}</p>}
                        {refund.status === "processing" && <p className="text-xs text-blue-600 mt-1">{t("transaction_history_page.refund_processing_notice")}</p>}
                        {refund.last_gateway_error && refund.status === "processing" && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{refund.last_gateway_error}</p>}
                      </div>
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                        {refundStatusBadge(refund.status)}
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setDetailRefund(refund)} title="Xem chi tiết hoàn tiền">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        {refund.status === "pending" && (
                          <Button size="sm" variant="outline" disabled={cancellingRefundId === refund.refund_id} onClick={() => void handleCancelRefund(refund)}>
                            {cancellingRefundId === refund.refund_id ? t("transaction_history_page.cancelling") : t("transaction_history_page.cancel_refund_request")}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                ))}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">{t("transaction_history_page.refund_pagination", { current: refundsPage, totalPages: refundsTotalPages, totalCount: refundsCount })}</p>
                  <UserPagination currentPage={refundsPage} totalPages={refundsTotalPages} onPageChange={setRefundsPage} />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>

      {/* ── Payment Detail Modal (IPN) ── */}
      <Dialog open={!!detailPayment} onOpenChange={(open) => { if (!open) setDetailPayment(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Giao dịch #{detailPayment?.id}
            </DialogTitle>
            <DialogDescription>Chi tiết thanh toán và kết quả xác nhận từ cổng</DialogDescription>
          </DialogHeader>
          {detailPayment && (() => {
            const ipn = interpretIPN(detailPayment.payment_gateway, detailPayment.gateway_response)
            return (
              <ScrollArea className="max-h-[65vh]">
                <div className="space-y-4 pr-2">
                  {/* IPN Result */}
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kết quả IPN từ cổng thanh toán</p>
                    {ipn ? (
                      <div className="flex items-center gap-2">
                        {ipn.isSuccess
                          ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                        <span className={`text-sm font-medium ${ipn.isSuccess ? 'text-green-700' : 'text-red-600'}`}>{ipn.label}</span>
                        <span className="text-xs text-muted-foreground ml-1">Mã: <code className="bg-muted px-1 rounded">{detailPayment.gateway_response}</code></span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Chưa nhận phản hồi IPN</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span>Cổng:</span><span className="font-medium text-foreground">{detailPayment.payment_gateway ? detailPayment.payment_gateway.toUpperCase() : '—'}</span>
                      <span>Phương thức:</span><span className="font-medium text-foreground">{detailPayment.payment_method.toUpperCase()}</span>
                      <span>Số lần IPN:</span><span className="font-medium text-foreground">{detailPayment.ipn_attempts ?? 0}</span>
                      <span>Mã GD tại cổng:</span><span className="font-medium text-foreground truncate">{detailPayment.transaction_id || '—'}</span>
                    </div>
                  </div>

                  {/* Amount Breakdown */}
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết số tiền</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Gốc</span><span>{formatCurrency(detailPayment.amount)}</span></div>
                      {parseFloat(detailPayment.discount_amount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Giảm giá</span><span className="text-green-600">-{formatCurrency(detailPayment.discount_amount)}</span></div>}
                      <div className="flex justify-between font-semibold border-t pt-1"><span>Tổng thanh toán</span><span>{formatCurrency(detailPayment.total_amount)}</span></div>
                      {parseFloat(detailPayment.refund_amount) > 0 && <div className="flex justify-between text-purple-600"><span>Đã hoàn tiền</span><span>{formatCurrency(detailPayment.refund_amount)}</span></div>}
                    </div>
                  </div>

                  {/* Items with refund details */}
                  {detailPayment.items.length > 0 && (
                    <div className="rounded-md border p-3 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết từng khóa học</p>
                      {detailPayment.items.map((item) => (
                        <div key={item.id} className="space-y-1 border-b pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate flex-1">{item.course_title}</p>
                            {refundStatusBadge(item.refund_status, !!item.refund_request_time)}
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {parseFloat(item.discount) > 0 && <span className="line-through">{formatCurrency(item.price)}</span>}
                            <span className="font-semibold text-foreground">{formatCurrency(item.final_price)}</span>
                          </div>
                          {(item.refund_transaction_id || item.refund_response_code) && (
                            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground bg-muted/40 rounded p-2">
                              {item.refund_transaction_id && <><span>Mã GD hoàn:</span><span className="font-medium text-foreground truncate">{item.refund_transaction_id}</span></>}
                              {item.refund_response_code && <><span>Phản hồi cổng:</span><span className="font-medium text-foreground"><code className="bg-muted px-1 rounded">{item.refund_response_code}</code></span></>}
                            </div>
                          )}
                          {item.refund_timeline && item.refund_timeline.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.refund_timeline.map((ev, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                                  <span>{new Date(ev.timestamp).toLocaleString('vi-VN')}</span>
                                  <span className="font-medium text-foreground">{refundEventLabel(ev.event)}</span>
                                  {ev.note && <span className="italic">— {ev.note}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="text-xs text-muted-foreground space-y-0.5 px-1">
                    <p>Ngày tạo: {detailPayment.created_at ? new Date(detailPayment.created_at).toLocaleString('vi-VN') : '—'}</p>
                    <p>Ngày thanh toán: {detailPayment.payment_date ? new Date(detailPayment.payment_date).toLocaleString('vi-VN') : '—'}</p>
                  </div>
                </div>
              </ScrollArea>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Refund Detail Modal ── */}
      <Dialog open={!!detailRefund} onOpenChange={(open) => { if (!open) setDetailRefund(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết hoàn tiền</DialogTitle>
            <DialogDescription>
              {detailRefund?.course_title || `Khóa học #${detailRefund?.course_id}`} — Thanh toán #{detailRefund?.payment_id}
            </DialogDescription>
          </DialogHeader>
          {detailRefund && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-2">
                {/* Status & amounts */}
                <div className="rounded-md border p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Trạng thái</span><span>{refundStatusBadge(detailRefund.status)}</span>
                  <span className="text-muted-foreground">Số tiền gốc</span><span className="font-medium">{formatCurrency(detailRefund.amount)}</span>
                  {detailRefund.refund_amount && <><span className="text-muted-foreground">Số tiền hoàn</span><span className="font-medium text-purple-600">{formatCurrency(detailRefund.refund_amount)}</span></>}
                  <span className="text-muted-foreground">Ngày yêu cầu</span><span>{new Date(detailRefund.request_date).toLocaleString('vi-VN')}</span>
                  {detailRefund.processed_date && <><span className="text-muted-foreground">Ngày xử lý</span><span>{new Date(detailRefund.processed_date).toLocaleString('vi-VN')}</span></>}
                </div>

                {/* Gateway details */}
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết cổng thanh toán</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Mã GD hoàn</span><span className="font-medium truncate">{detailRefund.transaction_id || '—'}</span>
                    <span className="text-muted-foreground">Số lần thử</span><span className="font-medium">{detailRefund.gateway_attempt_count}</span>
                    {detailRefund.last_gateway_attempt_at && <><span className="text-muted-foreground">Lần thử cuối</span><span>{new Date(detailRefund.last_gateway_attempt_at).toLocaleString('vi-VN')}</span></>}
                    {detailRefund.next_retry_at && <><span className="text-muted-foreground">Thử lại lúc</span><span>{new Date(detailRefund.next_retry_at).toLocaleString('vi-VN')}</span></>}
                  </div>
                  {detailRefund.last_gateway_error && (
                    <p className="text-xs text-red-600 bg-red-50 rounded p-2 mt-1">{detailRefund.last_gateway_error}</p>
                  )}
                </div>

                {/* Timeline */}
                {detailRefund.timeline && detailRefund.timeline.length > 0 && (
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lịch sử xử lý</p>
                    <ol className="space-y-2">
                      {detailRefund.timeline.map((ev, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <div>
                            <span className="font-medium text-foreground">{refundEventLabel(ev.event)}</span>
                            <span className="text-muted-foreground ml-2">{new Date(ev.timestamp).toLocaleString('vi-VN')}</span>
                            {ev.note && <p className="text-muted-foreground italic mt-0.5">{ev.note}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {detailRefund.reason && (
                  <div className="rounded-md border p-3 text-xs">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Lý do hoàn tiền</p>
                    <p className="text-foreground">{detailRefund.reason}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Refund Request Dialog ── */}
      <Dialog
        open={refundDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setRefundDialogOpen(true)
            return
          }
          closeRefundDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("transaction_history_page.refund_dialog.title")}</DialogTitle>
            <DialogDescription>{t("transaction_history_page.refund_dialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[260px] overflow-y-auto border rounded-md p-3">
            {refundDialogItems.map((item) => {
              const enabled = !!item.refund_eligible
              const checked = selectedRefundItemIds.includes(item.id)
              return (
                <label key={item.id} className={`flex items-start gap-3 rounded-md p-2 ${enabled ? "hover:bg-muted/60 cursor-pointer" : "opacity-70 cursor-not-allowed"}`}>
                  <input type="checkbox" checked={checked} disabled={!enabled} onChange={() => toggleRefundItem(item.id, enabled)} className="mt-1" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.course_title}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.final_price)}</p>
                    {!enabled && <p className="text-xs text-red-600">{item.refund_disabled_reason || t("transaction_history_page.refund_ineligible_default")}</p>}
                  </div>
                </label>
              )
            })}
          </div>
          <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder={t("transaction_history_page.refund_dialog.reason_placeholder")} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={closeRefundDialog} disabled={submittingRefund}>{t("common.cancel")}</Button>
            <Button onClick={() => void submitRefundRequest()} disabled={submittingRefund}>{submittingRefund ? t("transaction_history_page.refund_dialog.submitting") : t("transaction_history_page.refund_dialog.submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
