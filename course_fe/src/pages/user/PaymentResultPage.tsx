import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertCircle, Loader2, ArrowLeft, BookOpen } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { useRouter } from "../../components/Router"
import { useTranslation } from "react-i18next"
import { formatCurrency, getPaymentStatus, Payment } from "../../services/payment.api"

type PaymentStatus = 'success' | 'failed' | 'error' | 'loading'

export function PaymentResultPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [amount, setAmount] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [responseCode, setResponseCode] = useState<string | null>(null)

  const [paymentData, setPaymentData] = useState<Payment | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get('status')
    const pid = params.get('payment_id')
    const amt = params.get('amount')
    const txn = params.get('transaction')
    const msg = params.get('message')
    const code = params.get('code')

    setPaymentId(pid)
    setAmount(amt)
    setTransactionId(txn)
    setErrorMessage(msg)
    setResponseCode(code)

    if (statusParam === 'success') {
      setStatus('success')
    } else if (statusParam === 'failed') {
      setStatus('failed')
    } else if (statusParam === 'error') {
      setStatus('error')
    } else {
      setStatus('error')
      setErrorMessage('Invalid payment status')
    }

    // if success we fetch the full payment record
    if (statusParam === 'success' && pid) {
      getPaymentStatus(Number(pid))
        .then((data) => setPaymentData(data))
        .catch((err: any) => {
          const msg = err?.message || 'Lỗi khi lấy thông tin thanh toán'
          setApiError(msg)
          setErrorMessage(msg)
          setStatus('error')
        })
    }
  }, [])

  const getVnpayErrorMessage = (code: string | null): string => {
    if (!code) return 'Giao dịch thất bại'
    const messages: Record<string, string> = {
      '07': 'Trừ tiền thành công nhưng giao dịch bị nghi ngờ (liên hệ ngân hàng)',
      '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Đã hết thời gian thanh toán. Vui lòng thực hiện lại',
      '12': 'Thẻ/Tài khoản bị khóa',
      '13': 'Nhập sai mật khẩu OTP. Vui lòng thực hiện lại',
      '24': 'Khách hàng hủy giao dịch',
      '51': 'Tài khoản không đủ số dư để thực hiện giao dịch',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
      '75': 'Ngân hàng đang bảo trì',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định. Vui lòng thực hiện lại',
      '99': 'Lỗi không xác định',
    }
    return messages[code] || `Giao dịch thất bại (mã lỗi: ${code})`
  }

  const statusConfig = {
    success: {
      icon: <CheckCircle2 className="w-20 h-20 text-green-500" />,
      title: 'Thanh toán thành công!',
      description: 'Bạn đã thanh toán thành công. Khóa học đã được thêm vào danh sách học của bạn.',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    failed: {
      icon: <XCircle className="w-20 h-20 text-red-500" />,
      title: 'Thanh toán thất bại',
      description: getVnpayErrorMessage(responseCode),
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    error: {
      icon: <AlertCircle className="w-20 h-20 text-yellow-500" />,
      title: 'Có lỗi xảy ra',
      description: errorMessage || 'Đã xảy ra lỗi trong quá trình xử lý thanh toán.',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    loading: {
      icon: <Loader2 className="w-20 h-20 text-muted-foreground animate-spin" />,
      title: 'Đang xử lý...',
      description: 'Vui lòng chờ trong giây lát.',
      bgColor: 'bg-muted/30',
      borderColor: 'border-muted',
    },
  }

  const config = statusConfig[status]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <Card className={`max-w-lg w-full border-2 ${config.borderColor}`}>
        <CardContent className={`pt-10 pb-8 px-8 ${config.bgColor} rounded-lg`}>
          <div className="flex flex-col items-center text-center space-y-6">
            {config.icon}

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{config.title}</h1>
              <p className="text-muted-foreground">{config.description}</p>
            </div>

            {status === 'success' && (
              <div className="w-full space-y-3 bg-background/80 rounded-lg p-4">
                {paymentId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mã đơn hàng:</span>
                    <span className="font-medium">#{paymentId}</span>
                  </div>
                )}
                {paymentData && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tổng hóa đơn:</span>
                      <span className="font-medium text-green-600">{formatCurrency(parseFloat(paymentData.total_amount))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phương thức:</span>
                      <span className="font-medium">{paymentData.payment_method}</span>
                    </div>
                  </>
                )}
                {/* still show transactionId if available */}
                {transactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mã giao dịch:</span>
                    <span className="font-mono text-xs">{transactionId}</span>
                  </div>
                )}
              </div>
            )}

            {/* render course breakdown */}
            {/* data-loading indicator */}
            {status === 'success' && !paymentData && !apiError && (
              <div className="py-4 text-center">
                <Loader2 className="inline w-6 h-6 animate-spin mr-2" />
                <span>Đang tải thông tin hóa đơn...</span>
              </div>
            )}

            {paymentData && paymentData.courses.length > 0 && (
              <div className="w-full mt-4 space-y-4">
                {paymentData.courses.map((c) => (
                  <Card key={c.course_id} className="border">
                    <CardContent className="flex items-center space-x-4">
                      {c.course_thumbnail && (
                        <img src={c.course_thumbnail} alt={c.course_title} className="w-16 h-16 object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold">{c.course_title}</div>
                        {c.instructor_name && (
                          <div className="text-sm text-muted-foreground">{c.instructor_name}</div>
                        )}
                        <div className="text-sm">
                          {formatCurrency(parseFloat(c.price))}
                          {' '}→ <span className="font-medium">{formatCurrency(parseFloat(c.final_price))}</span>
                        </div>
                        {c.discount !== '0.00' && (
                          <div className="text-xs text-red-500">Giảm {formatCurrency(parseFloat(c.discount))}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {status === 'failed' && paymentId && (
              <div className="w-full bg-background/80 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mã đơn hàng:</span>
                  <span className="font-medium">#{paymentId}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              {status === 'success' ? (
                <>
                  <Button
                    className="flex-1"
                    onClick={() => navigate('/my-learning')}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Đi tới khóa học
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/')}
                  >
                    Về trang chủ
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="flex-1"
                    onClick={() => navigate('/cart')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại giỏ hàng
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/')}
                  >
                    Về trang chủ
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
