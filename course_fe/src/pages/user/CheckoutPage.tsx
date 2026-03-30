import { useState } from "react"
import { ArrowLeft, CreditCard, Landmark, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Separator } from "../../components/ui/separator"
import { useRouter } from "../../components/Router"
import { useCart } from "../../contexts/CartContext"
import { useAuth } from "../../contexts/AuthContext"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { useTranslation } from "react-i18next"
import { createPaymentRecord, createVnpayPayment, type CreatePaymentResponse } from "../../services/payment.api"
import { formatCartPrice } from "../../services/cart.api"
import { DiscountCountdown } from "../../components/DiscountCountdown"
import { toast } from "sonner"

type GatewayMethod = "momo" | "vnpay"

export function CheckoutPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user } = useAuth()
  const { cartItems, getTotalPrice, getOriginalPrice, getSavings, orderCoupon, appliedPromotion, clearCart } = useCart()
  const gatewayOptions: Array<{
    id: GatewayMethod
    title: string
    description: string
    icon: typeof Smartphone
    accent: string
  }> = [
    {
      id: "momo",
      title: t("checkout.gateway_options.momo.title"),
      description: t("checkout.gateway_options.momo.description"),
      icon: Smartphone,
      accent: "text-pink-600",
    },
    {
      id: "vnpay",
      title: t("checkout.gateway_options.vnpay.title"),
      description: t("checkout.gateway_options.vnpay.description"),
      icon: CreditCard,
      accent: "text-blue-600",
    },
  ]
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<GatewayMethod>("momo")
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null)
  const [confirmedPaymentId, setConfirmedPaymentId] = useState<string | null>(null)
  const [confirmedGatewayUrl, setConfirmedGatewayUrl] = useState<string | null>(null)

  const displayTotal = confirmedAmount ?? getTotalPrice()
  const paymentMethodLabel = t(`checkout.gateway_options.${paymentMethod}.title`)

  const handleCheckout = async () => {
    if (!user) {
      toast.error(t("checkout.login_required"))
      return
    }
    if (cartItems.length === 0) {
      toast.error(t("checkout.empty_cart"))
      return
    }

    setIsProcessing(true)
    try {
      const paymentDetails = cartItems.map((item) => ({
        course_id: Number(item.courseId || item.id),
        promotion_id: item.promotionId || null,
      }))

      const adminPromotionId =
        appliedPromotion?.promotion.type === "admin" ? appliedPromotion.promotion.id : null

      const result = await createPaymentRecord({
        user_id: Number(user.id),
        payment_method: paymentMethod,
        payment_type: "course_purchase",
        payment_details: paymentDetails,
        promotion_id: adminPromotionId,
      })

      const beTotal = Math.round(parseFloat(String(result.payment.total_amount)))
      const feTotal = Math.round(getTotalPrice())

      if (Math.abs(beTotal - feTotal) > 1) {
        setConfirmedAmount(beTotal)
        setConfirmedPaymentId(String(result.payment.id))
        setConfirmedGatewayUrl(result.gateway_payment?.url || null)
        setIsProcessing(false)
        toast.info(t("checkout.price_updated_toast", {
          from: formatCartPrice(feTotal),
          to: formatCartPrice(beTotal),
        }))
        return
      }

      await proceedToGateway(result, String(result.payment.id), beTotal)
    } catch (err: any) {
      console.error("Checkout failed:", err)
      const msg = err?.error || err?.message || t("checkout.checkout_failed")
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg))
      setIsProcessing(false)
    }
  }

  const handleConfirmAndPay = async () => {
    if (!confirmedPaymentId || confirmedAmount === null) return
    setIsProcessing(true)
    try {
      if (confirmedGatewayUrl) {
        clearCart()
        window.location.href = confirmedGatewayUrl
        return
      }

      await proceedToGateway(null, confirmedPaymentId, confirmedAmount)
    } catch (err) {
      console.error("Gateway redirect failed:", err)
      toast.error(t("checkout.create_payment_url_failed"))
      setIsProcessing(false)
    }
  }

  const proceedToGateway = async (result: CreatePaymentResponse | null, paymentId: string, amount: number) => {
    if (paymentMethod === "momo") {
      const gatewayUrl = result?.gateway_payment?.url
      if (gatewayUrl) {
        clearCart()
        window.location.href = gatewayUrl
        return
      }
    }

    const vnpayUrl = result?.gateway_payment?.url
    if (vnpayUrl) {
      clearCart()
      window.location.href = vnpayUrl
      return
    }

    const vnpayRes = await createVnpayPayment({
      amount,
      order_id: paymentId,
      order_desc: t("checkout.order_description", { count: cartItems.length }),
    })

    if (vnpayRes.payment_url) {
      clearCart()
      window.location.href = vnpayRes.payment_url
      return
    }

    toast.error(t("checkout.create_payment_url_failed"))
    setIsProcessing(false)
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl mb-4">{t("checkout.empty_cart")}</h1>
            <Button onClick={() => navigate("/courses")}>
              {t("checkout.continue_shopping")}
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
            <Button variant="ghost" onClick={() => navigate("/cart")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("checkout.back_to_cart")}
            </Button>
            <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("checkout.order_title", { count: cartItems.length })}</CardTitle>
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
                            {item.discountEndDate && item.originalPrice > item.currentPrice && (
                              <DiscountCountdown endDate={item.discountEndDate} variant="badge" className="mt-1" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("checkout.payment_method")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gatewayOptions.map((option) => {
                    const Icon = option.icon
                    const isSelected = paymentMethod === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMethod(option.id)}
                        className={`w-full flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className={`w-16 h-10 bg-white rounded border flex items-center justify-center flex-shrink-0 ${option.accent}`}>
                          {option.id === "vnpay" ? (
                            <div className="flex items-center gap-1">
                              <Landmark className="w-4 h-4" />
                              <CreditCard className="w-4 h-4" />
                            </div>
                          ) : (
                            <Icon className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{option.title}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        {isSelected && <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                      </button>
                    )
                  })}
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {t("checkout.security_notice", { method: paymentMethodLabel })}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">{t("checkout.order_summary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("checkout.original_price_label")}</span>
                      <span className="text-muted-foreground line-through">{formatCartPrice(getOriginalPrice())}</span>
                    </div>
                    {getSavings() > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t("checkout.discount_label")}</span>
                        <span>-{formatCartPrice(getSavings())}</span>
                      </div>
                    )}
                    {appliedPromotion && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t("checkout.coupon_label", { code: appliedPromotion.promotion.code })}</span>
                        <span>-{formatCartPrice(appliedPromotion.totalDiscount)}</span>
                      </div>
                    )}
                    {!appliedPromotion && orderCoupon && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t("checkout.coupon_label", { code: orderCoupon.code })}</span>
                        <span>-{formatCartPrice(orderCoupon.discount)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-xl font-bold">
                    <span>{t("checkout.total_label")}</span>
                    <span className="text-primary">{formatCartPrice(displayTotal)}</span>
                  </div>

                  {confirmedAmount !== null && confirmedAmount !== Math.round(getTotalPrice()) && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                        {t("checkout.price_updated_title")}
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                        {t("checkout.price_updated_description")}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full mt-4"
                    size="lg"
                    onClick={confirmedAmount !== null ? handleConfirmAndPay : handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("checkout.processing")}
                      </>
                    ) : confirmedAmount !== null ? (
                      <>{t("checkout.confirm_payment", { amount: formatCartPrice(displayTotal) })}</>
                    ) : (
                      <>{t("checkout.pay_with_method", { method: paymentMethodLabel, amount: formatCartPrice(displayTotal) })}</>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {t("checkout.money_back")}
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
