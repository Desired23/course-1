import { useState } from "react"
import { ArrowLeft, ShieldCheck, Loader2, Lock } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Separator } from "../../components/ui/separator"
import { useRouter } from "../../components/Router"
import { useCart } from "../../contexts/CartContext"
import { useAuth } from "../../contexts/AuthContext"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { useTranslation } from "react-i18next"
import { createPaymentRecord, createVnpayPayment } from "../../services/payment.api"
import { formatCartPrice } from "../../services/cart.api"
import { toast } from 'sonner@2.0.3'

export function CheckoutPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user } = useAuth()
  const { cartItems, getTotalPrice, getOriginalPrice, getSavings, orderCoupon, clearCart } = useCart()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thanh toán')
      return
    }
    if (cartItems.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }

    setIsProcessing(true)
    try {
      // Step 1: Create payment record with course details
      const paymentDetails = cartItems.map(item => ({
        course_id: Number(item.id),
        promotion_id: null,
      }))
      const result = await createPaymentRecord({
        user_id: Number(user.id),
        payment_method: 'vnpay',
        payment_type: 'course_purchase',
        payment_details: paymentDetails,
      })

      // Step 2: Create VNPay payment URL
      const totalAmount = Math.round(getTotalPrice())
      const vnpayRes = await createVnpayPayment({
        amount: totalAmount,
        order_id: String(result.payment.id),
        order_desc: `Thanh toan ${cartItems.length} khoa hoc`,
      })

      // Step 3: Redirect to VNPay
      if (vnpayRes.payment_url) {
        clearCart()
        window.location.href = vnpayRes.payment_url
      } else {
        toast.error('Không thể tạo liên kết thanh toán')
        setIsProcessing(false)
      }
    } catch (err: any) {
      console.error('Checkout failed:', err)
      toast.error(err?.message || 'Thanh toán thất bại. Vui lòng thử lại.')
      setIsProcessing(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl mb-4">{t('checkout.empty_cart', 'Giỏ hàng trống')}</h1>
            <Button onClick={() => navigate('/courses')}>
              {t('checkout.continue_shopping', 'Tiếp tục mua sắm')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/cart')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('checkout.back_to_cart', 'Quay lại giỏ hàng')}
            </Button>
            <h1 className="text-2xl font-bold">{t('checkout.title', 'Thanh toán')}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Course list + Payment method */}
            <div className="lg:col-span-3 space-y-6">
              {/* Course items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Đơn hàng ({cartItems.length} khóa học)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-14 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-2">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.instructor}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.couponDiscount ? (
                          <>
                            <p className="text-sm font-medium">{formatCartPrice(item.currentPrice - item.couponDiscount)}</p>
                            <p className="text-xs text-muted-foreground line-through">{formatCartPrice(item.currentPrice)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">{formatCartPrice(item.currentPrice)}</p>
                            {item.originalPrice > item.currentPrice && (
                              <p className="text-xs text-muted-foreground line-through">{formatCartPrice(item.originalPrice)}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* VNPay Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('checkout.payment_method', 'Phương thức thanh toán')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 border-2 border-primary rounded-lg p-4 bg-primary/5">
                    <div className="w-16 h-10 bg-white rounded border flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 100 32" className="w-14 h-8">
                        <text x="5" y="24" fill="#D0021B" fontWeight="bold" fontSize="20" fontFamily="Arial, sans-serif">VN</text>
                        <text x="38" y="24" fill="#1A73E8" fontWeight="bold" fontSize="20" fontFamily="Arial, sans-serif">PAY</text>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">VNPay</p>
                      <p className="text-sm text-muted-foreground">
                        Thanh toán qua ví VNPay, thẻ ATM, Visa, Mastercard, JCB, QR Code
                      </p>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Giao dịch được bảo mật bởi VNPay. Bạn sẽ được chuyển đến trang thanh toán VNPay.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Order Summary + Pay button */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">{t('checkout.order_summary', 'Tóm tắt đơn hàng')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Giá gốc:</span>
                      <span className="text-muted-foreground line-through">{formatCartPrice(getOriginalPrice())}</span>
                    </div>
                    {getSavings() > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Giảm giá:</span>
                        <span>-{formatCartPrice(getSavings())}</span>
                      </div>
                    )}
                    {orderCoupon && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Mã giảm giá ({orderCoupon.code}):</span>
                        <span>-{formatCartPrice(getOriginalPrice() - getSavings() - getTotalPrice())}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-xl font-bold">
                    <span>Tổng cộng:</span>
                    <span className="text-primary">{formatCartPrice(getTotalPrice())}</span>
                  </div>

                  <Button
                    className="w-full mt-4"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>Thanh toán VNPay — {formatCartPrice(getTotalPrice())}</>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {t('checkout.money_back', 'Đảm bảo hoàn tiền trong 7 ngày')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}