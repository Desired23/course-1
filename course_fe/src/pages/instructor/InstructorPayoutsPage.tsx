import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "../../utils/formatters"
import { getMyInstructorProfile } from "../../services/instructor.api"
import {
  getInstructorPayoutsPage,
  requestPayout,
  formatPayoutAmount,
  type InstructorPayout,
} from "../../services/instructor-payouts.api"
import {
  getInstructorEarnings,
  getInstructorEarningsSummary,
  parseEarningAmount,
  type InstructorEarning,
  type EarningsSummary,
} from "../../services/instructor-earnings.api"
import { getInstructorPayoutMethods, type InstructorPayoutMethod } from "../../services/payment-method.api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert"
import { UserPagination } from "../../components/UserPagination"
import { DollarSign, CheckCircle, Clock, TrendingUp, CreditCard, AlertCircle, Info, Crown, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

const EARNINGS_PER_PAGE = 10
const PAYOUTS_PER_PAGE = 10

const isSubscriptionEarning = (e: InstructorEarning) => e.user_subscription != null

export function InstructorPayoutsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [payoutMethods, setPayoutMethods] = useState<InstructorPayoutMethod[]>([])

  const [earnings, setEarnings] = useState<InstructorEarning[]>([])
  const [payouts, setPayouts] = useState<InstructorPayout[]>([])
  const [earningsStatusFilter, setEarningsStatusFilter] = useState('all')
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all')
  const [earningsPage, setEarningsPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [earningsTotalPages, setEarningsTotalPages] = useState(1)
  const [payoutsTotalPages, setPayoutsTotalPages] = useState(1)
  const [earningsTotalCount, setEarningsTotalCount] = useState(0)
  const [payoutsTotalCount, setPayoutsTotalCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !user.roles?.includes('instructor')) {
      window.location.href = '/'
    }
  }, [user])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function fetchBase() {
      try {
        setLoading(true)
        const instructor = await getMyInstructorProfile(user.id)
        if (cancelled) return
        setInstructorId(instructor.id)
        const [summaryData, methodsData] = await Promise.all([
          getInstructorEarningsSummary(instructor.id),
          getInstructorPayoutMethods(),
        ])
        if (cancelled) return
        setSummary(summaryData)
        setPayoutMethods(methodsData)
      } catch (err) {
        console.error('error loading instructor payouts page', err)
        toast.error(t('instructor_payouts.load_failed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBase()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    setEarningsPage(1)
  }, [earningsStatusFilter])

  useEffect(() => {
    setHistoryPage(1)
  }, [payoutStatusFilter])

  useEffect(() => {
    if (!instructorId) return
    let cancelled = false
    async function fetchEarningsPage() {
      try {
        setEarningsLoading(true)
        const res = await getInstructorEarnings({
          instructor_id: instructorId,
          page: earningsPage,
          page_size: EARNINGS_PER_PAGE,
          status: earningsStatusFilter !== 'all' ? earningsStatusFilter : undefined,
        })
        if (cancelled) return
        setEarnings(res.results || [])
        setEarningsTotalPages(res.total_pages || 1)
        setEarningsTotalCount(res.count || 0)
      } catch (err) {
        if (!cancelled) console.error('error loading earnings page', err)
      } finally {
        if (!cancelled) setEarningsLoading(false)
      }
    }
    fetchEarningsPage()
    return () => { cancelled = true }
  }, [instructorId, earningsPage, earningsStatusFilter])

  useEffect(() => {
    if (!instructorId) return
    let cancelled = false
    async function fetchPayoutsPage() {
      try {
        setPayoutsLoading(true)
        const res = await getInstructorPayoutsPage({
          instructor_id: instructorId,
          page: historyPage,
          page_size: PAYOUTS_PER_PAGE,
          status: payoutStatusFilter !== 'all' ? (payoutStatusFilter as any) : undefined,
        })
        if (cancelled) return
        setPayouts(res.results || [])
        setPayoutsTotalPages(res.total_pages || 1)
        setPayoutsTotalCount(res.count || 0)
      } catch (err) {
        if (!cancelled) console.error('error loading payouts page', err)
      } finally {
        if (!cancelled) setPayoutsLoading(false)
      }
    }
    fetchPayoutsPage()
    return () => { cancelled = true }
  }, [instructorId, historyPage, payoutStatusFilter])

  const availableBalance = useMemo(() => {
    if (!summary) return 0
    const retailAvailable = parseEarningAmount(summary.retail.by_status?.available?.net_amount || '0')
    const subAvailable = parseEarningAmount(summary.subscription.by_status?.available?.net_amount || '0')
    return retailAvailable + subAvailable
  }, [summary])

  const lockedBalance = useMemo(() => {
    if (!summary) return 0
    const retailPending = parseEarningAmount(summary.retail.by_status?.pending?.net_amount || '0')
    const subPending = parseEarningAmount(summary.subscription.by_status?.pending?.net_amount || '0')
    return retailPending + subPending
  }, [summary])

  const totalPaid = useMemo(() => {
    if (!summary) return 0
    const retailPaid = parseEarningAmount(summary.retail.by_status?.paid?.net_amount || '0')
    const subPaid = parseEarningAmount(summary.subscription.by_status?.paid?.net_amount || '0')
    return retailPaid + subPaid
  }, [summary])

  const salesEarnings = parseEarningAmount(summary?.retail.by_status?.available?.net_amount || '0')
  const subscriptionEarnings = parseEarningAmount(summary?.subscription.by_status?.available?.net_amount || '0')
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseEarningAmount(p.amount), 0)
  const completedPayouts = payouts.filter(p => p.status === 'processed').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'default'
      case 'pending': return 'outline'
      case 'cancelled': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t('instructor_payouts.status_pending'),
      processed: t('instructor_payouts.status_processed'),
      cancelled: t('instructor_payouts.status_cancelled'),
      failed: t('instructor_payouts.status_failed'),
    }
    return statusMap[status] || status
  }

  const handleRequestPayout = async () => {
    if (!selectedMethod) return toast.error(t('instructor_payouts.select_method_error'))
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) return toast.error(t('instructor_payouts.invalid_amount_error'))
    const amount = parseFloat(payoutAmount)
    if (amount < 50) return toast.error(t('instructor_payouts.minimum_amount_error'))
    if (amount > availableBalance) return toast.error(t('instructor_payouts.insufficient_balance_error', { amount: formatCurrency(availableBalance, 'USD') }))

    setIsSubmitting(true)
    try {
      await requestPayout({
        amount,
        payout_method_id: Number(selectedMethod),
        period: new Date().toISOString().slice(0, 7),
      })
      setIsRequestDialogOpen(false)
      setSelectedMethod('')
      setPayoutAmount('')
      toast.success(t('instructor_payouts.request_success'))
      if (instructorId) {
        const [sumRes, payoutsRes] = await Promise.all([
          getInstructorEarningsSummary(instructorId),
          getInstructorPayoutsPage({ instructor_id: instructorId, page: historyPage, page_size: PAYOUTS_PER_PAGE }),
        ])
        setSummary(sumRes)
        setPayouts(payoutsRes.results || [])
        setPayoutsTotalPages(payoutsRes.total_pages || 1)
        setPayoutsTotalCount(payoutsRes.count || 0)
      }
    } catch {
      toast.error(t('instructor_payouts.request_failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const earningsStart = earningsTotalCount === 0 ? 0 : (earningsPage - 1) * EARNINGS_PER_PAGE + 1
  const earningsEnd = Math.min(earningsPage * EARNINGS_PER_PAGE, earningsTotalCount)
  const payoutsStart = payoutsTotalCount === 0 ? 0 : (historyPage - 1) * PAYOUTS_PER_PAGE + 1
  const payoutsEnd = Math.min(historyPage * PAYOUTS_PER_PAGE, payoutsTotalCount)

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('instructor_payouts.title')}</h1>
          <p className="text-muted-foreground">{t('instructor_payouts.subtitle')}</p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={availableBalance < 50}>
              <DollarSign className="h-4 w-4" />
              {t('instructor_payouts.request_button')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('instructor_payouts.request_dialog_title')}</DialogTitle>
              <DialogDescription>{t('instructor_payouts.request_dialog_desc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('instructor_payouts.available_balance')}</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance, 'USD')}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-muted-foreground/20">
                  <span className="text-muted-foreground">{t('instructor_payouts.from_sales')}</span>
                  <span className="font-medium">{formatCurrency(salesEarnings, 'USD')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{t('instructor_payouts.from_subscriptions')}</span>
                  <span className="font-medium">{formatCurrency(subscriptionEarnings, 'USD')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{t('instructor_payouts.withdraw_amount')}</Label>
                <Input id="amount" type="number" placeholder="0.00" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} max={availableBalance} min={50} />
                <p className="text-xs text-muted-foreground">{t('instructor_payouts.amount_hint', { amount: formatCurrency(availableBalance, 'USD') })}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">{t('instructor_payouts.payment_method')}</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger><SelectValue placeholder={t('instructor_payouts.select_method')} /></SelectTrigger>
                  <SelectContent>
                    {payoutMethods.map((method) => (
                      <SelectItem key={String(method.id)} value={String(method.id)}>
                        {method.method_type === 'bank_transfer'
                          ? `${method.bank_name} - ****${method.masked_account?.slice(-4) || ''}`
                          : `${method.method_type} - ${method.masked_account || method.nickname || ''}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleRequestPayout} disabled={isSubmitting}>{isSubmitting ? t('instructor_payouts.submitting') : t('instructor_payouts.submit_request')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardDescription>{t('instructor_payouts.available_balance')}</CardDescription><DollarSign className="h-4 w-4 text-muted-foreground" /></div></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance, 'USD')}</div><div className="flex gap-2 mt-1"><Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-700 dark:bg-green-900/30">{t('instructor_payouts.sales_badge')}: {formatCurrency(salesEarnings, 'USD')}</Badge><Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700 dark:bg-blue-900/30">{t('instructor_payouts.subs_badge')}: {formatCurrency(subscriptionEarnings, 'USD')}</Badge></div></CardContent></Card>
        <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardDescription>{t('instructor_payouts.pending_review')}</CardDescription><Clock className="h-4 w-4 text-muted-foreground" /></div></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingPayouts, 'USD')}</div><p className="text-xs text-muted-foreground mt-1">{t('instructor_payouts.pending_processing')}</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardDescription>{t('instructor_payouts.paid_out')}</CardDescription><TrendingUp className="h-4 w-4 text-muted-foreground" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalPaid, 'USD')}</div><p className="text-xs text-muted-foreground mt-1">{t('instructor_payouts.total_received')}</p></CardContent></Card>
        <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardDescription>{t('instructor_payouts.successful_requests')}</CardDescription><CheckCircle className="h-4 w-4 text-muted-foreground" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{completedPayouts}</div><p className="text-xs text-muted-foreground mt-1">{t('instructor_payouts.completed_transactions')}</p></CardContent></Card>
      </div>

      {availableBalance < 50 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{t('instructor_payouts.low_balance_title')}</AlertTitle>
          <AlertDescription>{t('instructor_payouts.low_balance_desc')}</AlertDescription>
        </Alert>
      )}

      {lockedBalance > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('instructor_payouts.locked_earnings_title')}</AlertTitle>
          <AlertDescription>{t('instructor_payouts.locked_earnings_desc', { amount: formatCurrency(lockedBalance, 'USD') })}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">{t('instructor_payouts.tab_earnings')}</TabsTrigger>
          <TabsTrigger value="history">{t('instructor_payouts.tab_history')}</TabsTrigger>
          <TabsTrigger value="methods">{t('instructor_payouts.tab_methods')}</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('instructor_payouts.earnings_title')}</CardTitle>
              <CardDescription>{t('instructor_payouts.earnings_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                <Select value={earningsStatusFilter} onValueChange={setEarningsStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('instructor_payouts.all_status')}</SelectItem>
                    <SelectItem value="available">{t('instructor_payouts.available')}</SelectItem>
                    <SelectItem value="pending">{t('instructor_payouts.pending')}</SelectItem>
                    <SelectItem value="paid">{t('instructor_payouts.paid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {earningsLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : earnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('instructor_payouts.no_earnings')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('instructor_payouts.source')}</TableHead>
                      <TableHead>{t('instructor_payouts.content')}</TableHead>
                      <TableHead>{t('instructor_payouts.gross_revenue')}</TableHead>
                      <TableHead>{t('instructor_payouts.net_revenue')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('instructor_payouts.date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((earning) => (
                      <TableRow key={earning.id}>
                        <TableCell>
                          {isSubscriptionEarning(earning) ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              <Crown className="w-3 h-3 mr-1" /> {t('instructor_payouts.subscription')}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{t('instructor_payouts.course_sale')}</Badge>
                          )}
                        </TableCell>
                        <TableCell><div className="max-w-xs truncate text-sm font-medium">{t('instructor_payouts.course_label', { id: earning.course })}</div></TableCell>
                        <TableCell>{formatPayoutAmount(earning.amount)}</TableCell>
                        <TableCell className="font-semibold text-green-600">{formatPayoutAmount(earning.net_amount)}</TableCell>
                        <TableCell>
                          <Badge variant={earning.status === 'available' ? 'default' : earning.status === 'pending' ? 'outline' : 'secondary'}>
                            {earning.status === 'available' ? t('instructor_payouts.available') : earning.status === 'pending' ? t('instructor_payouts.pending_processing') : t('instructor_payouts.paid')}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(earning.earning_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {earningsTotalCount > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-2">{t('instructor_payouts.earnings_pagination', { from: earningsStart, to: earningsEnd, total: earningsTotalCount })}</div>
                  <UserPagination currentPage={earningsPage} totalPages={earningsTotalPages} onPageChange={setEarningsPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('instructor_payouts.history_title')}</CardTitle>
              <CardDescription>{t('instructor_payouts.history_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('instructor_payouts.all_status')}</SelectItem>
                    <SelectItem value="pending">{t('instructor_payouts.pending')}</SelectItem>
                    <SelectItem value="processed">{t('instructor_payouts.processed')}</SelectItem>
                    <SelectItem value="cancelled">{t('instructor_payouts.cancelled')}</SelectItem>
                    <SelectItem value="failed">{t('instructor_payouts.failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payoutsLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('instructor_payouts.no_payouts')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('instructor_payouts.transaction_id')}</TableHead>
                      <TableHead>{t('instructor_payouts.amount')}</TableHead>
                      <TableHead>{t('instructor_payouts.method')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('instructor_payouts.request_date')}</TableHead>
                      <TableHead>{t('instructor_payouts.processed_date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-mono">#{payout.id}</TableCell>
                        <TableCell className="font-semibold">{formatPayoutAmount(payout.amount)}</TableCell>
                        <TableCell>{payout.payment_method}</TableCell>
                        <TableCell><Badge variant={getStatusColor(payout.status)}>{getStatusText(payout.status)}</Badge></TableCell>
                        <TableCell>{formatDate(payout.request_date)}</TableCell>
                        <TableCell>{payout.processed_date ? formatDate(payout.processed_date) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {payoutsTotalCount > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-2">{t('instructor_payouts.payouts_pagination', { from: payoutsStart, to: payoutsEnd, total: payoutsTotalCount })}</div>
                  <UserPagination currentPage={historyPage} totalPages={payoutsTotalPages} onPageChange={setHistoryPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('instructor_payouts.methods_title')}</CardTitle>
              <CardDescription>{t('instructor_payouts.methods_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payoutMethods.map((method) => (
                  <Card key={String(method.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {method.method_type === 'bank_transfer'
                              ? `${method.bank_name} - ****${method.masked_account?.slice(-4) || ''}`
                              : `${method.method_type} - ${method.masked_account || method.nickname || ''}`}
                            {method.is_default && <Badge variant="default" className="text-xs">{t('instructor_payouts.default_badge')}</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {method.method_type === 'bank_transfer' ? t('instructor_payouts.bank_transfer') : method.method_type}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {payoutMethods.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">{t('instructor_payouts.no_methods')}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
