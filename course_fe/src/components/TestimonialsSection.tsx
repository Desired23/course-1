import { motion } from 'motion/react'
import { Quote, Star } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Testimonial {
  id: number
  name: string
  role: string
  avatar: string
  rating: number
  content: string
  course: string
}

export function TestimonialsSection() {
  const { t } = useTranslation()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Software Developer',
      avatar: 'https://i.pravatar.cc/150?img=1',
      rating: 5,
      content: 'This platform completely changed my career. The courses are well-structured and the instructors are top-notch. I landed my dream job after completing the Full Stack Development course!',
      course: 'Full Stack Web Development'
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Data Scientist',
      avatar: 'https://i.pravatar.cc/150?img=13',
      rating: 5,
      content: 'The Machine Learning course exceeded all my expectations. The practical projects helped me apply what I learned immediately in my work. Highly recommended!',
      course: 'Machine Learning Masterclass'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      role: 'UX Designer',
      avatar: 'https://i.pravatar.cc/150?img=5',
      rating: 5,
      content: 'As someone transitioning into UX design, I found the courses incredibly helpful. The community support and feedback from instructors made all the difference.',
      course: 'UX/UI Design Bootcamp'
    },
    {
      id: 4,
      name: 'David Kim',
      role: 'Marketing Manager',
      avatar: 'https://i.pravatar.cc/150?img=14',
      rating: 5,
      content: 'The Digital Marketing course gave me practical skills I could use right away. My company saw a 40% increase in engagement within 3 months!',
      course: 'Digital Marketing Pro'
    },
    {
      id: 5,
      name: 'Lisa Patel',
      role: 'Product Manager',
      avatar: 'https://i.pravatar.cc/150?img=9',
      rating: 5,
      content: 'Best investment in my career. The Product Management course was comprehensive and taught by industry experts. The case studies were particularly valuable.',
      course: 'Product Management Essentials'
    },
    {
      id: 6,
      name: 'James Wilson',
      role: 'Business Analyst',
      avatar: 'https://i.pravatar.cc/150?img=12',
      rating: 5,
      content: 'The instructors are amazing and the course content is always up-to-date. I learned more here than in my university degree!',
      course: 'Business Analytics & Data Visualization'
    }
  ]

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    const scrollAmount = 400
    const container = scrollContainerRef.current
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const { scrollLeft, scrollWidth, clientWidth } = container
    
    setShowLeftArrow(scrollLeft > 10)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  return (
    <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4">{t('testimonials.title')}</h2>
          <p className="text-xl text-muted-foreground">
            {t('testimonials.subtitle')}
          </p>
        </motion.div>

        <div className="relative group">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 -ml-6"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Testimonials Slider */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex-none w-[calc(100%-2rem)] sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] snap-start"
              >
                <Card className="h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-6 flex flex-col h-full">
                    <Quote className="w-10 h-10 text-primary mb-4 opacity-20" />
                    
                    <div className="flex mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>

                    <p className="text-muted-foreground mb-6 flex-1 italic">
                      "{testimonial.content}"
                    </p>

                    <div className="flex items-center gap-4 pt-4 border-t">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                        <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        <div className="text-xs text-primary mt-1">{testimonial.course}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 -mr-6"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}