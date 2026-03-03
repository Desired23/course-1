import { ArrowRight, Play, DollarSign, Users, TrendingUp, Star, CheckCircle } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { useRouter } from "../../components/Router"
import { useTranslation } from "react-i18next"

const stats = [
  { number: "73M", label: "Students" },
  { number: "219K", label: "Courses" },
  { number: "75", label: "Languages" },
  { number: "1B+", label: "Enrollments" }
]

const benefits = [
  {
    title: "Teach your way",
    description: "Publish the course you want, in the way you want, and always have control of your own content.",
    icon: Users
  },
  {
    title: "Inspire learners",
    description: "Teach what you know and help learners explore their interests, gain new skills, and advance their careers.",
    icon: TrendingUp
  },
  {
    title: "Get rewarded",
    description: "Expand your professional network, build your expertise, and earn money on each paid enrollment.",
    icon: DollarSign
  }
]

const steps = [
  {
    step: "1",
    title: "Plan your curriculum",
    description: "You start with your passion and knowledge. Then choose a promising topic with the help of our Marketplace Insights tool."
  },
  {
    step: "2", 
    title: "Record your video",
    description: "Use basic tools like a smartphone or a DSLR camera. Add a good microphone and you're ready to start."
  },
  {
    step: "3",
    title: "Launch your course",
    description: "Gather your first reviews and students. Udemy's global marketplace will help you reach more learners."
  }
]

const testimonials = [
  {
    name: "Paulo Dichone",
    courses: "7 courses",
    students: "45,000+ students",
    earnings: "$70,000+ earned",
    content: "Teaching on Udemy has been an incredible journey. I've been able to share my knowledge with thousands of students worldwide.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"
  },
  {
    name: "Angela Yu",
    courses: "12 courses", 
    students: "500,000+ students",
    earnings: "$250,000+ earned",
    content: "Udemy has given me the platform to reach students I never would have reached otherwise. The impact has been amazing.",
    image: "https://images.unsplash.com/photo-1494790108755-2616c273d938?w=100"
  },
  {
    name: "Jose Marcial Portilla",
    courses: "25 courses",
    students: "1,000,000+ students", 
    earnings: "$500,000+ earned",
    content: "The flexibility and reach that Udemy provides is unmatched. I can focus on creating great content.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
  }
]

const requirements = [
  "We need instructors who can teach with passion",
  "Your course must have at least 5 lectures and be at least 30 minutes long",
  "Your course should provide valuable learning outcomes for students",
  "You should have knowledge and experience in your topic"
]

const features = [
  "Course creation tools and resources",
  "Global marketplace exposure",
  "Student communication features", 
  "Analytics and insights dashboard",
  "Mobile app for managing your courses",
  "Marketing and promotional support"
]

export function TeachOnUdemyPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-purple-600 to-blue-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                {t('teach_page.hero_title')}
              </h1>
              <p className="text-xl mb-8 opacity-90">
                {t('teach_page.hero_subtitle')}
              </p>
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
                alt="Online teaching"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{t(`teach_page.stats_${stat.label.toLowerCase().replace(/[^a-z]/g, '')}`) || stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('instructor_promo.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle>{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('teach_page.how_it_works')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">{step.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('testimonials.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                  <div className="flex items-center gap-4">
                    <ImageWithFallback src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.courses}</div>
                      <div className="text-sm text-primary">{testimonial.earnings}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-6">{t('teach_page.start_teaching_today')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('instructor_promo.subtitle')}</p>
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
      </section>
    </div>
  )
}