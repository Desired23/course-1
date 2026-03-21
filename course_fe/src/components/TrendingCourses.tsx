import { CourseCard } from "./CourseCard"
import { Button } from "./ui/button"
import { useRouter } from "./Router"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { getCourses, parseDecimal, getEffectivePrice, hasActiveDiscount, formatPrice, getLevelLabel, formatDuration, type CourseListItem } from "../services/course.api"

export function TrendingCourses() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [loading, setLoading] = useState(true)
  
  // Fetch trending courses from API (ordered by most students)
  useEffect(() => {
    let cancelled = false
    getCourses({ ordering: '-total_students', status: 'published', page_size: 8 })
      .then(res => {
        if (!cancelled) {
          setCourses(res.results)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const trendingCoursesData = courses.map(course => ({
    id: `course-${course.id}`,
    courseId: `course-${course.id}`,
    title: course.title,
    instructor: course.instructor_name || 'Unknown',
    image: course.thumbnail || '',
    rating: parseDecimal(course.rating),
    reviews: course.total_reviews,
    price: formatPrice(getEffectivePrice(course)),
    originalPrice: hasActiveDiscount(course) ? formatPrice(parseDecimal(course.price)) : undefined,
    duration: formatDuration(course.duration),
    students: course.total_students >= 1000 
      ? `${Math.floor(course.total_students / 1000)}K+` 
      : `${course.total_students}`,
    level: getLevelLabel(course.level),
    category: course.category_name || '',
    isOwned: false,
    progress: 0,
    isTrending: true
  }))

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
    <section className="py-16 px-4 bg-white dark:bg-gray-950">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">{t('trending_courses.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('trending_courses.subtitle')}</p>
          </div>
          <Button 
            variant="outline"
            onClick={() => navigate('/courses')}
          >
            {t('trending_courses.view_all')}
          </Button>
        </div>

        <div className="relative group">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : trendingCoursesData.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t('trending_courses.empty')}</p>
          ) : (
          <>
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 -ml-4"
              aria-label={t('common.scroll_left')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Slider Container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {trendingCoursesData.map((course) => (
              <div key={course.id} className="flex-none w-[calc(100%-2rem)] sm:w-[calc(50%-1.5rem)] lg:w-[calc(25%-1.5rem)] snap-start">
                <CourseCard {...course} />
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 -mr-4"
              aria-label={t('common.scroll_right')}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          </>
          )}
        </div>
      </div>
    </section>
  )
}
