import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  Crown,
  Loader2,
  Lock,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardFooter } from "../../components/ui/card"
import { Label } from "../../components/ui/label"
import { Separator } from "../../components/ui/separator"
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group"
import { useRouter } from "../../components/Router"
import { Badge } from "../../components/ui/badge"
import { toast } from "sonner"
import { useAuth } from "../../contexts/AuthContext"
import { getSubscriptionPlans, type SubscriptionPlanListItem } from "../../services/subscription.api"
import { createPaymentRecord } from "../../services/payment.api"
import { motion } from "motion/react"

const iconMap: Record<string, React.ComponentType<any>> = { Zap, Crown, Shield }
const colorMap: Record<string, { color: string; bg: string }> = {
  blue: { color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
  yellow: { color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  purple: { color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
}

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function SubscriptionCheckoutPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [selectedPayment, setSelectedPayment] = useState("momo")
  const [isProcessing, setIsProcessing] = useState(false)
  const [planId, setPlanId] = useState<string>("pro")
  const [interval, setInterval] = useState<string>("year")
  const [apiPlan, setApiPlan] = useState<SubscriptionPlanListItem | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)

    const searchParams = new URLSearchParams(window.location.search)
    const p = searchParams.get("plan")
    const i = searchParams.get("interval")

    if (p) setPlanId(p)
    if (i && (i === "month" || i === "year")) {
      setInterval(i)
    }

    getSubscriptionPlans()
      .then((plans) => {
        const match = plans.find((plan) => String(plan.id) === p)
        if (match) setApiPlan(match)
      })
      .catch(() => {})
  }, [])

  const paymentMethods = [
    {
      id: "card",
      name: t("subscription_checkout_page.payment_methods.card_name"),
      icon: CreditCard,
      description: t("subscription_checkout_page.payment_methods.card_description"),
    },
    {
      id: "momo",
      name: t("subscription_checkout_page.payment_methods.momo_name"),
      icon: Smartphone,
      description: t("subscription_checkout_page.payment_methods.momo_description"),
    },
    {
      id: "bank",
      name: t("subscription_checkout_page.payment_methods.bank_name"),
      icon: Building2,
      description: t("subscription_checkout_page.payment_methods.bank_description"),
    },
  ]

  const fallbackPlans: Record<
    string,
    { name: string; monthlyPrice: number; annualPrice: number; icon: React.ComponentType<any>; color: string; bg: string; features: string[] }
  > = {
    pro: {
      name: t("subscription_checkout_page.fallback_plans.pro.name"),
      monthlyPrice: 249000,
      annualPrice: 199000 * 12,
      icon: Zap,
      color: "text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      features: [
        t("subscription_checkout_page.fallback_plans.pro.features.unlimited_access"),
        t("subscription_checkout_page.fallback_plans.pro.features.certificates"),
        t("subscription_checkout_page.fallback_plans.pro.features.downloads"),
        t("subscription_checkout_page.fallback_plans.pro.features.full_hd_video"),
      ],
    },
    premium: {
      name: t("subscription_checkout_page.fallback_plans.premium.name"),
      monthlyPrice: 599000,
      annualPrice: 499000 * 12,
      icon: Crown,
      color: "text-yellow-500",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      features: [
        t("subscription_checkout_page.fallback_plans.premium.features.all_pro_features"),
        t("subscription_checkout_page.fallback_plans.premium.features.monthly_mentor"),
        t("subscription_checkout_page.fallback_plans.premium.features.project_review"),
        t("subscription_checkout_page.fallback_plans.premium.features.priority_support"),
      ],
    },
  }

  const selectedPlan = (() => {
    if (apiPlan) {
      const monthlyPrice = Number(apiPlan.effective_price || apiPlan.discount_price || apiPlan.price)
      const yearlyDiscountPercent = Number(apiPlan.yearly_discount_percent || 0)
      const annualPrice = Math.round(monthlyPrice * 12 * (1 - yearlyDiscountPercent / 100))
      const colors = colorMap[apiPlan.highlight_color || ""] || colorMap.blue
      const IconComp = apiPlan.icon ? iconMap[apiPlan.icon] : Zap
      return {
        name: apiPlan.name,
        monthlyPrice,
        annualPrice,
        icon: IconComp || Zap,
        color: colors.color,
        bg: colors.bg,
        features: apiPlan.features || [],
      }
    }
    return fallbackPlans[planId as keyof typeof fallbackPlans] || fallbackPlans.pro
  })()

  const price = interval === "year" ? selectedPlan.annualPrice : selectedPlan.monthlyPrice
  const monthlyEquivalent = interval === "year" ? Math.round(selectedPlan.annualPrice / 12) : selectedPlan.monthlyPrice
  const savings = interval === "year" ? selectedPlan.monthlyPrice * 12 - selectedPlan.annualPrice : 0

  const handleCheckout = async () => {
    if (!user) {
      toast.error(t("subscription_checkout_page.login_required"))
      return
    }

    setIsProcessing(true)
    try {
      const gatewayMethod = selectedPayment === "card" ? "vnpay" : "momo"

      const result = await createPaymentRecord({
        user_id: Number(user.id),
        payment_method: gatewayMethod,
        payment_type: "subscription",
        billing_cycle: interval === "year" ? "yearly" : "monthly",
        subscription_plan_id: apiPlan ? apiPlan.id : undefined,
        payment_details: [],
      })

      if (gatewayMethod === "momo") {
        if (result.gateway_payment?.url) {
          window.location.href = result.gateway_payment.url
          return
        }
        toast.error(t("subscription_checkout_page.create_momo_url_failed"))
        setIsProcessing(false)
        return
      }

      if (result.gateway_payment?.url) {
        window.location.href = result.gateway_payment.url
      } else {
        toast.error(t("subscription_checkout_page.create_payment_url_failed"))
        setIsProcessing(false)
      }
    } catch (err: any) {
      console.error("Subscription checkout failed:", err)
      toast.error(err?.message || t("subscription_checkout_page.checkout_failed"))
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount).replace("₫", "") + "₫"

  const PlanIcon = selectedPlan.icon

  return (
    <motion.div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 lg:py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeInUp} initial="hidden" animate="show">
          <Button
            variant="ghost"
            onClick={() => navigate("/pricing")}
            className="mb-6 w-full justify-start pl-0 transition-all hover:bg-transparent hover:pl-2 sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("subscription_checkout_page.back_to_pricing")}
          </Button>
          </motion.div>

          <motion.div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12" variants={sectionStagger} initial="hidden" animate="show">
            <motion.div className="lg:col-span-7 space-y-8" variants={fadeInUp}>
              <motion.div variants={fadeInUp}>
                <h1 className="text-3xl font-bold mb-2">{t("subscription_checkout_page.title")}</h1>
                <p className="text-muted-foreground">{t("subscription_checkout_page.subtitle")}</p>
              </motion.div>

              <motion.div className="space-y-4" variants={fadeInUp}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                    1
                  </div>
                  <h3 className="font-semibold text-lg">{t("subscription_checkout_page.account_info_title")}</h3>
                </div>

                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-600 dark:text-slate-400">
                        {user ? user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user ? user.name : t("subscription_checkout_page.guest_name")}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user ? user.email : t("subscription_checkout_page.not_logged_in")}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 sm:ml-auto">
                        {t("subscription_checkout_page.logged_in_badge")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div className="space-y-4" variants={fadeInUp}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                    2
                  </div>
                  <h3 className="font-semibold text-lg">{t("subscription_checkout_page.payment_method_title")}</h3>
                </div>

                <Card>
                  <CardContent className="p-4 sm:p-6 space-y-6">
                    <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                      <div className="space-y-3">
                        {paymentMethods.map((method, index) => {
                          const IconComponent = method.icon
                          const isSelected = selectedPayment === method.id
                          return (
                            <motion.div
                              key={method.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.22, delay: index * 0.04, ease: 'easeOut' }}
                              whileHover={{ y: -1 }}
                              onClick={() => setSelectedPayment(method.id)}
                              className={`relative flex items-start gap-3 rounded-xl border p-3 transition-all duration-200 cursor-pointer sm:gap-4 sm:p-4 ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-blue-600"
                                  : "hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900"
                              }`}
                            >
                              <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <IconComponent className={`w-5 h-5 ${isSelected ? "text-blue-600" : "text-slate-500"}`} />
                                  <Label htmlFor={method.id} className="cursor-pointer font-semibold text-sm sm:text-base">
                                    {method.name}
                                  </Label>
                                </div>
                                <p className="text-xs text-muted-foreground sm:text-sm">{method.description}</p>
                              </div>
                              {method.id === "card" && (
                                <div className="hidden sm:flex gap-1.5">
                                  <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                  <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    </RadioGroup>

                    {selectedPayment === "card" && (
                      <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <p>{t("subscription_checkout_page.card_redirect_notice")}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                          <Lock className="w-3 h-3" />
                          {t("subscription_checkout_page.card_security_notice")}
                        </div>
                      </div>
                    )}

                    {selectedPayment !== "card" && (
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-start gap-3 animate-in fade-in">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{t("subscription_checkout_page.partner_redirect_notice")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div className="lg:col-span-5" variants={fadeInUp}>
              <motion.div className="space-y-6 lg:sticky lg:top-24" variants={fadeInUp}>
                <Card className="shadow-xl shadow-slate-200/50 dark:shadow-none border-blue-100 dark:border-slate-800 overflow-hidden">
                  <div className="bg-slate-900 p-4 text-white sm:p-6">
                    <h3 className="font-bold text-lg mb-1">{t("subscription_checkout_page.summary_title")}</h3>
                    <p className="text-slate-400 text-sm">{t("subscription_checkout_page.summary_description")}</p>
                  </div>

                  <CardContent className="space-y-6 p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className={`h-14 w-14 rounded-xl ${selectedPlan.bg} flex items-center justify-center border shrink-0`}>
                        <PlanIcon className={`w-7 h-7 ${selectedPlan.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg">{selectedPlan.name}</h3>
                        <Badge variant="secondary" className="font-normal text-xs mt-1">
                          {interval === "year"
                            ? t("subscription_checkout_page.billing_yearly")
                            : t("subscription_checkout_page.billing_monthly")}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 py-4 border-y border-dashed">
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        {t("subscription_checkout_page.features_title")}
                      </div>
                      {selectedPlan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("subscription_checkout_page.original_price_label")}</span>
                        <span className="font-medium">
                          {formatCurrency(interval === "year" ? selectedPlan.monthlyPrice * 12 : selectedPlan.monthlyPrice)}
                        </span>
                      </div>

                      {savings > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 dark:bg-green-900/10 p-2 rounded">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {t("subscription_checkout_page.savings_label")}
                          </span>
                          <span>-{formatCurrency(savings)}</span>
                        </div>
                      )}

                      <Separator className="my-2" />

                      <div className="flex justify-between items-end">
                        <span className="font-bold text-lg">{t("subscription_checkout_page.total_label")}</span>
                        <div className="text-right">
                          <span className="font-bold text-3xl text-blue-600 dark:text-blue-400">{formatCurrency(price)}</span>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
                            {interval === "year"
                              ? t("subscription_checkout_page.monthly_equivalent", {
                                  amount: formatCurrency(monthlyEquivalent),
                                })
                              : t("subscription_checkout_page.tax_included")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex-col gap-4 border-t bg-slate-50 p-4 dark:bg-slate-900/50 sm:p-6">
                    <Button
                      className="w-full h-14 text-lg font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
                      onClick={handleCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t("subscription_checkout_page.processing")}
                        </>
                      ) : (
                        t("subscription_checkout_page.pay_button", { amount: formatCurrency(price) })
                      )}
                    </Button>

                    <div className="text-center space-y-2">
                      <p className="text-xs text-muted-foreground px-2">
                        {t("subscription_checkout_page.terms_prefix")}{" "}
                        <a href="#" className="underline hover:text-blue-600">
                          {t("footer.terms")}
                        </a>{" "}
                        {t("subscription_checkout_page.terms_suffix")}
                      </p>
                      <div className="flex justify-center gap-2 opacity-50 pt-2">
                        <div className="w-8 h-5 bg-slate-300 rounded"></div>
                        <div className="w-8 h-5 bg-slate-300 rounded"></div>
                        <div className="w-8 h-5 bg-slate-300 rounded"></div>
                      </div>
                    </div>
                  </CardFooter>
                </Card>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{t("subscription_checkout_page.refund_guarantee")}</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
