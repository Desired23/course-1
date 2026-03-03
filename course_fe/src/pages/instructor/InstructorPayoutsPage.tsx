import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "sonner@2.0.3"
import { formatCurrency, formatDate, formatRelativeTime } from "../../utils/formatters"
import { getMyInstructorProfile } from "../../services/instructor.api"
import { getInstructorPayouts, requestPayout, formatPayoutAmount, type InstructorPayout } from "../../services/instructor-payouts.api"
import { getAllInstructorEarnings, parseEarningAmount, type InstructorEarning } from "../../services/instructor-earnings.api"
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
import { 
  DollarSign, 
  Download, 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  CreditCard, 
  AlertCircle,
  Info,
  Eye,
  Ban,
  Crown
} from "lucide-react"

// Types
interface Payout {
  id: string
  instructor_id: number
  amount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  request_date: string
  processed_date: string | null
  payment_method: string
  bank_details?: {
    bank_name: string
    account_number: string
    account_name: string
  }
  period: string
  earnings_count: number
  courses_count: number
  notes: string | null
  admin_notes: string | null
  processed_by: number | null
}

interface PayoutMethod {
  id: string
  type: 'bank' | 'paypal'
  bank_name?: string
  account_number?: string
  account_name?: string
  email?: string
  is_default: boolean
  status: 'verified' | 'pending' | 'rejected'
  created_at: string
}

interface Earning {
  earning_id: number
  course: {
    course_id: number
    title: string
    thumbnail: string
  }
  student?: {
    user_id: number
    name: string
  }
  amount: number
  commission_rate: number
  net_amount: number
  status: 'available' | 'locked' | 'paid'
  earning_date: string
  payout_id: number | null
  payment_id: number
  source_type: 'course_sale' | 'subscription'
}

// Add Subscription earnings flag based on user_subscription field
const isSubscriptionEarning = (e: InstructorEarning) => e.user_subscription != null

export function InstructorPayoutsPage() {
  const { user } = useAuth()
  const [payouts, setPayouts] = useState<InstructorPayout[]>([])
  const [payoutMethods, setPayoutMethods] = useState<InstructorPayoutMethod[]>([])
  const [earnings, setEarnings] = useState<InstructorEarning[]>([])
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [selectedPayout, setSelectedPayout] = useState<InstructorPayout | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return
      try {
        const instructor = await getMyInstructorProfile(user.id)
        const [payoutsData, earningsData, methodsData] = await Promise.all([
          getInstructorPayouts({ instructor_id: instructor.id }),
          getAllInstructorEarnings({ instructor_id: instructor.id }),
          getInstructorPayoutMethods(),
        ])
        setPayouts(payoutsData)
        setEarnings(earningsData)
        setPayoutMethods(methodsData)
      } catch {
        toast.error('Không thể tải dữ liệu thu nhập')
      }
    }
    fetchData()
  }, [user?.id])

  // Calculate stats from earnings
  const availableBalance = earnings
    .filter(e => e.status === 'available')
    .reduce((sum, e) => sum + parseEarningAmount(e.net_amount), 0)
  
  const lockedBalance = earnings
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + parseEarningAmount(e.net_amount), 0)
  
  const totalPaid = earnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + parseEarningAmount(e.net_amount), 0)

  // Breakdown by Source
  const salesEarnings = earnings
    .filter(e => !isSubscriptionEarning(e) && e.status === 'available')
    .reduce((sum, e) => sum + parseEarningAmount(e.net_amount), 0)

  const subscriptionEarnings = earnings
    .filter(e => isSubscriptionEarning(e) && e.status === 'available')
    .reduce((sum, e) => sum + parseEarningAmount(e.net_amount), 0)

  const pendingPayouts = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseEarningAmount(p.amount), 0)

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'cancelled': return <Ban className="h-4 w-4" />
      case 'failed': return <Ban className="h-4 w-4" />
      default: return null
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Chờ duyệt',
      'processed': 'Đã thanh toán',
      'cancelled': 'Đã hủy',
      'failed': 'Thất bại'
    }
    return statusMap[status] || status
  }

  const handleRequestPayout = async () => {
    if (!selectedMethod) {
      toast.error('Vui lòng chọn phương thức thanh toán')
      return
    }
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ')
      return
    }
    const amount = parseFloat(payoutAmount)
    if (amount < 50) {
      toast.error('Số tiền rút tối thiểu là $50.00')
      return
    }
    if (amount > availableBalance) {
      toast.error(`Số dư khả dụng không đủ. Bạn chỉ có ${formatCurrency(availableBalance, 'USD')}`)
      return
    }

    setIsSubmitting(true)
    try {
      const newPayout = await requestPayout({
        amount,
        payout_method_id: Number(selectedMethod),
        notes: undefined,
        period: new Date().toISOString().slice(0, 7),
      })
      setPayouts([newPayout, ...payouts])
      setIsRequestDialogOpen(false)
      setSelectedMethod('')
      setPayoutAmount('')
      toast.success('Yêu cầu rút tiền đã được gửi!', {
        description: 'Admin sẽ xem xét và phê duyệt trong vòng 3-5 ngày làm việc.'
      })
    } catch {
      toast.error('Không thể gửi yêu cầu rút tiền')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewDetails = (payout: Payout) => {
    setSelectedPayout(payout)
    setIsDetailDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Thu nhập & Rút tiền</h1>
          <p className="text-muted-foreground">Quản lý thu nhập từ Bán khóa học và Subscriptions</p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={availableBalance < 50}>
              <DollarSign className="h-4 w-4" />
              Yêu cầu rút tiền
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yêu cầu rút tiền</DialogTitle>
              <DialogDescription>
                Rút thu nhập khả dụng của bạn
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tổng số dư khả dụng</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance, 'USD')}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-muted-foreground/20">
                    <span className="text-muted-foreground">Từ bán khóa học:</span>
                    <span className="font-medium">{formatCurrency(salesEarnings, 'USD')}</span>
                </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Từ Subscriptions:</span>
                    <span className="font-medium">{formatCurrency(subscriptionEarnings, 'USD')}</span>
                </div>
              </div>

              {lockedBalance > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Thu nhập bị khóa</AlertTitle>
                  <AlertDescription>
                    Bạn có {formatCurrency(lockedBalance, 'USD')} đang bị khóa do yêu cầu hoàn tiền. 
                    Số tiền này sẽ được giải phóng sau khi xử lý xong.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền rút *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  max={availableBalance}
                  min={50}
                />
                <p className="text-xs text-muted-foreground">
                  Số tiền rút tối thiểu: $50.00 | Tối đa: {formatCurrency(availableBalance, 'USD')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Phương thức thanh toán *</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phương thức" />
                  </SelectTrigger>
                  <SelectContent>
                    {payoutMethods
                      .map((method) => (
                        <SelectItem key={String(method.id)} value={String(method.id)}>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {method.method_type === 'bank_transfer'
                              ? `${method.bank_name} - ****${method.masked_account?.slice(-4) || ''}`
                              : `${method.method_type} - ${method.masked_account || method.nickname || ''}`
                            }
                            {method.is_default && (
                              <Badge variant="secondary" className="text-xs">Mặc định</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleRequestPayout} disabled={isSubmitting}>
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Số dư khả dụng</CardDescription>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(availableBalance, 'USD')}
            </div>
            <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-700 dark:bg-green-900/30">
                    Sales: {formatCurrency(salesEarnings, 'USD')}
                </Badge>
                <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                    Subs: {formatCurrency(subscriptionEarnings, 'USD')}
                </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Đang chờ duyệt</CardDescription>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(pendingPayouts, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đang được xử lý
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Đã thanh toán</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPaid, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tổng thu nhập đã nhận
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Lần rút thành công</CardDescription>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedPayouts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Giao dịch hoàn tất
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      {availableBalance < 50 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Số dư chưa đủ để rút tiền</AlertTitle>
          <AlertDescription>
            Bạn cần có ít nhất $50.00 trong số dư khả dụng để gửi yêu cầu rút tiền. 
            Số dư hiện tại: {formatCurrency(availableBalance, 'USD')}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">Thu nhập chi tiết</TabsTrigger>
          <TabsTrigger value="history">Lịch sử rút tiền</TabsTrigger>
          <TabsTrigger value="methods">Phương thức thanh toán</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết nguồn thu</CardTitle>
              <CardDescription>Theo dõi thu nhập từ mọi nguồn</CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bạn chưa có thu nhập nào
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nguồn</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Học viên / Ghi chú</TableHead>
                      <TableHead>Doanh thu gốc</TableHead>
                      <TableHead>Hoa hồng</TableHead>
                      <TableHead>Thực nhận</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((earning) => (
                      <TableRow key={earning.id}>
                         <TableCell>
                            {isSubscriptionEarning(earning) ? (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                    <Crown className="w-3 h-3 mr-1" /> Subscription
                                </Badge>
                            ) : (
                                <Badge variant="outline">Course Sale</Badge>
                            )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm font-medium">
                            Khóa học #{earning.course}
                          </div>
                        </TableCell>
                        <TableCell>
                            {isSubscriptionEarning(earning) ? (
                                <span className="text-muted-foreground italic text-xs">Revenue Pool Distribution</span>
                            ) : (
                                <span className="text-muted-foreground text-xs">Course sale</span>
                            )}
                        </TableCell>
                        <TableCell>{formatPayoutAmount(earning.amount)}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatPayoutAmount(earning.net_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            earning.status === 'available' ? 'default' :
                            earning.status === 'pending' ? 'outline' : 'secondary'
                          }>
                            {earning.status === 'available' ? 'Khả dụng' :
                             earning.status === 'pending' ? 'Chờ xử lý' : 'Đã thanh toán'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatRelativeTime(earning.earning_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử yêu cầu rút tiền</CardTitle>
              <CardDescription>Xem tất cả các yêu cầu rút tiền của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bạn chưa có yêu cầu rút tiền nào
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã giao dịch</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Phương thức</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày yêu cầu</TableHead>
                      <TableHead>Ngày xử lý</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-mono">#{payout.id}</TableCell>
                        <TableCell className="font-semibold">
                          {formatPayoutAmount(payout.amount)}
                        </TableCell>
                        <TableCell>{payout.payment_method}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(payout.status)} className="gap-1">
                            {getStatusIcon(payout.status)}
                            {getStatusText(payout.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payout.request_date)}</TableCell>
                        <TableCell>
                          {payout.processed_date ? formatDate(payout.processed_date) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewDetails(payout)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
              <CardDescription>Quản lý các phương thức nhận tiền</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payoutMethods.map((method) => (
                  <Card key={String(method.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {method.method_type === 'bank_transfer'
                                ? `${method.bank_name} - ****${method.masked_account?.slice(-4) || ''}`
                                : `${method.method_type} - ${method.masked_account || method.nickname || ''}`
                              }
                              {method.is_default && (
                                <Badge variant="default" className="text-xs">Mặc định</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {method.method_type === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : method.method_type}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {payoutMethods.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Bạn chưa thêm phương thức thanh toán nào
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu rút tiền</DialogTitle>
            <DialogDescription>
              Mã giao dịch: #{selectedPayout?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Số tiền</div>
                  <div className="text-2xl font-bold">
                    {formatPayoutAmount(selectedPayout.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Trạng thái</div>
                  <Badge variant={getStatusColor(selectedPayout.status)} className="gap-1 mt-2">
                    {getStatusIcon(selectedPayout.status)}
                    {getStatusText(selectedPayout.status)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Ngày yêu cầu</div>
                  <div>{formatDate(selectedPayout.request_date)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Ngày xử lý</div>
                  <div>
                    {selectedPayout.processed_date 
                      ? formatDate(selectedPayout.processed_date) 
                      : 'Chưa xử lý'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Phương thức thanh toán</div>
                <div>{selectedPayout.payment_method}</div>
                {selectedPayout.bank_details && (
                  <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                    <div>Ngân hàng: {selectedPayout.bank_details.bank_name}</div>
                    <div>Số tài khoản: {selectedPayout.bank_details.account_number}</div>
                    <div>Chủ tài khoản: {selectedPayout.bank_details.account_name}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
