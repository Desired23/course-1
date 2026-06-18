import { useState, useEffect } from 'react'
import { Search, Filter, Star, Grid, List, X, BookOpen, Users, Clock, TrendingUp } from 'lucide-react'
import { getCourses, type CourseListItem, parseDecimal, getEffectivePrice, formatPrice, getLevelLabel, formatDuration } from '../../services/course.api'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { CourseCard } from '../../components/CourseCard'
import { CategoryBanner } from '../../components/CategoryBanner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '../../components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { Checkbox } from '../../components/ui/checkbox'
import { motion } from 'motion/react'
import { useRouter } from '../../components/Router'
import { formatCategoryName, BreadcrumbItem } from '../../utils/navigation'
import { useTranslation } from 'react-i18next'
import { listItemTransition } from '../../lib/motion'
import { useOwnedCourses } from '../../hooks/useOwnedCourses'

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


const ratings = [4.5, 4.0, 3.5, 3.0]


const topicMetadata: Record<string, {
  titleKey: string
  descriptionKey: string
  parentCategory: string
  relatedTopics: string[]
}> = {
  'react': {
    titleKey: 'topic_page.topics.react.title',
    descriptionKey: 'topic_page.topics.react.description',
    parentCategory: 'Web Development',
    relatedTopics: ['Redux', 'Next.js', 'TypeScript', 'JavaScript']
  },
  'python': {
    titleKey: 'topic_page.topics.python.title',
    descriptionKey: 'topic_page.topics.python.description',
    parentCategory: 'Programming Languages',
    relatedTopics: ['Django', 'Flask', 'Data Science', 'Machine Learning']
  },
  'javascript': {
    titleKey: 'topic_page.topics.javascript.title',
    descriptionKey: 'topic_page.topics.javascript.description',
    parentCategory: 'Web Development',
    relatedTopics: ['Node.js', 'React', 'Vue.js', 'TypeScript']
  },
  'nodejs': {
    titleKey: 'topic_page.topics.nodejs.title',
    descriptionKey: 'topic_page.topics.nodejs.description',
    parentCategory: 'Web Development',
    relatedTopics: ['Express.js', 'MongoDB', 'REST API', 'JavaScript']
  },
  'machine-learning': {
    titleKey: 'topic_page.topics.machine_learning.title',
    descriptionKey: 'topic_page.topics.machine_learning.description',
    parentCategory: 'Data Science',
    relatedTopics: ['Deep Learning', 'Python', 'TensorFlow', 'PyTorch']
  }
}

export default function TopicPage() {
  const { t } = useTranslation()
  const { currentRoute, navigate } = useRouter()
  const { isEnrolled, isInSubscription, getProgress } = useOwnedCourses()


  const pathParts = currentRoute.split('/').filter(Boolean)
  const topicSlug = pathParts[1] || ''

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('most-popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const levelOptions = [
    t('topic_page.levels.all'),
    t('topic_page.levels.beginner'),
    t('topic_page.levels.intermediate'),
    t('topic_page.levels.advanced'),
  ]


  const topicInfo = (() => {
    const metadata = topicMetadata[topicSlug]

    if (!metadata) {
      return {
        title: formatCategoryName(topicSlug),
        description: t('topic_page.default_description', { topic: formatCategoryName(topicSlug) }),
        parentCategory: t('topic_page.all_courses'),
        relatedTopics: [],
      }
    }

    return {
      title: t(metadata.titleKey),
      description: t(metadata.descriptionKey),
      parentCategory: metadata.parentCategory,
      relatedTopics: metadata.relatedTopics,
    }
  })()

  const [serverCourses, setServerCourses] = useState<CourseListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCourses({ search: formatCategoryName(topicSlug), status: 'published', page_size: 24 })
      .then(res => { if (!cancelled) setServerCourses(res.results) })
      .catch(() => { if (!cancelled) setServerCourses([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [topicSlug])

  const courses = serverCourses.map((course) => {
    const effectivePrice = getEffectivePrice(course)
    const regularPrice = parseDecimal(course.price)
    const hasDiscount = effectivePrice < regularPrice
    return {
      id: `course-${course.id}`,
      courseId: `course-${course.id}`,
      title: course.title,
      instructor: course.instructor_name || 'Instructor',
      image: course.thumbnail || '',
      rating: parseDecimal(course.rating),
      reviews: course.total_reviews,
      price: formatPrice(effectivePrice),
      priceNum: effectivePrice,
      originalPrice: hasDiscount ? formatPrice(regularPrice) : undefined,
      duration: formatDuration(course.duration),
      students: course.total_students >= 1000
        ? `${Math.floor(course.total_students / 1000)}K+`
        : `${course.total_students}`,
      studentsNum: course.total_students,
      level: getLevelLabel(course.level),
      category: course.category_name || '',
      bestseller: course.total_students > 100000,
      currency: 'VND' as const,
      discountEndDate: hasDiscount ? course.discount_end_date : undefined,
      isOwned: isEnrolled(course.id),
      inSubscription: isInSubscription(course.id),
      progress: getProgress(course.id),
    }
  })


  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('topic_page.breadcrumb.home'), href: '/' },
    { label: t('topic_page.breadcrumb.topics'), href: '/topics' },
    { label: topicInfo.title, href: `/topic/${topicSlug}` }
  ]


  const filteredCourses = courses.filter(course => {

    if (searchQuery && !course.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !course.instructor.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }


    if (selectedLevels.length > 0 && !selectedLevels.includes(course.level)) {
      return false
    }


    if (selectedRating && course.rating < selectedRating) {
      return false
    }

    return true
  })


  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'most-popular':
        return b.studentsNum - a.studentsNum
      case 'highest-rated':
        return b.rating - a.rating
      case 'price-low-high':
        return a.priceNum - b.priceNum
      case 'price-high-low':
        return b.priceNum - a.priceNum
      default:
        return 0
    }
  })

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedLevels([])
    setSelectedRating(null)
  }

  const hasActiveFilters = searchQuery || selectedLevels.length > 0 || selectedRating !== null


  const totalStudents = courses.reduce((sum, c) => sum + c.studentsNum, 0)

  const avgRating = courses.length > 0
    ? (courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1)
    : '0'


  const FiltersSidebar = () => (
    <div className="space-y-6">

      <div>
        <h3 className="font-semibold mb-3">{t('topic_page.filters.ratings')}</h3>
        <div className="space-y-2">
          {ratings.map(rating => (
            <div key={rating} className="flex items-center gap-2">
              <Checkbox
                checked={selectedRating === rating}
                onCheckedChange={(checked) => {
                  setSelectedRating(checked ? rating : null)
                }}
              />
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{t('topic_page.filters.rating_and_up', { rating })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />


      <div>
        <h3 className="font-semibold mb-3">{t('topic_page.filters.level')}</h3>
        <div className="space-y-2">
          {levelOptions.map(level => (
            <div key={level} className="flex items-center gap-2">
              <Checkbox
                checked={selectedLevels.includes(level)}
                onCheckedChange={(checked) => {
                  setSelectedLevels(prev =>
                    checked
                      ? [...prev, level]
                      : prev.filter(l => l !== level)
                  )
                }}
              />
              <span className="text-sm">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button
            variant="outline"
            className="w-full"
            onClick={clearFilters}
          >
            {t('topic_page.clear_all_filters')}
          </Button>
        </>
      )}
    </div>
  )

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >

      <motion.div variants={fadeInUp} initial="hidden" animate="show">
        <CategoryBanner
          title={topicInfo.title}
          description={topicInfo.description}
          breadcrumbItems={breadcrumbItems}
          totalCourses={courses.length}
        />
      </motion.div>


      <motion.div className="border-b bg-card" variants={fadeInUp} initial="hidden" animate="show">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <BookOpen className="w-4 h-4 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">{courses.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{t('topic_page.stats.courses')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">
                  {totalStudents >= 1000000
                    ? `${(totalStudents / 1000000).toFixed(1)}M+`
                    : `${(totalStudents / 1000).toFixed(0)}K+`
                  }
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">{t('topic_page.stats.students')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Star className="w-4 h-4 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">{avgRating}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{t('topic_page.stats.avg_rating')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-semibold">{t('topic_page.stats.top_rated')}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{t('topic_page.stats.quality')}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>


      {topicInfo.relatedTopics.length > 0 && (
        <motion.div className="border-b bg-card" variants={fadeInUp} initial="hidden" animate="show">
          <div className="container mx-auto px-4 py-4">
            <h2 className="text-lg font-semibold mb-3">{t('topic_page.related_topics')}</h2>
            <div className="flex flex-wrap gap-2">
              {topicInfo.relatedTopics.map(topic => (
                <Button
                  key={topic}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/topic/${topic.toLowerCase().replace(/\s+/g, '-')}`)}
                  className="hover:bg-purple-600 hover:text-white hover:border-purple-600"
                >
                  {topic}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="container mx-auto px-4 py-6 md:py-8">
        <motion.div className="flex flex-col lg:flex-row gap-6 lg:gap-8" variants={sectionStagger} initial="hidden" animate="show">

          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card className="p-4 lg:p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="font-semibold text-sm lg:text-base">{t('topic_page.filters.title')}</h2>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto p-0 text-xs text-purple-400 hover:text-purple-300"
                  >
                    {t('topic_page.filters.clear_all')}
                  </Button>
                )}
              </div>
              <FiltersSidebar />
            </Card>
          </aside>


          <motion.div className="flex-1 min-w-0" variants={fadeInUp}>

            <motion.div className="app-surface-elevated mb-4 md:mb-6 space-y-3 md:space-y-4 rounded-lg p-4 md:p-5" variants={fadeInUp}>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder={t('topic_page.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>


              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {t('topic_page.course_count', { count: sortedCourses.length })}
                  </p>


                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden text-xs">
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        {t('topic_page.filters.title')}
                        {hasActiveFilters && (
                          <Badge className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            !
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>{t('topic_page.filters.title')}</SheetTitle>
                        <SheetDescription>{t('topic_page.filters.description')}</SheetDescription>
                      </SheetHeader>
                      <div className="mt-6">
                        <FiltersSidebar />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">

                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                    <TabsList className="relative hidden sm:flex p-1">
                      <TabsTrigger value="grid" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                        {viewMode === 'grid' && <motion.span layoutId="topic-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                        <Grid className="relative z-10 w-4 h-4" />
                      </TabsTrigger>
                      <TabsTrigger value="list" className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                        {viewMode === 'list' && <motion.span layoutId="topic-page-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
                        <List className="relative z-10 w-4 h-4" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>


                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
                      <SelectValue placeholder={t('topic_page.sort.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="most-popular">{t('topic_page.sort.most_popular')}</SelectItem>
                      <SelectItem value="highest-rated">{t('topic_page.sort.highest_rated')}</SelectItem>
                      <SelectItem value="price-low-high">{t('topic_page.sort.price_low_high')}</SelectItem>
                      <SelectItem value="price-high-low">{t('topic_page.sort.price_high_low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('topic_page.active_filters')}</span>
                  {selectedLevels.map(level => (
                    <Badge key={level} variant="secondary" className="gap-1">
                      {level}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedLevels(prev => prev.filter(l => l !== level))}
                      />
                    </Badge>
                  ))}
                  {selectedRating && (
                    <Badge variant="secondary" className="gap-1">
                      {t('topic_page.selected_rating', { rating: selectedRating })}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setSelectedRating(null)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </motion.div>


            {loading ? (
              <motion.div variants={fadeInUp}>
                <Card className="p-12 text-center text-muted-foreground">{t('common.loading')}</Card>
              </motion.div>
            ) : sortedCourses.length > 0 ? (
              <motion.div variants={fadeInUp} className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {sortedCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={listItemTransition(index)}
                  >
                    <CourseCard
                      {...course}
                      variant={viewMode === 'list' ? 'horizontal' : 'vertical'}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={fadeInUp}>
              <Card className="p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('topic_page.empty_title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('topic_page.empty_description')}
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters}>{t('topic_page.clear_all_filters')}</Button>
                )}
              </Card>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
