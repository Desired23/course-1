import { useState, useEffect, useMemo } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Separator } from "../../components/ui/separator"
import { toast } from "sonner"
import { Crown, Calendar, CheckCircle, X, AlertCircle, ArrowUpRight, Zap, Shield } from "lucide-react"
import { useRouter } from "../../components/Router"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { UserPagination } from "../../components/UserPagination"
import {
  getMySubscriptions,
  cancelSubscription,
  type UserSubscription,
  getDurationLabel,
  getSubscriptionStatusLabel,
} from "../../services/subscription.api"
import { useTranslation } from "react-i18next"

type StatusFilter = 'all' | 'active' | 'cancelled' | 'expired'
type SortBy = 'newest' | 'oldest' | 'end_date_desc' | 'end_date_asc'

export function UserSubscriptionsPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchSubscriptions = async () => {
    try {
      const subs = await getMySubscriptions({
        page: currentPage,
        page_size: pageSize,
        status: statusFilter,
        search: searchTerm || undefined,
        sort_by: sortBy,
      })
      setSubscriptions(subs.results || [])
      setTotalPages(subs.total_pages || 1)
      setTotalCount(subs.count || 0)
    } catch {
      setSubscriptions([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [currentPage, pageSize, statusFilter, searchTerm, sortBy])

  const activeSubscription = useMemo(
    () => subscriptions.find((s) => s.is_active) || subscriptions[0] || null,
    [subscriptions]
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getDaysRemaining = () => {
    if (!activeSubscription || !activeSubscription.end_date) return 0
    const now = new Date()
    const end = new Date(activeSubscription.end_date)
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const getProgressPercentage = () => {
    if (!activeSubscription || !activeSubscription.end_date) return 0
    const start = new Date(activeSubscription.start_date).getTime()
    const end = new Date(activeSubscription.end_date).getTime()
    const now = new Date().getTime()
    const total = end - start
    const elapsed = now - start
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  const handleCancelSubscription = async () => {
    if (!activeSubscription) return
    setIsCancelling(true)
    try {
      await cancelSubscription(activeSubscription.id)
      toast.success(t('subscriptions_page.cancel_success'))
      setShowCancelDialog(false)
      fetchSubscriptions()
    } catch {
      toast.error(t('subscriptions_page.cancel_failed'))
    } finally {
      setIsCancelling(false)
    }
  }

  const getPlanIcon = () => {
    if (!activeSubscription?.plan_detail) return <Crown className="h-6 w-6 text-yellow-500" />
    const iconName = activeSubscription.plan_detail.icon
    switch (iconName) {
      case 'Zap': return <Zap className="h-6 w-6 text-blue-500" />
      case 'Crown': return <Crown className="h-6 w-6 text-yellow-500" />
      case 'Shield': return <Shield className="h-6 w-6 text-slate-500" />
      default: return <Crown className="h-6 w-6 text-yellow-500" />
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchTerm, sortBy, pageSize])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <p className="text-muted-foreground">{t('subscriptions_page.loading')}</p>
      </div>
    )
  }

  const planDetail = activeSubscription?.plan_detail
  const planPrice = planDetail ? Number(planDetail.effective_price) : 0
  const planFeatures = planDetail?.features || []

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('subscriptions_page.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subscriptions_page.subtitle')}</p>
      </div>

      {activeSubscription ? (
        <div className="space-y-6">
          <Card className="border-2 border-blue-100 dark:border-blue-900 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border">
                    {getPlanIcon()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{activeSubscription.plan_name}</h2>
                      <Badge>{getSubscriptionStatusLabel(activeSubscription.status)}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {planDetail ? getDurationLabel(planDetail.duration_type) : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(planPrice)}</p>
                  <p className="text-sm text-muted-foreground">{t('subscriptions_page.per_cycle')}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">{t('subscriptions_page.remaining_period')}</span>
                  <span className={getDaysRemaining() < 7 ? "text-red-500" : "text-green-600"}>{t('subscriptions_page.days_remaining', { count: getDaysRemaining() })}</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2.5" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{t('subscriptions_page.start_label', { date: formatDate(activeSubscription.start_date) })}</span>
                  <span>{t('subscriptions_page.end_label', { date: activeSubscription.end_date ? formatDate(activeSubscription.end_date) : t('subscriptions_page.lifetime') })}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t('subscriptions_page.details')}</h3>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{t('subscriptions_page.start_date')}</span>
                    </div>
                    <span className="text-sm font-medium">{formatDate(activeSubscription.start_date)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{t('subscriptions_page.end_date')}</span>
                    </div>
                    <span className="text-sm font-medium">{activeSubscription.end_date ? formatDate(activeSubscription.end_date) : t('subscriptions_page.lifetime')}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{t('subscriptions_page.auto_renew')}</span>
                    </div>
                    <Badge variant={activeSubscription.auto_renew ? "outline" : "secondary"}>
                      {activeSubscription.auto_renew ? t('subscriptions_page.enabled') : t('subscriptions_page.disabled')}
                    </Badge>
                  </div>

                  {activeSubscription.cancelled_at && (
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <div className="flex items-center gap-2 text-sm">
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span>{t('subscriptions_page.cancelled_at')}</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(activeSubscription.cancelled_at)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3">{t('subscriptions_page.plan_benefits')}</h3>
                  <ul className="space-y-2.5">
                    {(planFeatures.length > 0 ? planFeatures : [
                      t('subscriptions_page.default_benefit_1'),
                      t('subscriptions_page.default_benefit_2'),
                      t('subscriptions_page.default_benefit_3'),
                      t('subscriptions_page.default_benefit_4'),
                    ]).map((benefit: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/pricing')}>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    {t('subscriptions_page.view_other_plans')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('subscriptions_page.history_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  className="h-9 rounded-md border px-3 text-sm"
                  placeholder={t('subscriptions_page.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="h-9 rounded-md border px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">{t('subscriptions_page.all_status')}</option>
                  <option value="active">{t('subscriptions_page.active')}</option>
                  <option value="cancelled">{t('subscriptions_page.cancelled')}</option>
                  <option value="expired">{t('subscriptions_page.expired')}</option>
                </select>
                <select
                  className="h-9 rounded-md border px-3 text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                >
                  <option value="newest">{t('subscriptions_page.sort_newest')}</option>
                  <option value="oldest">{t('subscriptions_page.sort_oldest')}</option>
                  <option value="end_date_desc">{t('subscriptions_page.sort_latest_end')}</option>
                  <option value="end_date_asc">{t('subscriptions_page.sort_earliest_end')}</option>
                </select>
                <select
                  className="h-9 rounded-md border px-3 text-sm"
                  value={String(pageSize)}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value="5">{t('subscriptions_page.per_page', { count: 5 })}</option>
                  <option value="10">{t('subscriptions_page.per_page', { count: 10 })}</option>
                  <option value="20">{t('subscriptions_page.per_page', { count: 20 })}</option>
                </select>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setSortBy('newest')
                  }}
                >
                  {t('subscriptions_page.clear_filters')}
                </Button>
              </div>

              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t('subscriptions_page.no_results')}</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="border rounded-md p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sub.plan_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('subscriptions_page.start_label', { date: formatDate(sub.start_date) })}
                            {' '}| {t('subscriptions_page.end_label', { date: sub.end_date ? formatDate(sub.end_date) : t('subscriptions_page.lifetime') })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getSubscriptionStatusLabel(sub.status)}</Badge>
                          {sub.auto_renew && <Badge>{t('subscriptions_page.auto_renew')}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {t('subscriptions_page.pagination_summary', { current: currentPage, totalPages, totalCount })}
                    </p>
                    <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            {activeSubscription.status === 'active' && activeSubscription.auto_renew && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowCancelDialog(true)}>
                {t('subscriptions_page.cancel_auto_renew')}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/user/payment-methods')}>{t('subscriptions_page.manage_payment_methods')}</Button>
          </div>

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {t('subscriptions_page.confirm_cancel_title')}
                </DialogTitle>
                <DialogDescription>
                  {t('subscriptions_page.confirm_cancel_description')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCancelDialog(false)}>{t('common.close')}</Button>
                <Button variant="destructive" onClick={handleCancelSubscription} disabled={isCancelling}>
                  {isCancelling ? t('subscriptions_page.processing') : t('subscriptions_page.cancel_auto_renew')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
              <Crown className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('subscriptions_page.no_active_title')}</h2>
            <p className="text-muted-foreground max-w-md mb-8">{t('subscriptions_page.no_active_description')}</p>
            <Button size="lg" onClick={() => navigate('/pricing')}>
              <Zap className="w-4 h-4 mr-2" />
              {t('subscriptions_page.view_plans')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
