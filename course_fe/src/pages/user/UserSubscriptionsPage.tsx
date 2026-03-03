import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Separator } from "../../components/ui/separator"
import { toast } from "sonner@2.0.3"
import { Crown, Calendar, CreditCard, CheckCircle, X, AlertCircle, ArrowUpRight, Zap, Shield, Download, Plus } from "lucide-react"
import { useRouter } from "../../components/Router"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import {
  getMySubscriptions,
  cancelSubscription,
  type UserSubscription,
} from "../../services/subscription.api"

export function UserSubscriptionsPage() {
  const { navigate } = useRouter()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const fetchSubscriptions = async () => {
    try {
      const subs = await getMySubscriptions()
      // Find the most recent active subscription, or latest one
      const active = subs.find((s: UserSubscription) => s.is_active) || subs[0] || null
      setSubscription(active)
    } catch {
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSubscriptions() }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', '') + '₫'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDaysRemaining = () => {
    if (!subscription || !subscription.end_date) return 0
    const now = new Date()
    const end = new Date(subscription.end_date)
    const diff = end.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const getProgressPercentage = () => {
    if (!subscription || !subscription.end_date) return 0
    const start = new Date(subscription.start_date).getTime()
    const end = new Date(subscription.end_date).getTime()
    const now = new Date().getTime()
    const total = end - start
    const elapsed = now - start
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  const handleCancelSubscription = async () => {
    if (!subscription) return
    setIsCancelling(true)
    try {
      await cancelSubscription(subscription.id)
      toast.success("Đã hủy gia hạn gói cước. Bạn vẫn có quyền truy cập đến hết chu kỳ hiện tại.")
      setShowCancelDialog(false)
      fetchSubscriptions()
    } catch {
      toast.error("Hủy gói cước thất bại. Vui lòng thử lại.")
    } finally {
      setIsCancelling(false)
    }
  }

  const handleDownloadInvoice = (id: string) => {
    toast.success("Đang tải xuống hóa đơn...", {
      description: `Invoice-${id}.pdf`
    })
  }

  const getPlanIcon = () => {
    if (!subscription?.plan_detail) return <Crown className="h-6 w-6 text-yellow-500" />
    const iconName = (subscription.plan_detail as any).icon
    switch (iconName) {
      case 'Zap': return <Zap className="h-6 w-6 text-blue-500" />
      case 'Crown': return <Crown className="h-6 w-6 text-yellow-500" />
      case 'Shield': return <Shield className="h-6 w-6 text-slate-500" />
      default: return <Crown className="h-6 w-6 text-yellow-500" />
    }
  }

  const getStatusBadge = () => {
    if (!subscription) return null
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-blue-600">{subscription.auto_renew ? 'Đang hoạt động' : 'Đang hoạt động (không gia hạn)'}</Badge>
      case 'cancelled':
        return <Badge variant="secondary">Đã hủy gia hạn</Badge>
      case 'expired':
        return <Badge variant="secondary">Hết hạn</Badge>
      default:
        return <Badge variant="secondary">{subscription.status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <p className="text-muted-foreground">Đang tải thông tin gói cước...</p>
      </div>
    )
  }

  const planDetail = subscription?.plan_detail
  const planPrice = planDetail ? Number(planDetail.effective_price) : 0
  const planFeatures = (planDetail as any)?.features || []

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Quản lý gói thành viên</h1>
        <p className="text-muted-foreground mt-2">
          Xem thông tin gói cước, lịch sử thanh toán và quản lý gia hạn
        </p>
      </div>

      {subscription ? (
        <div className="space-y-6">
          {/* Active Subscription Card */}
          <Card className="border-2 border-blue-100 dark:border-blue-900 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border">
                    {getPlanIcon()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{subscription.plan_name}</h2>
                      {getStatusBadge()}
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {planDetail ? `${planDetail.duration_type === 'annual' ? 'Thanh toán hàng năm' : planDetail.duration_type === 'monthly' ? 'Thanh toán hàng tháng' : planDetail.duration_type}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">{formatCurrency(planPrice)}</p>
                  <p className="text-sm text-muted-foreground">
                    /{planDetail?.duration_type === 'annual' ? 'năm' : planDetail?.duration_type === 'monthly' ? 'tháng' : 'kỳ'}
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">Thời gian sử dụng còn lại</span>
                  <span className={getDaysRemaining() < 7 ? "text-red-500" : "text-green-600"}>
                    {getDaysRemaining()} ngày
                  </span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2.5" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Bắt đầu: {formatDate(subscription.start_date)}</span>
                  <span>Kết thúc: {subscription.end_date ? formatDate(subscription.end_date) : 'Vĩnh viễn'}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Thông tin chi tiết</h3>
                  
                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Ngày bắt đầu</span>
                    </div>
                    <span className="text-sm font-medium">{formatDate(subscription.start_date)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Ngày kết thúc</span>
                    </div>
                    <span className="text-sm font-medium">
                      {subscription.end_date ? formatDate(subscription.end_date) : 'Vĩnh viễn'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Trạng thái gia hạn</span>
                    </div>
                    <Badge variant={subscription.auto_renew ? "outline" : "secondary"} className={subscription.auto_renew ? "text-green-600 border-green-200 bg-green-50" : ""}>
                      {subscription.auto_renew ? "Tự động" : "Tắt"}
                    </Badge>
                  </div>

                  {subscription.cancelled_at && (
                    <div className="flex items-center justify-between py-2 border-b border-dashed">
                      <div className="flex items-center gap-2 text-sm">
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span>Ngày hủy</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(subscription.cancelled_at)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Quyền lợi gói {subscription.plan_name}
                  </h3>
                  <ul className="space-y-2.5">
                    {(planFeatures.length > 0 ? planFeatures : [
                      'Truy cập không giới hạn mọi khóa học',
                      'Chứng chỉ hoàn thành',
                      'Tải xuống tài liệu học tập',
                      'Hỗ trợ ưu tiên'
                    ]).map((benefit: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20"
                    onClick={() => navigate('/pricing')}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Xem các gói khác
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/20 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-center border-t">
              <div className="text-xs text-muted-foreground">
                Cần hỗ trợ về thanh toán? <a href="/support" className="text-blue-600 hover:underline">Liên hệ CSKH</a>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                {subscription.status === 'active' && subscription.auto_renew && (
                  <Button 
                    variant="ghost" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Hủy gia hạn
                  </Button>
                )}
                
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/user/payment-methods')}>
                  Quản lý thanh toán
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Cancel Dialog */}
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle className="text-destructive flex items-center gap-2">
                     <AlertCircle className="w-5 h-5" />
                     Xác nhận hủy gia hạn
                  </DialogTitle>
                  <DialogDescription>
                     Bạn có chắc chắn muốn hủy gia hạn tự động?
                  </DialogDescription>
               </DialogHeader>
               <div className="py-4">
                  <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm mb-4">
                    <p>
                      <strong>Lưu ý:</strong> Bạn vẫn sẽ giữ được quyền lợi cho đến hết ngày{' '}
                      <strong>{subscription.end_date ? formatDate(subscription.end_date) : 'hiện tại'}</strong>.
                      Sau đó tài khoản sẽ trở về gói Basic.
                    </p>
                  </div>
               </div>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Đóng</Button>
                  <Button variant="destructive" onClick={handleCancelSubscription} disabled={isCancelling}>
                    {isCancelling ? 'Đang xử lý...' : 'Hủy gia hạn'}
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
            <h2 className="text-xl font-bold mb-2">Bạn chưa đăng ký gói thành viên nào</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Mở khóa toàn bộ thư viện khóa học, tải xuống tài liệu và nhận chứng chỉ với gói Pro Member ngay hôm nay.
            </p>
            <Button size="lg" onClick={() => navigate('/pricing')}>
              <Zap className="w-4 h-4 mr-2" />
              Xem các gói cước
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
