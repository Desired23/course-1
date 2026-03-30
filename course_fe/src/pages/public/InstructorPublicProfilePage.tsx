import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpDown,
  BookOpen,
  Facebook,
  Globe,
  LayoutGrid,
  Linkedin,
  List,
  Loader2,
  MessageCircle,
  Star,
  Twitter,
  UserCheck,
  UserPlus,
  Users,
  Youtube,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { UserPagination } from '../../components/UserPagination'
import { useRouter } from '../../components/Router'
import { useFollow } from '../../contexts/FollowContext'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import { CourseCard } from '../../components/CourseCard'
import {
  formatStudentCount,
  getInitials,
  getInstructorById,
  parseRating,
  type Instructor,
} from '../../services/instructor.api'
import {
  formatPrice,
  getCourses,
  getEffectivePrice,
  getLevelLabel,
  type CourseListItem,
} from '../../services/course.api'
import {
  calcAverageRating,
  formatReviewDate,
  getAllReviewsByInstructor,
  type Review,
} from '../../services/review.api'

export function InstructorPublicProfilePage() {
  const { t } = useTranslation()
  const { navigate, params } = useRouter()
  const { isFollowing, toggleFollow, getFollowersCount } = useFollow()
  const { user } = useAuth()
  const { openChatWithUser } = useChat()

  const instructorId = params?.instructorId || '1'
  const following = isFollowing(instructorId)
  const followersCount = getFollowersCount(instructorId)

  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'about' | 'courses' | 'reviews'>('about')
  const [courseSort, setCourseSort] = useState<'featured' | 'rating' | 'students' | 'newest'>('featured')
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest')
  const [courseQuery, setCourseQuery] = useState('')
  const [courseLevel, setCourseLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'all_levels'>('all')
  const [coursePriceFilter, setCoursePriceFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [courseViewMode, setCourseViewMode] = useState<'grid' | 'list'>('grid')
  const [reviewQuery, setReviewQuery] = useState('')
  const [reviewRatingFilter, setReviewRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all')
  const [coursesPage, setCoursesPage] = useState(1)
  const [reviewsPage, setReviewsPage] = useState(1)

  const COURSES_PER_PAGE = 6
  const REVIEWS_PER_PAGE = 5

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const numId = Number(instructorId)
    if (Number.isNaN(numId)) {
      setError(t('instructor_public_profile.invalid_instructor_id'))
      setLoading(false)
      return
    }

    Promise.all([
      getInstructorById(numId),
      getCourses({ page: 1, page_size: 100, instructor_id: numId }),
      getAllReviewsByInstructor(numId),
    ])
      .then(([inst, courseRes, reviewData]) => {
        if (cancelled) return
        setInstructor(inst)
        setCourses(courseRes.results)
        setReviews(reviewData)
        setActiveTab(courseRes.results.length > 0 ? 'courses' : reviewData.length > 0 ? 'reviews' : 'about')
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || t('instructor_public_profile.load_failed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [instructorId, t])

  useEffect(() => {
    setCoursesPage(1)
  }, [courseQuery, courseLevel, coursePriceFilter, courseSort])

  useEffect(() => {
    setReviewsPage(1)
  }, [reviewQuery, reviewRatingFilter, reviewSort])

  const handleFollowClick = () => {
    toggleFollow(instructorId)
  }

  const handleMessageInstructor = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (instructor) {
      await openChatWithUser(instructor.user.id, instructor.user.full_name)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !instructor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="mb-4 text-destructive">{error || t('instructor_public_profile.not_found')}</p>
          <Button onClick={() => navigate('/')}>{t('instructor_public_profile.back_home')}</Button>
        </div>
      </div>
    )
  }

  const rating = parseRating(instructor.rating)
  const socialLinks = instructor.social_links || {}

  const filteredCourses = courses.filter((course) => {
    const matchesQuery = !courseQuery || course.title.toLowerCase().includes(courseQuery.toLowerCase())
    const matchesLevel = courseLevel === 'all' || course.level === courseLevel
    const effectivePrice = getEffectivePrice(course)
    const matchesPrice =
      coursePriceFilter === 'all' ||
      (coursePriceFilter === 'free' && effectivePrice === 0) ||
      (coursePriceFilter === 'paid' && effectivePrice > 0)
    return matchesQuery && matchesLevel && matchesPrice
  })

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (courseSort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0)
    if (courseSort === 'students') return (b.total_students || 0) - (a.total_students || 0)
    if (courseSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (Boolean(b.is_featured) !== Boolean(a.is_featured)) return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured))
    return Number(b.rating || 0) - Number(a.rating || 0)
  })

  const filteredReviews = reviews.filter((review) => {
    const text = `${review.user_info?.full_name || ''} ${review.comment || ''} ${review.course_detail?.title || ''}`.toLowerCase()
    const matchesQuery = !reviewQuery || text.includes(reviewQuery.toLowerCase())
    const matchesRating = reviewRatingFilter === 'all' || String(review.rating) === reviewRatingFilter
    return matchesQuery && matchesRating
  })

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (reviewSort === 'highest') return b.rating - a.rating
    if (reviewSort === 'lowest') return a.rating - b.rating
    return new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
  })

  const courseTotalPages = Math.max(1, Math.ceil(sortedCourses.length / COURSES_PER_PAGE))
  const reviewTotalPages = Math.max(1, Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE))
  const paginatedCourses = sortedCourses.slice((coursesPage - 1) * COURSES_PER_PAGE, coursesPage * COURSES_PER_PAGE)
  const paginatedReviews = sortedReviews.slice((reviewsPage - 1) * REVIEWS_PER_PAGE, reviewsPage * REVIEWS_PER_PAGE)

  const courseCardData = paginatedCourses.map((course) => {
    const effectivePrice = getEffectivePrice(course)
    const regularPrice = parseFloat(course.price || '0')
    const hasDiscount = effectivePrice < regularPrice

    return {
      id: `course-${course.id}`,
      courseId: `course-${course.id}`,
      title: course.title,
      instructor: course.instructor_name || instructor.user.full_name,
      image: course.thumbnail || '',
      rating: parseFloat(course.rating || '0') || 0,
      reviews: course.total_reviews,
      price: formatPrice(effectivePrice),
      originalPrice: hasDiscount ? formatPrice(regularPrice) : undefined,
      duration: t('instructor_public_profile.duration_minutes', { count: course.duration || 0 }),
      students: course.total_students >= 1000 ? `${Math.floor(course.total_students / 1000)}K+` : `${course.total_students}`,
      level: getLevelLabel(course.level),
      category: course.category_name || '',
      variant: courseViewMode === 'grid' ? 'vertical' as const : 'horizontal' as const,
      bestseller: Boolean(course.is_featured),
      currency: 'VND' as const,
      showWishlist: true,
      showAddToCart: true,
      discountEndDate: hasDiscount ? course.discount_end_date : undefined,
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-start gap-8 md:flex-row">
            <Avatar className="h-32 w-32">
              <AvatarImage src={instructor.user.avatar || undefined} />
              <AvatarFallback className="text-3xl">{getInitials(instructor.user.full_name)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="mb-2 text-3xl">{instructor.user.full_name}</h1>
                <p className="text-lg text-muted-foreground">{instructor.specialization || ''}</p>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{rating}</span>
                  <span className="text-muted-foreground">{t('instructor_public_profile.stats.rating')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">{formatStudentCount(instructor.total_students)}</span>
                  <span className="text-muted-foreground">{t('instructor_public_profile.stats.students')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span className="font-medium">{instructor.total_courses}</span>
                  <span className="text-muted-foreground">{t('instructor_public_profile.stats.courses')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  <span className="font-medium">{followersCount}</span>
                  <span className="text-muted-foreground">{t('instructor_public_profile.stats.followers')}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleFollowClick} variant={following ? 'outline' : 'default'}>
                  {following ? (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      {t('instructor_public_profile.following')}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {t('instructor_public_profile.follow')}
                    </>
                  )}
                </Button>
                {user?.id !== instructor.user.id && (
                  <Button variant="outline" onClick={() => void handleMessageInstructor()}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {t('instructor_public_profile.message')}
                  </Button>
                )}
              </div>

              {Object.keys(socialLinks).length > 0 && (
                <div className="flex gap-3">
                  {socialLinks.website && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.twitter && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.linkedin && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.youtube && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                        <Youtube className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                  {socialLinks.facebook && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="h-5 w-5" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="mb-1 text-sm text-muted-foreground">{t('instructor_public_profile.summary.course_overview')}</p>
              <p className="text-3xl font-bold">{courses.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('instructor_public_profile.summary.published_courses')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="mb-1 text-sm text-muted-foreground">{t('instructor_public_profile.summary.average_rating')}</p>
              <p className="text-3xl font-bold">{reviews.length ? calcAverageRating(reviews).toFixed(1) : rating.toFixed(1)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('instructor_public_profile.summary.public_reviews', { count: reviews.length })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="mb-1 text-sm text-muted-foreground">{t('instructor_public_profile.summary.learners')}</p>
              <p className="text-3xl font-bold">{formatStudentCount(instructor.total_students)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('instructor_public_profile.summary.total_students')}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'about' | 'courses' | 'reviews')} className="space-y-6">
          <TabsList>
            <TabsTrigger value="about">{t('instructor_public_profile.tabs.about')}</TabsTrigger>
            <TabsTrigger value="courses">{t('instructor_public_profile.tabs.courses', { count: courses.length })}</TabsTrigger>
            <TabsTrigger value="reviews">{t('instructor_public_profile.tabs.reviews', { count: reviews.length })}</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('instructor_public_profile.about.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="leading-relaxed text-muted-foreground">{instructor.bio || t('instructor_public_profile.about.empty')}</p>
                <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                  {instructor.experience != null && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('instructor_public_profile.about.experience')}</p>
                      <p className="font-medium">{t('instructor_public_profile.years', { count: instructor.experience })}</p>
                    </div>
                  )}
                  {instructor.qualification && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('instructor_public_profile.about.qualification')}</p>
                      <p className="font-medium">{instructor.qualification}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t('instructor_public_profile.courses.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('instructor_public_profile.courses.description')}</p>
              </div>
              <ToggleGroup
                type="single"
                value={courseViewMode}
                onValueChange={(value) => {
                  if (value === 'grid' || value === 'list') setCourseViewMode(value)
                }}
                variant="outline"
              >
                <ToggleGroupItem value="grid" aria-label={t('instructor_public_profile.courses.grid_view')}>
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label={t('instructor_public_profile.courses.list_view')}>
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Card>
              <CardContent className="grid gap-3 p-4 md:grid-cols-4">
                <input
                  value={courseQuery}
                  onChange={(e) => setCourseQuery(e.target.value)}
                  placeholder={t('instructor_public_profile.courses.search_placeholder')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced' | 'all_levels')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">{t('instructor_public_profile.courses.levels.all')}</option>
                  <option value="beginner">{t('instructor_public_profile.courses.levels.beginner')}</option>
                  <option value="intermediate">{t('instructor_public_profile.courses.levels.intermediate')}</option>
                  <option value="advanced">{t('instructor_public_profile.courses.levels.advanced')}</option>
                  <option value="all_levels">{t('instructor_public_profile.courses.levels.all_levels')}</option>
                </select>
                <select
                  value={coursePriceFilter}
                  onChange={(e) => setCoursePriceFilter(e.target.value as 'all' | 'free' | 'paid')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">{t('instructor_public_profile.courses.price.all')}</option>
                  <option value="free">{t('instructor_public_profile.courses.price.free')}</option>
                  <option value="paid">{t('instructor_public_profile.courses.price.paid')}</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUpDown className="h-4 w-4" />
                  <select
                    value={courseSort}
                    onChange={(e) => setCourseSort(e.target.value as 'featured' | 'rating' | 'students' | 'newest')}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="featured">{t('instructor_public_profile.courses.sort.featured')}</option>
                    <option value="rating">{t('instructor_public_profile.courses.sort.rating')}</option>
                    <option value="students">{t('instructor_public_profile.courses.sort.students')}</option>
                    <option value="newest">{t('instructor_public_profile.courses.sort.newest')}</option>
                  </select>
                </label>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              {t('instructor_public_profile.courses.showing', { shown: paginatedCourses.length, total: sortedCourses.length })}
            </div>

            {sortedCourses.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2">{t('instructor_public_profile.courses.empty')}</h3>
              </div>
            ) : (
              <div className={courseViewMode === 'grid' ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
                {courseCardData.map((course) => (
                  <CourseCard key={course.id} {...course} />
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <UserPagination currentPage={coursesPage} totalPages={courseTotalPages} onPageChange={setCoursesPage} />
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t('instructor_public_profile.reviews.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('instructor_public_profile.reviews.description')}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {t('instructor_public_profile.reviews.showing', { shown: paginatedReviews.length, total: sortedReviews.length })}
              </div>
            </div>

            <Card>
              <CardContent className="grid gap-3 p-4 md:grid-cols-3">
                <input
                  value={reviewQuery}
                  onChange={(e) => setReviewQuery(e.target.value)}
                  placeholder={t('instructor_public_profile.reviews.search_placeholder')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value as 'all' | '5' | '4' | '3' | '2' | '1')}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">{t('instructor_public_profile.reviews.rating_filter.all')}</option>
                  <option value="5">{t('instructor_public_profile.reviews.rating_filter.stars', { count: 5 })}</option>
                  <option value="4">{t('instructor_public_profile.reviews.rating_filter.stars', { count: 4 })}</option>
                  <option value="3">{t('instructor_public_profile.reviews.rating_filter.stars', { count: 3 })}</option>
                  <option value="2">{t('instructor_public_profile.reviews.rating_filter.stars', { count: 2 })}</option>
                  <option value="1">{t('instructor_public_profile.reviews.rating_filter.stars', { count: 1 })}</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUpDown className="h-4 w-4" />
                  <select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as 'newest' | 'highest' | 'lowest')}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="newest">{t('instructor_public_profile.reviews.sort.newest')}</option>
                    <option value="highest">{t('instructor_public_profile.reviews.sort.highest')}</option>
                    <option value="lowest">{t('instructor_public_profile.reviews.sort.lowest')}</option>
                  </select>
                </label>
              </CardContent>
            </Card>

            {sortedReviews.length === 0 ? (
              <div className="py-12 text-center">
                <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2">{t('instructor_public_profile.reviews.empty_title')}</h3>
                <p className="text-muted-foreground">{t('instructor_public_profile.reviews.empty_description')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-4xl font-bold">{calcAverageRating(reviews).toFixed(1)}</p>
                        <div className="mt-1 flex items-center gap-1">
                          {[...Array(5)].map((_, index) => (
                            <Star
                              key={index}
                              className={`h-4 w-4 ${
                                index < Math.round(calcAverageRating(reviews)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{t('instructor_public_profile.reviews.count', { count: reviews.length })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {paginatedReviews.map((review) => (
                    <Card key={review.review_id}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.user_info?.avatar || undefined} />
                            <AvatarFallback className="text-sm">
                              {(review.user_info?.full_name || t('instructor_public_profile.reviews.student_fallback')).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{review.user_info?.full_name || t('instructor_public_profile.reviews.student_fallback')}</p>
                              <span className="text-xs text-muted-foreground">{formatReviewDate(review.review_date)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              {[...Array(5)].map((_, index) => (
                                <Star
                                  key={index}
                                  className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            {review.course_detail && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t('instructor_public_profile.reviews.course_label')}: {review.course_detail.title}
                              </p>
                            )}
                            <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                            {review.instructor_response && (
                              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                                <p className="mb-1 text-xs font-medium">{t('instructor_public_profile.reviews.instructor_response')}</p>
                                <p className="text-sm text-muted-foreground">{review.instructor_response}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end">
                  <UserPagination currentPage={reviewsPage} totalPages={reviewTotalPages} onPageChange={setReviewsPage} />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
