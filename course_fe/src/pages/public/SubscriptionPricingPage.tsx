import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, Crown, HelpCircle, Minus, Shield, Star, X, Zap } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card"
import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { getSubscriptionPlans, type SubscriptionPlanListItem } from "../../services/subscription.api"

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

interface ComparisonRow {
  name: string
  basic: boolean | string
  pro: boolean | string
  premium: boolean | string
}

interface ComparisonSection {
  category: string
  rows: ComparisonRow[]
}

export function SubscriptionPricingPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user } = useAuth()
  const [isAnnual, setIsAnnual] = useState(true)
  const [apiPlans, setApiPlans] = useState<SubscriptionPlanListItem[]>([])

  useEffect(() => {
    getSubscriptionPlans().then(setApiPlans).catch(() => {})
  }, [])

  const iconMap: Record<string, ComponentType<any>> = { Zap, Crown, Shield }

  const formatCurrency = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)} VND`

  const defaultPlans: DisplayPlan[] = [
    {
      id: 'basic',
      name: t('subscription_pricing_page.plans.basic.name'),
      description: t('subscription_pricing_page.plans.basic.description'),
      price: 0,
      period: t('subscription_pricing_page.forever'),
      features: [
        t('subscription_pricing_page.plans.basic.features.0'),
        t('subscription_pricing_page.plans.basic.features.1'),
        t('subscription_pricing_page.plans.basic.features.2'),
        t('subscription_pricing_page.plans.basic.features.3'),
      ],
      notIncluded: [
        t('subscription_pricing_page.plans.basic.not_included.0'),
        t('subscription_pricing_page.plans.basic.not_included.1'),
        t('subscription_pricing_page.plans.basic.not_included.2'),
        t('subscription_pricing_page.plans.basic.not_included.3'),
        t('subscription_pricing_page.plans.basic.not_included.4'),
        t('subscription_pricing_page.plans.basic.not_included.5'),
      ],
      buttonText: user
        ? t('subscription_pricing_page.plan_actions.current_plan')
        : t('subscription_pricing_page.plan_actions.free_signup'),
      buttonVariant: 'outline',
      popular: false,
      disabled: !!user,
    },
    {
      id: 'pro',
      name: t('subscription_pricing_page.plans.pro.name'),
      description: t('subscription_pricing_page.plans.pro.description'),
      price: isAnnual ? 199000 : 249000,
      period: t('subscription_pricing_page.per_month'),
      billingText: isAnnual
        ? t('subscription_pricing_page.billing.annual', { amount: formatCurrency(2388000) })
        : t('subscription_pricing_page.billing.monthly'),
      features: [
        t('subscription_pricing_page.plans.pro.features.0'),
        t('subscription_pricing_page.plans.pro.features.1'),
        t('subscription_pricing_page.plans.pro.features.2'),
        t('subscription_pricing_page.plans.pro.features.3'),
        t('subscription_pricing_page.plans.pro.features.4'),
        t('subscription_pricing_page.plans.pro.features.5'),
      ],
      notIncluded: [
        t('subscription_pricing_page.plans.pro.not_included.0'),
        t('subscription_pricing_page.plans.pro.not_included.1'),
      ],
      buttonText: t('subscription_pricing_page.plan_actions.upgrade_pro'),
      buttonVariant: 'default',
      popular: true,
      saveText: isAnnual ? t('subscription_pricing_page.savings', { percent: 20 }) : null,
      highlightColor: 'blue',
    },
    {
      id: 'premium',
      name: t('subscription_pricing_page.plans.premium.name'),
      description: t('subscription_pricing_page.plans.premium.description'),
      price: isAnnual ? 499000 : 599000,
      period: t('subscription_pricing_page.per_month'),
      billingText: isAnnual
        ? t('subscription_pricing_page.billing.annual', { amount: formatCurrency(5988000) })
        : t('subscription_pricing_page.billing.monthly'),
      features: [
        t('subscription_pricing_page.plans.premium.features.0'),
        t('subscription_pricing_page.plans.premium.features.1'),
        t('subscription_pricing_page.plans.premium.features.2'),
        t('subscription_pricing_page.plans.premium.features.3'),
        t('subscription_pricing_page.plans.premium.features.4'),
        t('subscription_pricing_page.plans.premium.features.5'),
      ],
      notIncluded: [],
      buttonText: t('subscription_pricing_page.plan_actions.become_premium'),
      buttonVariant: 'outline',
      popular: false,
      highlightColor: 'yellow',
    },
  ]

  const plans: DisplayPlan[] =
    apiPlans.length > 0
      ? apiPlans.map((plan) => {
          const price = Number(plan.price)
          const discountPrice = plan.discount_price ? Number(plan.discount_price) : null
          const isFree = price === 0 && !discountPrice
          const monthlyPrice = price
          const annualPerMonth = discountPrice ?? price
          const displayPrice = isFree ? 0 : isAnnual ? annualPerMonth : monthlyPrice
          const hasDiscount = discountPrice !== null && discountPrice < price

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
      : defaultPlans

  const comparisonData: ComparisonSection[] = [
    {
      category: t('subscription_pricing_page.comparison.content.category'),
      rows: [
        {
          name: t('subscription_pricing_page.comparison.content.rows.course_access.name'),
          basic: t('subscription_pricing_page.comparison.content.rows.course_access.basic'),
          pro: t('subscription_pricing_page.comparison.content.rows.course_access.pro'),
          premium: t('subscription_pricing_page.comparison.content.rows.course_access.premium'),
        },
        {
          name: t('subscription_pricing_page.comparison.content.rows.video_quality.name'),
          basic: t('subscription_pricing_page.comparison.content.rows.video_quality.basic'),
          pro: t('subscription_pricing_page.comparison.content.rows.video_quality.pro'),
          premium: t('subscription_pricing_page.comparison.content.rows.video_quality.premium'),
        },
        {
          name: t('subscription_pricing_page.comparison.content.rows.downloads.name'),
          basic: false,
          pro: true,
          premium: true,
        },
        {
          name: t('subscription_pricing_page.comparison.content.rows.offline.name'),
          basic: false,
          pro: true,
          premium: true,
        },
        {
          name: t('subscription_pricing_page.comparison.content.rows.quizzes.name'),
          basic: t('subscription_pricing_page.comparison.content.rows.quizzes.basic'),
          pro: t('subscription_pricing_page.comparison.content.rows.quizzes.pro'),
          premium: t('subscription_pricing_page.comparison.content.rows.quizzes.premium'),
        },
      ],
    },
    {
      category: t('subscription_pricing_page.comparison.tools.category'),
      rows: [
        {
          name: t('subscription_pricing_page.comparison.tools.rows.certificate.name'),
          basic: false,
          pro: true,
          premium: true,
        },
        {
          name: t('subscription_pricing_page.comparison.tools.rows.ai_assistant.name'),
          basic: false,
          pro: true,
          premium: true,
        },
        {
          name: t('subscription_pricing_page.comparison.tools.rows.notes.name'),
          basic: true,
          pro: true,
          premium: true,
        },
        {
          name: t('subscription_pricing_page.comparison.tools.rows.no_ads.name'),
          basic: false,
          pro: true,
          premium: true,
        },
      ],
    },
    {
      category: t('subscription_pricing_page.comparison.support.category'),
      rows: [
        {
          name: t('subscription_pricing_page.comparison.support.rows.qna.name'),
          basic: t('subscription_pricing_page.comparison.support.rows.qna.basic'),
          pro: t('subscription_pricing_page.comparison.support.rows.qna.pro'),
          premium: t('subscription_pricing_page.comparison.support.rows.qna.premium'),
        },
        {
          name: t('subscription_pricing_page.comparison.support.rows.mentor.name'),
          basic: false,
          pro: false,
          premium: t('subscription_pricing_page.comparison.support.rows.mentor.premium'),
        },
        {
          name: t('subscription_pricing_page.comparison.support.rows.cv_review.name'),
          basic: false,
          pro: false,
          premium: true,
        },
        {
          name: t('subscription_pricing_page.comparison.support.rows.career_support.name'),
          basic: false,
          pro: false,
          premium: t('subscription_pricing_page.comparison.support.rows.career_support.premium'),
        },
      ],
    },
  ]

  const faqs = [0, 1, 2, 3].map((index) => ({
    question: t(`subscription_pricing_page.faq.${index}.q`),
    answer: t(`subscription_pricing_page.faq.${index}.a`),
  }))

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

  const renderCheck = (value: boolean | string) => {
    if (typeof value === 'string') return <span className="text-sm font-medium">{value}</span>
    if (value === true) return <Check className="mx-auto h-5 w-5 text-green-500" />
    return <Minus className="mx-auto h-5 w-5 text-slate-300" />
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative overflow-hidden bg-slate-950 pb-56 pt-16 text-white lg:pt-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-blue-600 blur-3xl mix-blend-screen" />
          <div
            className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-600 blur-3xl mix-blend-screen"
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className="relative container mx-auto px-4 text-center z-10">
          <Badge
            variant="secondary"
            className="mb-6 border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-200 backdrop-blur-sm transition-all hover:bg-blue-500/20"
          >
            <Star className="mr-2 h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {t('subscription_pricing_page.hero.badge')}
          </Badge>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            {t('subscription_pricing_page.hero.title_line_1')}
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {t('subscription_pricing_page.hero.title_line_2')}
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
            {t('subscription_pricing_page.hero.description')}
          </p>

          <div className="inline-flex items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/50 p-1.5 shadow-xl backdrop-blur-md">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-6 py-2 text-sm font-medium transition-all duration-300 ${
                !isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('subscription_pricing_page.billing_toggle.monthly')}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-all duration-300 ${
                isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('subscription_pricing_page.billing_toggle.annual')}
              <Badge
                variant="secondary"
                className="h-4 border-none bg-green-500 px-1.5 py-0 text-[10px] text-white shadow-none"
              >
                -20%
              </Badge>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto relative z-20 mb-12 -mt-32 flex-1 px-4 pb-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex h-full flex-col transition-all duration-300 ${
                plan.popular
                  ? 'z-10 -mt-8 scale-105 border-blue-500 bg-white shadow-2xl shadow-blue-500/10 ring-4 ring-blue-500/10 dark:bg-slate-900'
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
                <CardTitle className="flex items-center gap-3 text-2xl">
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
                    <span className="text-4xl font-bold tracking-tight">
                      {plan.price === 0 ? t('subscription_pricing_page.free') : new Intl.NumberFormat('vi-VN').format(plan.price)}
                    </span>
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
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">{t('subscription_pricing_page.comparison.title')}</h2>
          <p className="text-muted-foreground">{t('subscription_pricing_page.comparison.description')}</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-800">
          <table className="w-full border-collapse bg-white text-left dark:bg-slate-900">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="w-1/3 p-4 text-lg font-semibold md:p-6">
                  {t('subscription_pricing_page.comparison.headers.feature')}
                </th>
                <th className="p-4 text-center font-semibold text-slate-600 dark:text-slate-400 md:p-6">
                  {t('subscription_pricing_page.plans.basic.name')}
                </th>
                <th className="bg-blue-50/50 p-4 text-center font-bold text-blue-600 dark:bg-blue-900/10 dark:text-blue-400 md:p-6">
                  {t('subscription_pricing_page.plans.pro.name')}
                </th>
                <th className="p-4 text-center font-bold text-yellow-600 dark:text-yellow-400 md:p-6">
                  {t('subscription_pricing_page.plans.premium.name')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {comparisonData.flatMap((section, sectionIndex) => [
                <tr key={`category-${sectionIndex}`} className="bg-slate-50/50 dark:bg-slate-900/50">
                  <td
                    colSpan={4}
                    className="p-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:px-6"
                  >
                    {section.category}
                  </td>
                </tr>,
                ...section.rows.map((row, rowIndex) => (
                  <tr
                    key={`row-${sectionIndex}-${rowIndex}`}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="border-r border-dashed border-slate-100 p-4 font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300 md:px-6">
                      {row.name}
                    </td>
                    <td className="border-r border-dashed border-slate-100 p-4 text-center text-slate-500 dark:border-slate-800">
                      {renderCheck(row.basic)}
                    </td>
                    <td className="border-r border-dashed border-blue-100 bg-blue-50/10 p-4 text-center font-medium dark:border-blue-900/30 dark:bg-blue-900/5">
                      {renderCheck(row.pro)}
                    </td>
                    <td className="p-4 text-center font-medium">{renderCheck(row.premium)}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-y bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-10 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t('subscription_pricing_page.trust.title')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale transition-all duration-700 hover:grayscale-0 md:gap-20">
            <h3 className="text-2xl font-black tracking-tighter text-slate-800 dark:text-slate-200">
              ACME<span className="text-blue-600">.corp</span>
            </h3>
            <h3 className="flex items-center gap-1 text-2xl font-bold tracking-tight text-slate-700 dark:text-slate-300">
              <div className="h-6 w-6 rounded-md bg-slate-700 dark:bg-slate-300" />
              StarkInd
            </h3>
            <h3 className="text-2xl italic font-light text-slate-800 dark:text-slate-200">
              Wayne<span className="font-bold not-italic">Tech</span>
            </h3>
            <h3 className="text-2xl font-bold tracking-tighter text-slate-800 dark:text-slate-200">
              Cyber<span className="text-green-500">Dyne</span>
            </h3>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-24">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t('subscription_pricing_page.faq_title')}</h2>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            {t('subscription_pricing_page.faq_description')}
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="rounded-lg border bg-card px-4 shadow-sm">
              <AccordionTrigger className="py-4 text-left font-medium transition-colors hover:text-blue-600">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-4 leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md dark:bg-slate-700">
              <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{t('subscription_pricing_page.support.title')}</h3>
            <p className="mb-6 max-w-sm text-muted-foreground">{t('subscription_pricing_page.support.description')}</p>
            <div className="flex gap-4">
              <Button variant="outline" className="bg-white dark:bg-slate-800">
                {t('subscription_pricing_page.support.email')}
              </Button>
              <Button>{t('subscription_pricing_page.support.chat')}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
