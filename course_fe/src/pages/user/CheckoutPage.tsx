import { useState } from "react"
import { ArrowLeft, CreditCard, Building2, Smartphone, Check } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Separator } from "../../components/ui/separator"
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group"
import { useRouter } from "../../components/Router"
import { useCart } from "../../contexts/CartContext"
import { useAuth } from "../../contexts/AuthContext"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { useTranslation } from "react-i18next"
import { createPaymentRecord, createVnpayPayment } from "../../services/payment.api"
import { toast } from 'sonner@2.0.3'

export function CheckoutPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user } = useAuth()
  const { cartItems, getTotalPrice, getSavings, orderCoupon, clearCart } = useCart()
  const [selectedPayment, setSelectedPayment] = useState('card')
  const [isProcessing, setIsProcessing] = useState(false)

  const paymentMethods = [
    {
      id: 'card',
      name: t('checkout.card_info', 'Credit/Debit Card'),
      icon: CreditCard,
      description: 'Visa, Mastercard, American Express'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: Building2,
      description: 'Pay with your PayPal account'
    },
    {
      id: 'apple',
      name: 'Apple Pay',
      icon: Smartphone,
      description: 'Touch ID or Face ID'
    },
    {
      id: 'google',
      name: 'Google Pay',
      icon: Smartphone,
      description: 'Pay with Google'
    }
  ]

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to checkout')
      return
    }
    setIsProcessing(true)
    try {
      // Step 1: Create payment record with course details
      const paymentDetails = cartItems.map(item => ({
        course_id: Number(item.id),
        promotion_id: null,
      }))
      const payment = await createPaymentRecord({
        user_id: Number(user.id),
        payment_method: 'vnpay',
        payment_type: 'course_purchase',
        payment_details: paymentDetails,
      })

      // Step 2: Create VNPay payment URL
      const totalAmount = Math.round(getTotalPrice())
      const vnpayRes = await createVnpayPayment({
        amount: totalAmount,
        order_id: String(payment.id),
        order_desc: `Payment for ${cartItems.length} course(s)`,
      })

      // Step 3: Redirect to VNPay
      if (vnpayRes.payment_url) {
        clearCart()
        window.location.href = vnpayRes.payment_url
      } else {
        toast.error('Failed to create payment URL')
        setIsProcessing(false)
      }
    } catch (err: any) {
      console.error('Checkout failed:', err)
      toast.error(err?.message || 'Checkout failed. Please try again.')
      setIsProcessing(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl mb-4">{t('checkout.empty_cart')}</h1>
            <Button onClick={() => navigate('/courses')}>
              {t('checkout.continue_shopping')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate('/cart')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('checkout.back_to_cart')}
            </Button>
            <h1 className="text-2xl">{t('checkout.title')}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('checkout.payment_method')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                    <div className="space-y-4">
                      {paymentMethods.map((method) => {
                        const IconComponent = method.icon
                        return (
                          <div key={method.id} className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value={method.id} id={method.id} />
                            <IconComponent className="w-5 h-5" />
                            <div className="flex-1">
                              <Label htmlFor={method.id} className="cursor-pointer">
                                {method.name}
                              </Label>
                              <p className="text-sm text-muted-foreground">{method.description}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {selectedPayment === 'card' && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('checkout.card_info')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="cardNumber">{t('checkout.card_number')}</Label>
                        <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                      </div>
                      <div>
                        <Label htmlFor="expiry">{t('checkout.expiry_date')}</Label>
                        <Input id="expiry" placeholder="MM/YY" />
                      </div>
                      <div>
                        <Label htmlFor="cvc">{t('checkout.cvc')}</Label>
                        <Input id="cvc" placeholder="123" />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="cardName">{t('checkout.cardholder_name')}</Label>
                        <Input id="cardName" placeholder="John Doe" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>{t('checkout.billing_info')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('checkout.first_name')}</Label>
                      <Input id="firstName" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('checkout.last_name')}</Label>
                      <Input id="lastName" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="email">{t('checkout.email')}</Label>
                      <Input id="email" type="email" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="address">{t('checkout.address')}</Label>
                      <Input id="address" />
                    </div>
                    <div>
                      <Label htmlFor="city">{t('checkout.city')}</Label>
                      <Input id="city" />
                    </div>
                    <div>
                      <Label htmlFor="country">{t('checkout.country')}</Label>
                      <Input id="country" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('checkout.order_summary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <ImageWithFallback 
                        src={item.image} 
                        alt={item.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium line-clamp-2">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{t('checkout.by_instructor')} {item.instructor}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.couponDiscount ? (
                            <>
                              <span className="text-sm line-through text-muted-foreground">
                                ${item.currentPrice}
                              </span>
                              <span className="text-sm font-medium">
                                ${(item.currentPrice - item.couponDiscount).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-medium">${item.currentPrice}</span>
                          )}
                        </div>
                        {item.couponCode && (
                          <div className="flex items-center gap-1 mt-1">
                            <Check className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600">{t('checkout.coupon_applied')}: {item.couponCode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('checkout.subtotal')}:</span>
                      <span>${cartItems.reduce((sum, item) => sum + (item.couponDiscount ? item.currentPrice - item.couponDiscount : item.currentPrice), 0).toFixed(2)}</span>
                    </div>
                    {orderCoupon && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t('checkout.order_discount')} ({orderCoupon.code}):</span>
                        <span>-${(cartItems.reduce((sum, item) => sum + (item.couponDiscount ? item.currentPrice - item.couponDiscount : item.currentPrice), 0) - getTotalPrice()).toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>{t('checkout.total')}:</span>
                      <span>${getTotalPrice().toFixed(2)}</span>
                    </div>
                    {getSavings() > 0 && (
                      <p className="text-sm text-green-600">
                        {t('checkout.you_save')} ${getSavings().toFixed(2)}!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? t('checkout.processing') : `${t('checkout.complete_payment')} - $${getTotalPrice().toFixed(2)}`}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    {t('checkout.money_back')}
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