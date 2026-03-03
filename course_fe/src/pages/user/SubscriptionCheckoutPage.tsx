import React, { useState, useEffect } from "react"
import { ArrowLeft, CreditCard, Building2, Smartphone, Check, Shield, Zap, Crown, Lock, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Separator } from "../../components/ui/separator"
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group"
import { useRouter } from "../../components/Router"
import { Badge } from "../../components/ui/badge"
import { toast } from "sonner@2.0.3"
import { useAuth } from "../../contexts/AuthContext"
import { getSubscriptionPlans, type SubscriptionPlanListItem } from "../../services/subscription.api"
import { createPaymentRecord, createVnpayPayment } from "../../services/payment.api"

const paymentMethods = [
  {
    id: 'card',
    name: 'Thẻ tín dụng / Ghi nợ quốc tế',
    icon: CreditCard,
    description: 'Visa, Mastercard, JCB, Amex'
  },
  {
    id: 'momo',
    name: 'Ví điện tử MoMo',
    icon: Smartphone,
    description: 'Quét mã QR để thanh toán nhanh'
  },
  {
    id: 'bank',
    name: 'Chuyển khoản ngân hàng (QR)',
    icon: Building2,
    description: 'Hỗ trợ VietQR 24/7 tự động kích hoạt'
  }
]

const fallbackPlans: Record<string, { name: string; monthlyPrice: number; annualPrice: number; icon: React.ComponentType<any>; color: string; bg: string; features: string[] }> = {
  pro: {
    name: "Pro Member",
    monthlyPrice: 249000,
    annualPrice: 199000 * 12,
    icon: Zap,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    features: ["Truy cập không giới hạn", "Chứng chỉ hoàn thành", "Tải xuống tài liệu", "Full HD Video"]
  },
  premium: {
    name: "Premium Member",
    monthlyPrice: 599000,
    annualPrice: 499000 * 12,
    icon: Crown,
    color: "text-yellow-500",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    features: ["Tất cả quyền lợi Pro", "Mentor 1-1 hàng tháng", "Review dự án cá nhân", "Hỗ trợ ưu tiên"]
  }
}

// Icon map for API plan icon names
const iconMap: Record<string, React.ComponentType<any>> = { Zap, Crown, Shield }
const colorMap: Record<string, { color: string; bg: string }> = {
  blue: { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  yellow: { color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  purple: { color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
}

export function SubscriptionCheckoutPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [selectedPayment, setSelectedPayment] = useState('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [planId, setPlanId] = useState<string>('pro')
  const [interval, setInterval] = useState<string>('year')
  const [apiPlan, setApiPlan] = useState<SubscriptionPlanListItem | null>(null)

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0)
    
    const searchParams = new URLSearchParams(window.location.search)
    const p = searchParams.get('plan')
    const i = searchParams.get('interval')
    
    if (p) setPlanId(p)
    if (i && (i === 'month' || i === 'year')) {
      setInterval(i)
    }

    // Fetch plan from API
    getSubscriptionPlans().then(plans => {
      const match = plans.find(plan => String(plan.id) === p)
      if (match) setApiPlan(match)
    }).catch(() => {})
  }, [])

  // Build selectedPlan from API or fallback
  const selectedPlan = (() => {
    if (apiPlan) {
      const monthlyPrice = Number(apiPlan.price)
      const annualPerMonth = apiPlan.discount_price ? Number(apiPlan.discount_price) : monthlyPrice
      const colors = colorMap[apiPlan.highlight_color || ''] || colorMap.blue
      const IconComp = apiPlan.icon ? iconMap[apiPlan.icon] : Zap
      return {
        name: apiPlan.name,
        monthlyPrice,
        annualPrice: annualPerMonth * 12,
        icon: IconComp || Zap,
        color: colors.color,
        bg: colors.bg,
        features: apiPlan.features || [],
      }
    }
    return fallbackPlans[planId as keyof typeof fallbackPlans] || fallbackPlans.pro
  })()

  const price = interval === 'year' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice
  const monthlyEquivalent = interval === 'year' ? Math.round(selectedPlan.annualPrice / 12) : selectedPlan.monthlyPrice
  const savings = interval === 'year' ? (selectedPlan.monthlyPrice * 12) - selectedPlan.annualPrice : 0

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thanh toán")
      return
    }

    setIsProcessing(true)
    try {
      // Step 1: Create payment record for subscription
      const result = await createPaymentRecord({
        user_id: Number(user.id),
        payment_method: 'vnpay',
        payment_type: 'subscription',
        subscription_plan_id: apiPlan ? apiPlan.id : undefined,
        payment_details: [],
      })

      // Step 2: Create VNPay payment URL
      const totalAmount = Math.round(price)
      const vnpayRes = await createVnpayPayment({
        amount: totalAmount,
        order_id: String(result.payment.id),
        order_desc: `Subscription: ${selectedPlan.name} (${interval === 'year' ? 'Annual' : 'Monthly'})`,
      })

      // Step 3: Redirect to VNPay
      if (vnpayRes.payment_url) {
        window.location.href = vnpayRes.payment_url
      } else {
        toast.error('Failed to create payment URL')
        setIsProcessing(false)
      }
    } catch (err: any) {
      console.error('Subscription checkout failed:', err)
      toast.error(err?.message || 'Thanh toán thất bại. Vui lòng thử lại.')
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', '') + '₫'
  }

  const PlanIcon = selectedPlan.icon

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 lg:py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/pricing')} className="mb-6 pl-0 hover:pl-2 transition-all hover:bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại chọn gói
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN: Main Form */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Thanh toán an toàn</h1>
                <p className="text-muted-foreground">Hoàn tất đăng ký để mở khóa toàn bộ quyền lợi.</p>
              </div>

              {/* Step 1: Account Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">1</div>
                  <h3 className="font-semibold text-lg">Thông tin tài khoản</h3>
                </div>
                
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-600 dark:text-slate-400">
                        {user ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user ? user.name : 'Khách'}</p>
                        <p className="text-sm text-muted-foreground truncate">{user ? user.email : 'Chưa đăng nhập'}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto shrink-0">Đã đăng nhập</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step 2: Payment Method */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">2</div>
                  <h3 className="font-semibold text-lg">Phương thức thanh toán</h3>
                </div>

                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-6">
                    <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                      <div className="space-y-3">
                        {paymentMethods.map((method) => {
                          const IconComponent = method.icon
                          const isSelected = selectedPayment === method.id
                          return (
                            <div 
                              key={method.id} 
                              onClick={() => setSelectedPayment(method.id)}
                              className={`relative flex items-start space-x-4 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-blue-600' 
                                  : 'hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                              }`}
                            >
                              <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <IconComponent className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                                    <Label htmlFor={method.id} className="cursor-pointer font-semibold text-base">
                                        {method.name}
                                    </Label>
                                </div>
                                <p className="text-sm text-muted-foreground">{method.description}</p>
                              </div>
                              {method.id === 'card' && (
                                <div className="hidden sm:flex gap-1.5">
                                    <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                    <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </RadioGroup>

                    {selectedPayment === 'card' && (
                      <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>
                                Bạn sẽ được chuyển hướng đến cổng thanh toán VNPay để nhập thông tin thẻ an toàn.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                          <Lock className="w-3 h-3" />
                          Thông tin thanh toán được mã hóa an toàn SSL 256-bit.
                        </div>
                      </div>
                    )}
                    
                    {selectedPayment !== 'card' && (
                         <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex gap-3 animate-in fade-in">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>
                                Bạn sẽ được chuyển hướng đến cổng thanh toán của đối tác sau khi nhấn nút xác nhận.
                            </p>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* RIGHT COLUMN: Summary */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 space-y-6">
                <Card className="shadow-xl shadow-slate-200/50 dark:shadow-none border-blue-100 dark:border-slate-800 overflow-hidden">
                  <div className="bg-slate-900 text-white p-6">
                     <h3 className="font-bold text-lg mb-1">Tóm tắt đơn hàng</h3>
                     <p className="text-slate-400 text-sm">Xem lại thông tin gói trước khi thanh toán</p>
                  </div>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Plan Details */}
                    <div className="flex gap-4">
                      <div className={`h-14 w-14 rounded-xl ${selectedPlan.bg} flex items-center justify-center border shrink-0`}>
                        <PlanIcon className={`w-7 h-7 ${selectedPlan.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{selectedPlan.name}</h3>
                        <Badge variant="secondary" className="font-normal text-xs mt-1">
                          {interval === 'year' ? 'Thanh toán hàng năm' : 'Thanh toán hàng tháng'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 py-4 border-y border-dashed">
                       <div className="text-sm font-medium text-muted-foreground mb-2">Quyền lợi bao gồm:</div>
                      {selectedPlan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Price Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Giá gốc:</span>
                        <span className="font-medium">{formatCurrency(interval === 'year' ? selectedPlan.monthlyPrice * 12 : selectedPlan.monthlyPrice)}</span>
                      </div>
                      
                      {savings > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 dark:bg-green-900/10 p-2 rounded">
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Tiết kiệm được:</span>
                          <span>-{formatCurrency(savings)}</span>
                        </div>
                      )}
                      
                      <Separator className="my-2" />
                      
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-lg">Tổng thanh toán:</span>
                        <div className="text-right">
                          <span className="font-bold text-3xl text-blue-600 dark:text-blue-400">
                            {formatCurrency(price)}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {interval === 'year' ? `Tương đương ${formatCurrency(monthlyEquivalent)}/tháng` : 'Đã bao gồm thuế'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex-col gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 border-t">
                    <Button 
                      className="w-full h-14 text-lg font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all" 
                      onClick={handleCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                          <>
                             <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                             Đang xử lý...
                          </>
                      ) : (
                          <>
                            Thanh toán {formatCurrency(price)}
                          </>
                      )}
                    </Button>
                    
                    <div className="text-center space-y-2">
                        <p className="text-xs text-muted-foreground px-2">
                            Bằng việc xác nhận, bạn đồng ý với <a href="#" className="underline hover:text-blue-600">Điều khoản sử dụng</a> và cho phép chúng tôi gia hạn tự động gói cước này.
                        </p>
                        <div className="flex justify-center gap-2 opacity-50 pt-2">
                             {/* Mock Payment Icons */}
                             <div className="w-8 h-5 bg-slate-300 rounded"></div>
                             <div className="w-8 h-5 bg-slate-300 rounded"></div>
                             <div className="w-8 h-5 bg-slate-300 rounded"></div>
                        </div>
                    </div>
                  </CardFooter>
                </Card>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Đảm bảo hoàn tiền trong 7 ngày</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
