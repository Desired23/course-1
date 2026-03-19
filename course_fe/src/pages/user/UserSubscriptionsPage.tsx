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

type StatusFilter = 'all' | 'active' | 'cancelled' | 'expired'
type SortBy = 'newest' | 'oldest' | 'end_date_desc' | 'end_date_asc'

export function UserSubscriptionsPage() {
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
      toast.success("Auto-renew has been cancelled. Access remains until the current period ends.")
      setShowCancelDialog(false)
      fetchSubscriptions()
    } catch {
      toast.error("Failed to cancel subscription. Please try again.")
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
        <p className="text-muted-foreground">Loading subscription data...</p>
      </div>
    )
  }

  const planDetail = activeSubscription?.plan_detail
  const planPrice = planDetail ? Number(planDetail.effective_price) : 0
  const planFeatures = planDetail?.features || []

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground mt-2">View your plan details, payment cycle, and subscription history.</p>
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
                  <p className="text-sm text-muted-foreground">/ cycle</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">Remaining period</span>
                  <span className={getDaysRemaining() < 7 ? "text-red-500" : "text-green-600"}>{getDaysRemaining()} days</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2.5" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Start: {formatDate(activeSubscription.start_date)}</span>
                  <span>End: {activeSubscription.end_date ? formatDate(activeSubscription.end_date) : 'Lifetime'}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Details</h3>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Start date</span>
                    </div>
                    <span className="text-sm font-medium">{formatDate(activeSubscription.start_date)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>End date</span>
                    </div>
                    <span className="text-sm font-medium">{activeSubscription.end_date ? formatDate(activeSubscription.end_date) : 'Lifetime'}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Auto renew</span>
                    </div>
                    <Badge variant={activeSubscription.auto_renew ? "outline" : "secondary"}>
                      {activeSubscription.auto_renew ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {activeSubscription.cancelled_at && (
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <div className="flex items-center gap-2 text-sm">
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span>Cancelled at</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(activeSubscription.cancelled_at)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3">Plan benefits</h3>
                  <ul className="space-y-2.5">
                    {(planFeatures.length > 0 ? planFeatures : [
                      'Unlimited course access',
                      'Certificate support',
                      'Downloadable resources',
                      'Priority support',
                    ]).map((benefit: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/pricing')}>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    View other plans
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  className="h-9 rounded-md border px-3 text-sm"
                  placeholder="Search by plan name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="h-9 rounded-md border px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
                <select
                  className="h-9 rounded-md border px-3 text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                >
                  <option value="newest">Newest created</option>
                  <option value="oldest">Oldest created</option>
                  <option value="end_date_desc">Latest end date</option>
                  <option value="end_date_asc">Earliest end date</option>
                </select>
                <select
                  className="h-9 rounded-md border px-3 text-sm"
                  value={String(pageSize)}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value="5">5 / page</option>
                  <option value="10">10 / page</option>
                  <option value="20">20 / page</option>
                </select>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setSortBy('newest')
                  }}
                >
                  Clear filters
                </Button>
              </div>

              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No subscriptions match your filters.</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="border rounded-md p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sub.plan_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Start: {formatDate(sub.start_date)}
                            {' '}| End: {sub.end_date ? formatDate(sub.end_date) : 'Lifetime'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getSubscriptionStatusLabel(sub.status)}</Badge>
                          {sub.auto_renew && <Badge>Auto renew</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage}/{totalPages} - Total {totalCount} subscriptions
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
                Cancel auto-renew
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/user/payment-methods')}>Manage payment methods</Button>
          </div>

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Confirm cancel auto-renew
                </DialogTitle>
                <DialogDescription>
                  You will keep access until current cycle ends.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Close</Button>
                <Button variant="destructive" onClick={handleCancelSubscription} disabled={isCancelling}>
                  {isCancelling ? 'Processing...' : 'Cancel auto-renew'}
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
            <h2 className="text-xl font-bold mb-2">No active subscription yet</h2>
            <p className="text-muted-foreground max-w-md mb-8">Upgrade to unlock full catalog access and premium benefits.</p>
            <Button size="lg" onClick={() => navigate('/pricing')}>
              <Zap className="w-4 h-4 mr-2" />
              View plans
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
