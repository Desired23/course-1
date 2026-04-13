import { ArrowRight, DollarSign, Play, TrendingUp, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { motion } from "motion/react"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { useRouter } from "../../components/Router"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { listItemTransition } from "../../lib/motion"

const stats = [
  { number: "73M", labelKey: "teach_page.stats.students" },
  { number: "219K", labelKey: "teach_page.stats.courses" },
  { number: "75", labelKey: "teach_page.stats.languages" },
  { number: "1B+", labelKey: "teach_page.stats.enrollments" },
]

const benefits = [
  {
    titleKey: "teach_page.benefits.teach_your_way.title",
    descriptionKey: "teach_page.benefits.teach_your_way.description",
    icon: Users,
  },
  {
    titleKey: "teach_page.benefits.inspire_learners.title",
    descriptionKey: "teach_page.benefits.inspire_learners.description",
    icon: TrendingUp,
  },
  {
    titleKey: "teach_page.benefits.get_rewarded.title",
    descriptionKey: "teach_page.benefits.get_rewarded.description",
    icon: DollarSign,
  },
]

const steps = [
  {
    step: "1",
    titleKey: "teach_page.steps.plan_curriculum.title",
    descriptionKey: "teach_page.steps.plan_curriculum.description",
  },
  {
    step: "2",
    titleKey: "teach_page.steps.record_video.title",
    descriptionKey: "teach_page.steps.record_video.description",
  },
  {
    step: "3",
    titleKey: "teach_page.steps.launch_course.title",
    descriptionKey: "teach_page.steps.launch_course.description",
  },
]

const testimonials = [
  {
    name: "Paulo Dichone",
    coursesKey: "teach_page.testimonials.paulo.courses",
    earningsKey: "teach_page.testimonials.paulo.earnings",
    contentKey: "teach_page.testimonials.paulo.content",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
  },
  {
    name: "Angela Yu",
    coursesKey: "teach_page.testimonials.angela.courses",
    earningsKey: "teach_page.testimonials.angela.earnings",
    contentKey: "teach_page.testimonials.angela.content",
    image: "https://images.unsplash.com/photo-1494790108755-2616c273d938?w=100",
  },
  {
    name: "Jose Marcial Portilla",
    coursesKey: "teach_page.testimonials.jose.courses",
    earningsKey: "teach_page.testimonials.jose.earnings",
    contentKey: "teach_page.testimonials.jose.content",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
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

export function TeachOnUdemyPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()

  return (
    <motion.div className="min-h-screen bg-background" variants={sectionStagger} initial="hidden" animate="show">
      <motion.section className="relative py-20 bg-gradient-to-br from-purple-600 to-blue-700 text-white overflow-hidden" variants={fadeInUp}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6">{t('teach_page.hero_title')}</h1>
              <p className="text-xl mb-8 opacity-90">{t('teach_page.hero_subtitle')}</p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  size="lg"
                  className="hover:bg-gray-100 border-none"
                  style={{ backgroundColor: '#ffffff', color: '#4f46e5' }}
                  onClick={() => navigate('/instructor/signup')}
                >
                  {t('teach_page.get_started')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="border-white dark:border-gray-600 bg-transparent text-white hover:bg-white dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400">
                  <Play className="mr-2 h-5 w-5" />
                  {t('teach_page.watch_how')}
                </Button>
              </div>
            </div>
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600"
                alt={t('teach_page.images.online_teaching')}
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="py-16 bg-muted/50" variants={fadeInUp}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={listItemTransition(index)}
              >
                <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{t(stat.labelKey)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="py-20" variants={fadeInUp}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('teach_page.benefits_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={listItemTransition(index)}
                >
                  <Card className="text-center hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                      <CardTitle>{t(benefit.titleKey)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{t(benefit.descriptionKey)}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      <motion.section className="py-20 bg-muted/50" variants={fadeInUp}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('teach_page.how_it_works')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={listItemTransition(index)}
              >
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">{step.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{t(step.titleKey)}</h3>
                <p className="text-muted-foreground">{t(step.descriptionKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="py-20" variants={fadeInUp}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('teach_page.testimonials_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={listItemTransition(index)}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-6 italic">"{t(testimonial.contentKey)}"</p>
                    <div className="flex items-center gap-4">
                      <ImageWithFallback src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{t(testimonial.coursesKey)}</div>
                        <div className="text-sm text-primary">{t(testimonial.earningsKey)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center" variants={fadeInUp}>
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-6">{t('teach_page.start_teaching_today')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('teach_page.cta_subtitle')}</p>
          <Button
            size="lg"
            className="hover:bg-gray-100 border-none"
            style={{ backgroundColor: '#ffffff', color: '#4f46e5' }}
            onClick={() => navigate('/instructor/signup')}
          >
            {t('teach_page.get_started')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </motion.section>
    </motion.div>
  )
}
