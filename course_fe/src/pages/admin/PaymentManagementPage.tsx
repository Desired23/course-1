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
import { getSystemSettings, createSystemSetting, updateSystemSetting } from '../../services/admin.api'
import type { SystemSetting } from '../../services/admin.api'


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
  const [payments, setPayments] = useState<Payment[]>([])
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([])
  const [policies, setPolicies] = useState<PaymentPolicy[]>([])
  const [instructorRates, setInstructorRates] = useState<InstructorRate[]>([])
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = await getSystemSettings()
        const paymentsS = settings.find(s => s.key === 'payment_records')
        const refundsS = settings.find(s => s.key === 'refund_requests')
        const policiesS = settings.find(s => s.key === 'payment_policies')
        const ratesS = settings.find(s => s.key === 'instructor_rates')
        const discountsS = settings.find(s => s.key === 'discount_rules')
        if (paymentsS) { try { const p = JSON.parse(paymentsS.value); setPayments(p.map((x: any) => ({ ...x, created_at: new Date(x.created_at), completed_at: x.completed_at ? new Date(x.completed_at) : undefined }))); setFilteredPayments(p.map((x: any) => ({ ...x, created_at: new Date(x.created_at), completed_at: x.completed_at ? new Date(x.completed_at) : undefined }))); } catch {} }
        if (refundsS) { try { const r = JSON.parse(refundsS.value); setRefundRequests(r.map((x: any) => ({ ...x, requested_at: new Date(x.requested_at), processed_at: x.processed_at ? new Date(x.processed_at) : undefined }))); } catch {} }
        if (policiesS) { try { setPolicies(JSON.parse(policiesS.value).map((x: any) => ({ ...x, updated_at: new Date(x.updated_at) }))); } catch {} }
        if (ratesS) { try { setInstructorRates(JSON.parse(ratesS.value).map((x: any) => ({ ...x, effective_from: new Date(x.effective_from) }))); } catch {} }
        if (discountsS) { try { setDiscountRules(JSON.parse(discountsS.value).map((x: any) => ({ ...x, valid_from: new Date(x.valid_from), valid_to: new Date(x.valid_to) }))); } catch {} }
      } catch {
        toast.error('Không thể tải dữ liệu thanh toán')
      }
    }
    loadData()
  }, [])

  // Filter configurations
  const paymentFilterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Tìm kiếm',
      type: 'search',
      placeholder: 'Tìm theo tên, email, khóa học...'
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Đang xử lý', value: 'pending', count: payments.filter(p => p.status === 'pending').length },
        { label: 'Hoàn thành', value: 'completed', count: payments.filter(p => p.status === 'completed').length },
        { label: 'Thất bại', value: 'failed', count: payments.filter(p => p.status === 'failed').length },
        { label: 'Đã hoàn tiền', value: 'refunded', count: payments.filter(p => p.status === 'refunded').length }
      ]
    },
    {
      key: 'payment_method',
      label: 'Phương thức',
      type: 'select',
      options: [
        { label: 'VNPAY', value: 'vnpay', count: payments.filter(p => p.payment_method === 'vnpay').length },
        { label: 'Thẻ tín dụng', value: 'credit_card', count: payments.filter(p => p.payment_method === 'credit_card').length },
        { label: 'PayPal', value: 'paypal', count: payments.filter(p => p.payment_method === 'paypal').length }
      ]
    },
    {
      key: 'amount',
      label: 'Số tiền',
      type: 'number',
      min: 0,
      max: 10000000
    },
    {
      key: 'date',
      label: 'Ngày thanh toán',
      type: 'daterange'
    }
  ]

  const refundFilterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Tìm kiếm',
      type: 'search',
      placeholder: 'Tìm theo tên, khóa học...'
    },
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { label: 'Chờ duyệt', value: 'pending', count: refundRequests.filter(r => r.status === 'pending').length },
        { label: 'Đã duyệt', value: 'approved', count: refundRequests.filter(r => r.status === 'approved').length },
        { label: 'Từ chối', value: 'rejected', count: refundRequests.filter(r => r.status === 'rejected').length }
      ]
    }
  ]

  const handlePaymentFilter = (filters: any) => {
    let filtered = payments

    if (filters.search) {
      filtered = filtered.filter(payment => 
        payment.user_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        payment.user_email.toLowerCase().includes(filters.search.toLowerCase()) ||
        payment.course_title.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.status) {
      filtered = filtered.filter(payment => payment.status === filters.status)
    }

    if (filters.payment_method) {
      filtered = filtered.filter(payment => payment.payment_method === filters.payment_method)
    }

    if (filters.amount?.min || filters.amount?.max) {
      filtered = filtered.filter(payment => {
        const amount = payment.amount
        const min = filters.amount?.min ? parseFloat(filters.amount.min) : 0
        const max = filters.amount?.max ? parseFloat(filters.amount.max) : Infinity
        return amount >= min && amount <= max
      })
    }

    if (filters.date?.from || filters.date?.to) {
      filtered = filtered.filter(payment => {
        const date = payment.created_at
        const from = filters.date?.from ? new Date(filters.date.from) : new Date(0)
        const to = filters.date?.to ? new Date(filters.date.to) : new Date()
        return date >= from && date <= to
      })
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

  if (!hasPermission('admin.payments.manage')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Không có quyền truy cập</h2>
          <p className="text-muted-foreground">Bạn không có quyền quản lý thanh toán.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">Quản lý thanh toán</h1>
          <p className="text-muted-foreground">Quản lý các giao dịch, hoàn tiền và chính sách thanh toán</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(1398000)}</div>
            <p className="text-xs text-muted-foreground">
              +12% từ tháng trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giao dịch</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter(p => p.status === 'completed').length} hoàn thành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yêu cầu hoàn tiền</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{refundRequests.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">
              Chờ xử lý
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ thành công</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">94.2%</div>
            <p className="text-xs text-muted-foreground">
              Tỷ lệ thanh toán thành công
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payments">Giao dịch</TabsTrigger>
          <TabsTrigger value="refunds">Hoàn tiền</TabsTrigger>
          <TabsTrigger value="policies">Chính sách</TabsTrigger>
          <TabsTrigger value="instructor-rates">Hoa hồng GV</TabsTrigger>
          <TabsTrigger value="discounts">Mã giảm giá</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <TableFilter
            title="Bộ lọc giao dịch"
            configs={paymentFilterConfigs}
            onFilterChange={handlePaymentFilter}
          />

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Danh sách giao dịch ({filteredPayments.length})</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Xuất Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã GD</TableHead>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Phơng thức</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.user_name}</p>
                          <p className="text-sm text-muted-foreground">{payment.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{payment.course_title}</p>
                          <p className="text-sm text-muted-foreground">{payment.instructor_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{payment.created_at.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedPayment(payment)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Xem chi tiết
                            </DropdownMenuItem>
                            {payment.status === 'completed' && (
                              <DropdownMenuItem>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Hoàn tiền
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
            title="Bộ lọc hoàn tiền"
            configs={refundFilterConfigs}
            onFilterChange={() => {}}
          />

          <Card>
            <CardHeader>
              <CardTitle>Yêu cầu hoàn tiền ({refundRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Tiến độ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày yêu cầu</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
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
                          <p className="text-sm">{refund.learning_progress}% hoàn thành</p>
                          <p className="text-xs text-muted-foreground">
                            {refund.course_completion_days} ngày học
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
                <CardTitle>Chính sách thanh toán</CardTitle>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Cập nhật chính sách
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
                        Cập nhật: {policy.updated_at.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium">
                        {policy.value}
                        {policy.unit === 'percentage' ? '%' : 
                         policy.unit === 'days' ? ' ngày' : ' VND'}
                      </p>
                      <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                        {policy.is_active ? 'Hoạt động' : 'Tạm dừng'}
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
                <CardTitle>Tỷ lệ hoa hồng giảng viên</CardTitle>
                <Button>
                  <Percent className="h-4 w-4 mr-2" />
                  Thiết lập hoa hồng
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Giảng viên</TableHead>
                    <TableHead>Tỷ lệ hoa hồng</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Có hiệu lực từ</TableHead>
                    <TableHead>Đến</TableHead>
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
                          {rate.is_custom ? 'Tùy chỉnh' : 'Mặc định'}
                        </Badge>
                      </TableCell>
                      <TableCell>{rate.effective_from.toLocaleDateString()}</TableCell>
                      <TableCell>{rate.effective_to?.toLocaleDateString() || 'Vô thời hạn'}</TableCell>
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
                <CardTitle>Mã giảm giá</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo mã giảm giá
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Giảm giá</TableHead>
                    <TableHead>Sử dụng</TableHead>
                    <TableHead>Thời hạn</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
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
                          <p className="text-muted-foreground">đến {rule.valid_to.toLocaleDateString()}</p>
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
              <DialogTitle>Chi tiết giao dịch</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết về giao dịch {selectedPayment.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Mã giao dịch</Label>
                  <p className="font-mono">{selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Trạng thái</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Học viên</Label>
                  <p>{selectedPayment.user_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.user_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Khóa học</Label>
                  <p>{selectedPayment.course_title}</p>
                  <p className="text-sm text-muted-foreground">GV: {selectedPayment.instructor_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Số tiền</Label>
                  <p className="text-lg font-medium">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phương thức</Label>
                  <Badge variant="outline">{selectedPayment.payment_method}</Badge>
                </div>
                {selectedPayment.vnpay_transaction_id && (
                  <div>
                    <Label className="text-sm font-medium">VNPAY Transaction ID</Label>
                    <p className="font-mono text-sm">{selectedPayment.vnpay_transaction_id}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Phí nền tảng</Label>
                  <p>{formatCurrency(selectedPayment.platform_fee)} ({selectedPayment.commission_rate}%)</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Thu nhập GV</Label>
                  <p>{formatCurrency(selectedPayment.instructor_earning)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Ngày tạo</Label>
                  <p>{selectedPayment.created_at.toLocaleString()}</p>
                </div>
                {selectedPayment.completed_at && (
                  <div>
                    <Label className="text-sm font-medium">Ngày hoàn thành</Label>
                    <p>{selectedPayment.completed_at.toLocaleString()}</p>
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
              <DialogTitle>Chi tiết yêu cầu hoàn tiền</DialogTitle>
              <DialogDescription>
                Thông tin chi tiết về yêu cầu hoàn tiền
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Học viên</Label>
                <p>{selectedRefund.user_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Khóa học</Label>
                <p>{selectedRefund.course_title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Số tiền hoàn</Label>
                <p className="text-lg font-medium">{formatCurrency(selectedRefund.amount)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Lý do</Label>
                <p className="text-sm">{selectedRefund.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tiến độ học</Label>
                  <p>{selectedRefund.learning_progress}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Số ngày học</Label>
                  <p>{selectedRefund.course_completion_days} ngày</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Trạng thái</Label>
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
                    Phê duyệt
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      handleRefundDecision(selectedRefund.id, 'rejected')
                      setSelectedRefund(null)
                    }}
                  >
                    Từ chối
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