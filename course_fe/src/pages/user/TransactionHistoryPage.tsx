import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { useRouter } from '../../components/Router'
import { useTranslation } from 'react-i18next'
import { getMyPayments, formatCurrency, type MyPayment } from '../../services/payment.api'
import {
  Receipt, Loader2, ShoppingBag, Calendar, CreditCard,
  ChevronDown, ChevronUp, ExternalLink, PackageOpen
} from 'lucide-react'

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">Hoàn thành</Badge>
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100">Đang xử lý</Badge>
    case 'failed':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">Thất bại</Badge>
    case 'refunded':
      return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100">Đã hoàn tiền</Badge>
    case 'cancelled':
      return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-100">Đã hủy</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function paymentTypeLabel(type: string) {
  switch (type) {
    case 'course_purchase': return 'Mua khóa học'
    case 'subscription': return 'Gói đăng ký'
    default: return type
  }
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case 'vnpay': return 'VNPay'
    case 'momo': return 'MoMo'
    default: return method
  }
}

function refundStatusBadge(status: string) {
  switch (status) {
    case 'success': return <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Đã hoàn</Badge>
    case 'approved': return <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">Đã duyệt</Badge>
    case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">Chờ duyệt</Badge>
    case 'rejected': return <Badge variant="outline" className="text-red-600 border-red-300 text-xs">Từ chối</Badge>
    case 'cancelled': return <Badge variant="outline" className="text-gray-500 border-gray-300 text-xs">Đã hủy</Badge>
    default: return null
  }
}

export function TransactionHistoryPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [payments, setPayments] = useState<MyPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMyPayments()
      .then((data) => { if (!cancelled) setPayments(data) })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Không thể tải lịch sử giao dịch') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggle = (id: number) => setExpandedId(prev => prev === id ? null : id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Lịch sử giao dịch
          </h1>
          <p className="text-muted-foreground">Xem lại tất cả các giao dịch thanh toán của bạn.</p>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <PackageOpen className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">Chưa có giao dịch nào</p>
            <p className="text-sm mb-6">Khi bạn mua khóa học, giao dịch sẽ hiển thị tại đây.</p>
            <Button onClick={() => navigate('/courses')}>Khám phá khóa học</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="overflow-hidden">
                {/* Payment header row */}
                <button
                  className="w-full text-left"
                  onClick={() => toggle(payment.id)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {payment.payment_type === 'subscription'
                            ? <CreditCard className="h-5 w-5 text-primary" />
                            : <ShoppingBag className="h-5 w-5 text-primary" />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{paymentTypeLabel(payment.payment_type)}</span>
                            {statusBadge(payment.payment_status)}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {payment.payment_date
                                ? new Date(payment.payment_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'N/A'}
                            </span>
                            <span>{paymentMethodLabel(payment.payment_method)}</span>
                            {payment.transaction_id && (
                              <span className="hidden sm:inline truncate max-w-[180px]">#{payment.transaction_id}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-base">{formatCurrency(payment.total_amount)}</div>
                          {parseFloat(payment.discount_amount) > 0 && (
                            <div className="text-xs text-green-600">-{formatCurrency(payment.discount_amount)}</div>
                          )}
                        </div>
                        {expandedId === payment.id
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </div>
                  </CardContent>
                </button>

                {/* Expanded details */}
                {expandedId === payment.id && payment.items.length > 0 && (
                  <div className="border-t bg-muted/30">
                    <div className="p-4 sm:p-5 space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết đơn hàng</h4>
                      {payment.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 py-2">
                          <img
                            src={item.course_thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=80&h=50&fit=crop'}
                            alt={item.course_title}
                            className="w-16 h-10 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.course_title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {parseFloat(item.discount) > 0 && (
                                <span className="text-xs text-muted-foreground line-through">{formatCurrency(item.price)}</span>
                              )}
                              <span className="text-sm font-semibold">{formatCurrency(item.final_price)}</span>
                              {item.refund_status && item.refund_status !== 'pending' && refundStatusBadge(item.refund_status)}
                            </div>
                          </div>
                          {item.course_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); navigate(`/course/${item.course_id}`) }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {/* Summary footer */}
                      <div className="border-t pt-3 mt-3 flex justify-between text-sm">
                        <span className="text-muted-foreground">Tổng thanh toán</span>
                        <span className="font-bold">{formatCurrency(payment.total_amount)}</span>
                      </div>
                      {parseFloat(payment.refund_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Đã hoàn tiền</span>
                          <span className="font-semibold text-purple-600">{formatCurrency(payment.refund_amount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
