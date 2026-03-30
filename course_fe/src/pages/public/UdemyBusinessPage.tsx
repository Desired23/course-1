import { ArrowRight, Award, CheckCircle, Star, TrendingUp, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CourseCard } from "../../components/CourseCard"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"

const features = [
  {
    titleKey: "udemy_business_page.features.fresh_content.title",
    descriptionKey: "udemy_business_page.features.fresh_content.description",
    icon: TrendingUp,
  },
  {
    titleKey: "udemy_business_page.features.hands_on.title",
    descriptionKey: "udemy_business_page.features.hands_on.description",
    icon: Users,
  },
  {
    titleKey: "udemy_business_page.features.trusted.title",
    descriptionKey: "udemy_business_page.features.trusted.description",
    icon: Award,
  },
]

const stats = [
  { number: "15,000+", labelKey: "udemy_business_page.stats.companies" },
  { number: "1M+", labelKey: "udemy_business_page.stats.learners" },
  { number: "4.5", labelKey: "udemy_business_page.stats.rating" },
  { number: "24/7", labelKey: "udemy_business_page.stats.support" },
]

const testimonials = [
  {
    name: "Sarah Johnson",
    roleKey: "udemy_business_page.testimonials.sarah.role",
    company: "TechCorp",
    contentKey: "udemy_business_page.testimonials.sarah.content",
  },
  {
    name: "Michael Chen",
    roleKey: "udemy_business_page.testimonials.michael.role",
    company: "InnovateInc",
    contentKey: "udemy_business_page.testimonials.michael.content",
  },
  {
    name: "Emma Davis",
    roleKey: "udemy_business_page.testimonials.emma.role",
    company: "GlobalSoft",
    contentKey: "udemy_business_page.testimonials.emma.content",
  },
]

const growthItems = [
  {
    titleKey: "udemy_business_page.growth.learning_paths.title",
    descriptionKey: "udemy_business_page.growth.learning_paths.description",
  },
  {
    titleKey: "udemy_business_page.growth.analytics.title",
    descriptionKey: "udemy_business_page.growth.analytics.description",
  },
  {
    titleKey: "udemy_business_page.growth.integration.title",
    descriptionKey: "udemy_business_page.growth.integration.description",
  },
]

const popularCourses = [
  {
    titleKey: "udemy_business_page.popular_courses.python",
    instructor: "Jose Portilla",
    students: "1.2M+",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1649180556628-9ba704115795?w=300",
  },
  {
    titleKey: "udemy_business_page.popular_courses.aws",
    instructor: "Stephane Maarek",
    students: "800K+",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300",
  },
  {
    titleKey: "udemy_business_page.popular_courses.marketing",
    instructor: "Rob Percival",
    students: "650K+",
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300",
  },
  {
    titleKey: "udemy_business_page.popular_courses.react",
    instructor: "Maximilian Schwarzmüller",
    students: "900K+",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=300",
  },
]

export function UdemyBusinessPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      <section className="relative py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                {t('udemy_business_page.hero_title_prefix')}
                <span className="text-yellow-400"> {t('udemy_business_page.hero_title_highlight')}</span>
              </h1>
              <p className="text-xl mb-8 opacity-90">{t('udemy_business_page.hero_subtitle')}</p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  size="lg"
                  className="font-bold border-none hover:bg-gray-100"
                  style={{ backgroundColor: '#ffffff', color: '#000000' }}
                >
                  {t('udemy_business_page.get_business')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-bold border-2 hover:bg-white hover:opacity-90"
                  style={{ borderColor: '#ffffff', color: '#ffffff', backgroundColor: 'transparent' }}
                >
                  {t('udemy_business_page.request_demo')}
                </Button>
              </div>
              <p className="text-sm opacity-80">{t('udemy_business_page.trusted_companies')}</p>
            </div>
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600"
                alt={t('udemy_business_page.images.team_collaboration')}
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('udemy_business_page.why_title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('udemy_business_page.why_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card key={index} className="text-center p-6">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{t(feature.titleKey)}</h3>
                    <p className="text-muted-foreground">{t(feature.descriptionKey)}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold mb-6">{t('udemy_business_page.growth_title')}</h3>
              <div className="space-y-4">
                {growthItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">{t(item.titleKey)}</h4>
                      <p className="text-muted-foreground">{t(item.descriptionKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600"
                alt={t('udemy_business_page.images.analytics_dashboard')}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('udemy_business_page.popular_title')}</h2>
            <p className="text-xl text-muted-foreground">{t('udemy_business_page.popular_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularCourses.map((course, index) => (
              <CourseCard
                key={index}
                courseId={`course-${index + 100}`}
                title={t(course.titleKey)}
                instructor={course.instructor}
                image={course.image}
                rating={course.rating}
                reviews={15000}
                price={29.99}
                originalPrice={199.99}
                duration="12.5 hours"
                students={course.students}
                level="All Levels"
                currency="USD"
                variant="vertical"
                showWishlist={true}
                showAddToCart={true}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('udemy_business_page.testimonials_title')}</h2>
            <p className="text-xl text-muted-foreground">{t('udemy_business_page.testimonials_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="pt-0">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">{t(testimonial.contentKey)}</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {t(testimonial.roleKey)}, {testimonial.company}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t('udemy_business_page.cta_title')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('udemy_business_page.cta_subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="font-bold border-none hover:bg-gray-100"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
            >
              {t('udemy_business_page.get_business')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-bold border-2 hover:bg-white hover:opacity-90"
              style={{ borderColor: '#ffffff', color: '#ffffff', backgroundColor: 'transparent' }}
            >
              {t('udemy_business_page.request_demo')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
