import { ArrowRight, CheckCircle, Users, TrendingUp, Award, Star } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { CourseCard } from "../../components/CourseCard"

const features = [
  {
    title: "Fresh & relevant content",
    description: "Learn from industry experts with real-world experience",
    icon: TrendingUp
  },
  {
    title: "Hands-on learning",
    description: "Practice with assignments, quizzes, and projects",
    icon: Users
  },
  {
    title: "Trusted by companies",
    description: "Trusted by 15,000+ companies worldwide",
    icon: Award
  }
]

const stats = [
  { number: "15,000+", label: "Companies trust us" },
  { number: "1M+", label: "Learners monthly" },
  { number: "4.5", label: "Average rating" },
  { number: "24/7", label: "Expert support" }
]

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Learning & Development Manager",
    company: "TechCorp",
    content: "Udemy Business has transformed how we approach professional development. Our teams are more skilled and confident than ever.",
    rating: 5
  },
  {
    name: "Michael Chen",
    role: "HR Director",
    company: "InnovateInc",
    content: "The variety of courses and the ability to track progress across our organization has been invaluable.",
    rating: 5
  },
  {
    name: "Emma Davis",
    role: "Training Coordinator",
    company: "GlobalSoft",
    content: "Our employees love the flexibility to learn at their own pace while we can monitor their progress and ROI.",
    rating: 5
  }
]

const popularCourses = [
  {
    title: "Complete Python Bootcamp",
    instructor: "Jose Portilla",
    students: "1.2M+",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1649180556628-9ba704115795?w=300"
  },
  {
    title: "AWS Certified Solutions Architect",
    instructor: "Stephane Maarek", 
    students: "800K+",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300"
  },
  {
    title: "The Complete Digital Marketing Course",
    instructor: "Rob Percival",
    students: "650K+", 
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300"
  },
  {
    title: "React - The Complete Guide",
    instructor: "Maximilian Schwarzmüller",
    students: "900K+",
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=300"
  }
]

export function UdemyBusinessPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6">
                Upskill your team with
                <span className="text-yellow-400"> Udemy Business</span>
              </h1>
              <p className="text-xl mb-8 opacity-90">
                Give your team access to over 25,000 top-rated courses, anytime, anywhere.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="font-bold border-none hover:bg-gray-100"
                  style={{ backgroundColor: '#ffffff', color: '#000000' }}
                >
                  Get Udemy Business
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="font-bold border-2 hover:bg-white hover:opacity-90"
                  style={{ borderColor: '#ffffff', color: '#ffffff', backgroundColor: 'transparent' }}
                >
                  Request a demo
                </Button>
              </div>
              <p className="text-sm opacity-80">
                Trusted by 15,000+ companies worldwide
              </p>
            </div>
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600"
                alt="Team collaboration"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Why choose Udemy Business?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We provide the tools and insights you need to keep your team ahead of the curve
            </p>
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
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold mb-6">
                Accelerate growth with actionable insights
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Learning paths</h4>
                    <p className="text-muted-foreground">Curated course collections to develop specific skills</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Analytics and insights</h4>
                    <p className="text-muted-foreground">Track engagement and measure learning outcomes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">SSO and LMS integration</h4>
                    <p className="text-muted-foreground">Seamlessly integrate with your existing tools</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600"
                alt="Analytics dashboard"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Popular Courses */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Popular courses for business
            </h2>
            <p className="text-xl text-muted-foreground">
              Top-rated courses from industry experts
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularCourses.map((course, index) => (
              <CourseCard
                key={index}
                courseId={`course-${index + 100}`}
                title={course.title}
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

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              What our customers say
            </h2>
            <p className="text-xl text-muted-foreground">
              See how Udemy Business is helping companies worldwide
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="pt-0">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">{testimonial.content}</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of companies that trust Udemy Business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="font-bold border-none hover:bg-gray-100"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
            >
              Get Udemy Business
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="font-bold border-2 hover:bg-white hover:opacity-90"
              style={{ borderColor: '#ffffff', color: '#ffffff', backgroundColor: 'transparent' }}
            >
              Request a demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}