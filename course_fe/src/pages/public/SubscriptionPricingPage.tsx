import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowRight, Check, Crown, HelpCircle, Loader2, RefreshCw, Shield, Star, X, Zap } from 'lucide-react'
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { getSubscriptionPlans, type SubscriptionPlanListItem } from "../../services/subscription.api"
import { motion } from 'motion/react'

type HighlightColor = 'blue' | 'yellow' | undefined

interface DisplayPlan {
  id: string
  name: string
  description: string
  price: number
  period: string
  billingText?: string
  features: string[]
  notIncluded: string[]
  buttonText: string
  buttonVariant: 'default' | 'outline'
  popular: boolean
  disabled: boolean
  saveText?: string | null
  highlightColor?: HighlightColor
  icon?: string
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
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function SubscriptionPricingPage() {
  const { t } = useTranslation()
  const { navigate, currentRoute } = useRouter()
  const { user } = useAuth()
  const [isAnnual, setIsAnnual] = useState(true)
  const [apiPlans, setApiPlans] = useState<SubscriptionPlanListItem[]>([])
  const [plansLoaded, setPlansLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadPlans() {
      try {
        const plans = await getSubscriptionPlans()
        if (!cancelled) {
          setApiPlans(Array.isArray(plans) ? plans : [])
          setLoadError(false)
          setPlansLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setApiPlans([])
          setLoadError(true)
          setPlansLoaded(true)
        }
      }
    }

    setPlansLoaded(false)
    loadPlans()
    return () => {
      cancelled = true
    }
  }, [currentRoute, reloadKey])

  useEffect(() => {

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  const iconMap: Record<string, ComponentType<any>> = { Zap, Crown, Shield }

  const formatCurrency = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)} VND`

  const plans: DisplayPlan[] = apiPlans.map((plan) => {
          const price = Number(plan.price)
          const discountPrice = plan.discount_price ? Number(plan.discount_price) : null
          const isFree = price === 0 && !discountPrice
          const monthlyPrice = price
          const explicitYearlyPrice = Number(plan.yearly_price || 0)
          const yearlyDiscountPercent = Number(plan.yearly_discount_percent || 0)
          const annualPerMonth = explicitYearlyPrice > 0
            ? Math.round(explicitYearlyPrice / 12)
            : yearlyDiscountPercent > 0
              ? Math.round(price * (1 - yearlyDiscountPercent / 100))
              : discountPrice ?? price
          const displayPrice = isFree ? 0 : isAnnual ? annualPerMonth : monthlyPrice
          const hasDiscount = annualPerMonth < monthlyPrice

          return {
            id: String(plan.id),
            name: plan.name,
            description: plan.description || '',
            price: displayPrice,
            period: isFree ? t('subscription_pricing_page.forever') : t('subscription_pricing_page.per_month'),
            billingText: isFree
              ? undefined
              : isAnnual && hasDiscount
                ? t('subscription_pricing_page.billing.annual', {
                    amount: formatCurrency(annualPerMonth * 12),
                  })
                : t('subscription_pricing_page.billing.monthly'),
            features: plan.features || [],
            notIncluded: plan.not_included || [],
            buttonText: isFree
              ? user
                ? t('subscription_pricing_page.plan_actions.current_plan')
                : t('subscription_pricing_page.plan_actions.free_signup')
              : plan.badge_text || t('subscription_pricing_page.plan_actions.upgrade_named', { name: plan.name }),
            buttonVariant: (plan.is_featured ? 'default' : 'outline') as 'default' | 'outline',
            popular: plan.is_featured,
            disabled: isFree && !!user,
            saveText:
              isAnnual && hasDiscount
                ? t('subscription_pricing_page.savings', {
                    percent: Math.round((1 - annualPerMonth / monthlyPrice) * 100),
                  })
                : null,
            highlightColor: (plan.highlight_color as HighlightColor) || undefined,
            icon: plan.icon || undefined,
          }
        })

  const handleSubscribe = (planId: string) => {
    const plan = plans.find((item) => item.id === planId)
    if (plan && plan.price === 0) {
      if (!user) navigate('/signup')
      return
    }

    if (!user) {
      navigate('/login')
      return
    }

    navigate(`/checkout/subscription?plan=${planId}&interval=${isAnnual ? 'year' : 'month'}`)
  }

  const getPlanIcon = (plan: DisplayPlan) => {
    if (plan.icon && iconMap[plan.icon]) {
      const IconComp = iconMap[plan.icon]
      return <IconComp className="h-6 w-6" />
    }
    if (plan.id === 'basic') return <Shield className="h-6 w-6" />
    if (plan.id === 'pro') return <Zap className="h-6 w-6" />
    if (plan.id === 'premium') return <Crown className="h-6 w-6" />
    return <Shield className="h-6 w-6" />
  }

  const getPlanFeatureIntro = (plan: DisplayPlan) => {
    if (plan.price === 0) return t('subscription_pricing_page.card.basic_features')
    if (plan.highlightColor === 'yellow') return t('subscription_pricing_page.card.pro_plus')
    return t('subscription_pricing_page.card.includes')
  }

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative overflow-hidden bg-slate-950 pb-56 pt-16 text-white lg:pt-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-blue-600 blur-3xl mix-blend-screen" />
          <div
            className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-600 blur-3xl mix-blend-screen"
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className="relative container mx-auto px-4 text-center z-10">
          <motion.div variants={fadeInUp} initial="hidden" animate="show">
          <Badge
            variant="secondary"
            className="mb-6 border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-200 backdrop-blur-sm transition-all hover:bg-blue-500/20"
          >
            <Star className="mr-2 h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {t('subscription_pricing_page.hero.badge')}
          </Badge>
          </motion.div>

          <motion.h1
            className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-6xl"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
          >
            {t('subscription_pricing_page.hero.title_line_1')}
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {t('subscription_pricing_page.hero.title_line_2')}
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg md:text-xl"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.06, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            {t('subscription_pricing_page.hero.description')}
          </motion.p>

          <motion.div
            className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-slate-700/50 bg-slate-800/50 p-1.5 shadow-xl backdrop-blur-md"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.1, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-300 sm:px-6 sm:text-sm ${
                !isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('subscription_pricing_page.billing_toggle.monthly')}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all duration-300 sm:px-6 sm:text-sm ${
                isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('subscription_pricing_page.billing_toggle.annual')}
            </button>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto relative z-20 mb-12 -mt-32 flex-1 px-4 pb-24">
        {!plansLoaded ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-slate-300">{t('subscription_pricing_page.states.loading', 'Đang tải gói đăng ký...')}</p>
          </div>
        ) : loadError ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/30 bg-slate-900/60 px-6 py-16 text-center backdrop-blur">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <div>
              <p className="text-lg font-semibold text-white">{t('subscription_pricing_page.states.error_title', 'Không tải được danh sách gói')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('subscription_pricing_page.states.error_description', 'Đã xảy ra lỗi khi tải gói đăng ký. Vui lòng thử lại.')}</p>
            </div>
            <Button onClick={() => setReloadKey((k) => k + 1)} className="bg-blue-600 text-white hover:bg-blue-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('subscription_pricing_page.states.retry', 'Thử lại')}
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/60 px-6 py-16 text-center backdrop-blur">
            <AlertCircle className="h-10 w-10 text-slate-400" />
            <p className="text-lg font-semibold text-white">{t('subscription_pricing_page.states.empty_title', 'Chưa có gói đăng ký')}</p>
            <p className="text-sm text-slate-400">{t('subscription_pricing_page.states.empty_description', 'Hiện chưa có gói đăng ký nào khả dụng.')}</p>
          </div>
        ) : (
        <motion.div
          className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 md:grid-cols-3"
          variants={sectionStagger}
          initial="hidden"
          animate="show"
        >
          {plans.map((plan) => (
            <motion.div key={plan.id} variants={fadeInUp} whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
            <Card
              className={`relative flex h-full flex-col transition-all duration-300 ${
                plan.popular
                  ? 'z-10 border-blue-500 bg-white shadow-2xl shadow-blue-500/10 ring-4 ring-blue-500/10 md:-mt-8 md:scale-105 dark:bg-slate-900'
                  : 'bg-white/95 backdrop-blur-sm hover:-translate-y-2 hover:shadow-xl dark:bg-slate-900/95'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-sm font-bold text-white shadow-lg">
                  <Crown className="h-3.5 w-3.5 fill-current" />
                  {t('subscription_pricing_page.card.recommended')}
                </div>
              )}

              <CardHeader className={`pb-4 ${plan.popular ? 'pt-8' : ''}`}>
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                  <div
                    className={`rounded-lg p-2 ${
                      plan.highlightColor === 'blue'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : plan.highlightColor === 'yellow'
                          ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {getPlanIcon(plan)}
                  </div>
                  {plan.name}
                </CardTitle>
                <CardDescription className="min-h-[40px] pt-2 text-base">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col pb-4">
                <div className="mb-6 border-b border-dashed pb-6">
                  <div className="flex items-baseline">
                    <motion.span
                      key={`${plan.id}-${plan.price}-${isAnnual ? 'annual' : 'monthly'}`}
                      className="text-4xl font-bold tracking-tight"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      {plan.price === 0 ? t('subscription_pricing_page.free') : new Intl.NumberFormat('vi-VN').format(plan.price)}
                    </motion.span>
                    {plan.price !== 0 && <span className="ml-1 text-xl font-bold text-muted-foreground">VND</span>}
                    <span className="ml-2 text-sm font-medium text-muted-foreground">{plan.period}</span>
                  </div>

                  {plan.billingText && <p className="mt-2 text-sm text-muted-foreground">{plan.billingText}</p>}

                  {plan.saveText && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      <Zap className="h-3 w-3 fill-current" />
                      {plan.saveText}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col space-y-4 min-h-[280px]">
                  <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    {getPlanFeatureIntro(plan)}
                  </p>

                  {plan.features.map((feature, index) => (
                    <div key={`${plan.id}-feature-${index}`} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 rounded-full bg-blue-50 p-1 dark:bg-blue-900/20">
                        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                    </div>
                  ))}

                  {plan.notIncluded.map((feature, index) => (
                    <div key={`${plan.id}-excluded-${index}`} className="flex items-start gap-3 text-muted-foreground/60">
                      <div className="mt-0.5 flex-shrink-0 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                        <X className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="mt-auto px-6 pb-6 pt-2">
                <Button
                  className={`h-12 w-full rounded-xl text-base font-bold shadow-md transition-all duration-300 active:scale-95 ${
                    plan.popular
                      ? 'border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:-translate-y-1 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/40'
                      : plan.highlightColor === 'yellow'
                        ? 'border-0 bg-slate-900 !text-white hover:-translate-y-1 hover:bg-slate-800 dark:bg-slate-50 dark:!text-slate-900 dark:hover:bg-slate-200'
                        : 'border-2 border-slate-200 bg-transparent text-slate-600 hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-blue-400 dark:hover:text-blue-400'
                  }`}
                  variant={plan.highlightColor === 'yellow' ? 'default' : plan.buttonVariant}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={plan.disabled}
                >
                  {plan.buttonText}
                  {!plan.disabled && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </Card>
            </motion.div>
          ))}
        </motion.div>
        )}
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-24">
        <motion.div className="text-center" variants={fadeInUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <div className="inline-flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md dark:bg-slate-700">
              <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{t('subscription_pricing_page.support.title')}</h3>
            <p className="mb-6 max-w-sm text-muted-foreground">{t('subscription_pricing_page.support.description')}</p>
            <div className="hidden flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
              <Button variant="outline" className="w-full bg-white dark:bg-slate-800 sm:w-auto">
                {t('subscription_pricing_page.support.email')}
              </Button>
              <Button className="w-full sm:w-auto">{t('subscription_pricing_page.support.chat')}</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
