import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Textarea } from "../../components/ui/textarea"
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
import { Calendar, CreditCard, ExternalLink, Loader2, PackageOpen, Receipt, ShoppingBag } from "lucide-react"
import { toast } from "sonner"

interface RefundDialogState {
  paymentId: number
  paymentType: string
  items: MyPaymentItem[]
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

  const refundStatusBadge = (status: string) => {
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
      setRefundDialogOpen(false)
      setRefundDialogData(null)
      setSelectedRefundItemIds([])
      setRefundReason("")
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
        const response = await createMomoPayment({ payment_id: payment.id })
        if (!response.payUrl) throw new Error(t("transaction_history_page.errors.create_momo_url"))
        window.location.href = response.payUrl
        return
      }
      const response = await createVnpayPayment({
        order_id: String(payment.id),
        amount: Math.round(parseFloat(payment.total_amount)),
        order_desc: t("transaction_history_page.retry_order_description", { id: payment.id }),
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

  if (isInitialLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            {t("transaction_history_page.title")}
          </h1>
          <p className="text-muted-foreground">{t("transaction_history_page.subtitle")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "purchases" | "refunds")}>
          <TabsList className="mb-4">
            <TabsTrigger value="purchases">{t("transaction_history_page.tabs.purchases", { count: paymentsCount })}</TabsTrigger>
            <TabsTrigger value="refunds">{t("transaction_history_page.tabs.refunds", { count: refundsCount })}</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            <Card>
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

            {paymentsLoading ? (
              <div className="flex items-center justify-center min-h-[220px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
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
                {payments.map((payment) => {
                  const eligibleItems = eligibleItemsByPayment(payment)
                  const retryCountdown = formatRetryCountdown(payment.retryable_until, nowMs)
                  const canRetryPayment = !!payment.can_retry_payment && !!retryCountdown
                  return (
                    <Card key={payment.id} className="overflow-hidden">
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
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-base">{formatCurrency(payment.total_amount)}</div>
                            {parseFloat(payment.discount_amount) > 0 && <div className="text-xs text-green-600">-{formatCurrency(payment.discount_amount)}</div>}
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
                                    {refundStatusBadge(item.refund_status)}
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
                            <div className="border-t pt-3 mt-3 flex items-center justify-between gap-3 text-sm">
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
                              <div className="flex items-center gap-2">
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
                    </Card>
                  )
                })}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">{t("transaction_history_page.purchase_pagination", { current: paymentsPage, totalPages: paymentsTotalPages, totalCount: paymentsCount })}</p>
                  <UserPagination currentPage={paymentsPage} totalPages={paymentsTotalPages} onPageChange={setPaymentsPage} />
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="refunds" className="space-y-4">
            <Card>
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

            {refundsLoading ? (
              <div className="flex items-center justify-center min-h-[220px]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : refundsError ? (
              <div className="p-8 text-center"><p className="text-destructive mb-4">{refundsError}</p></div>
            ) : refunds.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">{t("transaction_history_page.empty_refunds")}</div>
            ) : (
              <div className="space-y-2">
                {refunds.map((refund) => (
                  <Card key={`${refund.payment_id}-${refund.refund_id}`}>
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{refund.course_title || t("transaction_history_page.course_fallback", { id: refund.course_id })}</p>
                        <p className="text-xs text-muted-foreground">{t("transaction_history_page.refund_payment_reference", { paymentId: refund.payment_id, date: new Date(refund.request_date).toLocaleString("vi-VN") })}</p>
                        {refund.reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t("transaction_history_page.reason_prefix")} {refund.reason}</p>}
                        {refund.status === "processing" && <p className="text-xs text-blue-600 mt-1">{t("transaction_history_page.refund_processing_notice")}</p>}
                        {refund.last_gateway_error && refund.status === "processing" && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{refund.last_gateway_error}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {refundStatusBadge(refund.status)}
                        {refund.status === "pending" && (
                          <Button size="sm" variant="outline" disabled={cancellingRefundId === refund.refund_id} onClick={() => void handleCancelRefund(refund)}>
                            {cancellingRefundId === refund.refund_id ? t("transaction_history_page.cancelling") : t("transaction_history_page.cancel_refund_request")}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">{t("transaction_history_page.refund_pagination", { current: refundsPage, totalPages: refundsTotalPages, totalCount: refundsCount })}</p>
                  <UserPagination currentPage={refundsPage} totalPages={refundsTotalPages} onPageChange={setRefundsPage} />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
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
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)} disabled={submittingRefund}>{t("common.cancel")}</Button>
            <Button onClick={() => void submitRefundRequest()} disabled={submittingRefund}>{submittingRefund ? t("transaction_history_page.refund_dialog.submitting") : t("transaction_history_page.refund_dialog.submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
