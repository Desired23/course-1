import { ArrowRight, Award, CheckCircle, TrendingUp, Users } from "lucide-react"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { listItemTransition } from "../../lib/motion"
import { getPublicStats, type PublicStats } from "../../services/course.api"

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K+`
  return `${n}+`
}

const features = [
  {
    titleKey: "business_page.features.fresh_content.title",
    descriptionKey: "business_page.features.fresh_content.description",
    icon: TrendingUp,
  },
  {
    titleKey: "business_page.features.hands_on.title",
    descriptionKey: "business_page.features.hands_on.description",
    icon: Users,
  },
  {
    titleKey: "business_page.features.trusted.title",
    descriptionKey: "business_page.features.trusted.description",
    icon: Award,
  },
]

const growthItems = [
  {
    titleKey: "business_page.growth.learning_paths.title",
    descriptionKey: "business_page.growth.learning_paths.description",
  },
  {
    titleKey: "business_page.growth.analytics.title",
    descriptionKey: "business_page.growth.analytics.description",
  },
  {
    titleKey: "business_page.growth.integration.title",
    descriptionKey: "business_page.growth.integration.description",
  },
]

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
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function UtcBusinessPage() {
  const { t } = useTranslation()
  const [apiStats, setApiStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let cancelled = false
    getPublicStats()
      .then((data) => {
        if (!cancelled) setApiStats(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const stats = [
    { number: apiStats ? formatLargeNumber(apiStats.total_students) : "...", labelKey: "business_page.stats.learners" },
    { number: apiStats ? `${apiStats.avg_rating.toFixed(1)}/5` : "...", labelKey: "business_page.stats.rating" },
  ]

  return (
    <motion.div className="min-h-screen bg-background" variants={sectionStagger} initial="hidden" animate="show">
      <motion.section className="relative py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white overflow-hidden" variants={fadeInUp}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                {t('business_page.hero_title_prefix')}
                <span className="text-yellow-400"> {t('business_page.hero_title_highlight')}</span>
              </h1>
              <p className="text-xl mb-8 opacity-90">{t('business_page.hero_subtitle')}</p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  size="lg"
                  className="font-bold border-none hover:bg-gray-100"
                  style={{ backgroundColor: '#ffffff', color: '#000000' }}
                >
                  {t('business_page.get_business')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-bold border-2 hover:bg-white hover:opacity-90"
                  style={{ borderColor: '#ffffff', color: '#ffffff', backgroundColor: 'transparent' }}
                >
                  {t('business_page.request_demo')}
                </Button>
              </div>
              <p className="text-sm opacity-80">{t('business_page.trusted_companies')}</p>
            </div>
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600"
                alt={t('business_page.images.team_collaboration')}
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="py-16 bg-muted/50" variants={fadeInUp}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={listItemTransition(index)}
              >
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{t(stat.labelKey)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="py-20" variants={fadeInUp}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('business_page.why_title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('business_page.why_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={listItemTransition(index)}
                >
                  <Card className="text-center p-6">
                    <CardContent className="pt-6">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{t(feature.titleKey)}</h3>
                      <p className="text-muted-foreground">{t(feature.descriptionKey)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold mb-6">{t('business_page.growth_title')}</h3>
              <div className="space-y-4">
                {growthItems.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={listItemTransition(index)}
                  >
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">{t(item.titleKey)}</h4>
                      <p className="text-muted-foreground">{t(item.descriptionKey)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600"
                alt={t('business_page.images.analytics_dashboard')}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="py-20 bg-gray-900 text-white" variants={fadeInUp}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('business_page.cta_title')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('business_page.cta_subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="font-bold border-none hover:bg-gray-100"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
            >
              {t('business_page.get_business')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-bold border-2 hover:bg-white hover:opacity-90"
              style={{ borderColor: '#ffffff', color: '#ffffff', backgroundColor: 'transparent' }}
            >
              {t('business_page.request_demo')}
            </Button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}
