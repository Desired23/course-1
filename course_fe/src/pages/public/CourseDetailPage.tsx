import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from "../../components/Router"
import { useCart } from "../../contexts/CartContext"
import { useAuth } from "../../contexts/AuthContext"
import { useChat } from "../../contexts/ChatContext"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { CourseCategoryTags } from "../../components/CourseCategoryTags"
import { CourseBreadcrumb } from "../../components/CourseBreadcrumb"
import { CourseStickyNav } from "../../components/CourseStickyNav"
import { LearningGoals } from "../../components/LearningGoals"
import { toast } from "sonner"
import { getErrorMessage } from "../../lib/apiError"
import { getCourseById, getCourses, type CourseDetail, type CourseListItem, parseDecimal, getEffectivePrice, hasActiveDiscount, formatPrice, formatDuration } from "../../services/course.api"
import { getCoursePromotions, type HomepagePromotion, formatDiscountValue } from "../../services/promotions.api"
import { getInitials } from "../../services/instructor.api"
import { extractRouteParams } from "../../utils/routeHelpers"
import { getReviewsByCourse, createReview, updateReview, reportReview, type Review } from "../../services/review.api"
import { DiscountCountdown } from "../../components/DiscountCountdown"
import { useOwnedCourses } from "../../hooks/useOwnedCourses"
import { createEnrollment } from "../../services/enrollment.api"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { SubscriptionLockOverlay } from '../../components/subscription/SubscriptionLockOverlay'
import { LessonPreviewModal } from '../../components/LessonPreviewModal'
import { ReportDialog } from '../../components/ReportDialog'
import { Skeleton } from '../../components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { listItemTransition } from '../../lib/motion'
import {
  Star, Users, Clock, Globe, Languages, Play, FileText,
  Check, Zap, Crown, Lock, Loader2, MessageSquare, BookOpen, Flag, Tag, Edit2
} from 'lucide-react'

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

const isPublicCourseListItem = (course: CourseListItem) =>
  course.status === 'published' && course.is_public && !course.admin_hidden && !course.is_hard_blocked

export function CourseDetailPage() {
  const { t } = useTranslation()


  const [courseData, setCourseData] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [editingOwnReview, setEditingOwnReview] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [discountExpired, setDiscountExpired] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [coursePromos, setCoursePromos] = useState<HomepagePromotion[]>([])
  const [relatedCourses, setRelatedCourses] = useState<CourseListItem[]>([])
  const [instructorCourses, setInstructorCourses] = useState<CourseListItem[]>([])

  const handleDiscountExpire = useCallback(() => {
    setDiscountExpired(true)
  }, [])

  const sidebarCardRef = useRef<HTMLDivElement>(null)
  const sidebarCardInnerRef = useRef<HTMLDivElement>(null)
  const [cardPosition, setCardPosition] = useState<'natural' | 'fixed' | 'docked'>('natural')

  const { addToCart, addToCartFromApi, isInCartByCourseId, loadCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { openChatWithUser } = useChat()
  const { navigate, currentRoute } = useRouter()
  const { refresh: refreshOwned } = useOwnedCourses()
  const currentUserReview = reviews.find((review) => String(review.user) === user?.id)


  useEffect(() => {
    const handleScroll = () => {
      const container = sidebarCardRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const topThreshold = 136
      const pageBottom = document.documentElement.scrollHeight
      const viewportHeight = window.innerHeight
      const distanceFromBottom = pageBottom - window.scrollY - viewportHeight
      const cardHeight = container.offsetHeight

      if (distanceFromBottom < cardHeight + 100) {
        setCardPosition('docked')
      } else if (rect.top < topThreshold) {
        setCardPosition('fixed')
      } else {
        setCardPosition('natural')
      }
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])


  const accessInfo = courseData?.access_info
  const canAccessCourse = accessInfo?.has_access || false
  const accessType = accessInfo?.access_type || null
  const isCourseInSubscription = accessInfo?.in_subscription || false
  const subscriptionPlan = accessInfo?.subscription_plan || null
  const reviewProgress = Number(courseData?.user_enrollment?.progress ?? 0)
  const isArchivedCourse = courseData?.status === 'archived'
  const canReviewCourse = canAccessCourse && reviewProgress > 50 && !isArchivedCourse


  const courseId = courseData?.id || 0

  const isFree = courseData ? getEffectivePrice(courseData) === 0 : false

  const [previewLesson, setPreviewLesson] = useState<any>(null)
  const [courseReportOpen, setCourseReportOpen] = useState(false)

  const openPromoVideo = () => {
    if (!courseData?.promotional_video) return
    setPreviewLesson({
      id: -1,
      title: courseData.title,
      type: 'video',
      content_type: 'video',
      duration: '',
      status: 'published',
      is_free: true,
      videoUrl: courseData.promotional_video,
    })
  }

  const openLessonPreview = (lesson: { lesson_id: number; title: string; content_type: string; duration: number | null; signed_video_url?: string | null; is_free: boolean }) => {
    setPreviewLesson({
      id: lesson.lesson_id,
      title: lesson.title,
      type: lesson.content_type,
      content_type: lesson.content_type,
      duration: formatDuration(lesson.duration),
      status: 'published',
      is_free: lesson.is_free,
      videoUrl: lesson.signed_video_url || '',
    })
  }

  const firstFreePreviewLesson =
    (courseData?.modules || [])
      .flatMap((m) => m.lessons || [])
      .find((l) => l.is_free && l.content_type === 'video' && !!l.signed_video_url) || null

  const hasPreview = !!courseData?.promotional_video || !!firstFreePreviewLesson

  const visibleCourseModules = (courseData?.modules || []).map((mod) => ({
    ...mod,
    lessons: (mod.lessons || []).filter((lesson) => lesson.content_type === 'video'),
  }))
  const visibleLessonCount = visibleCourseModules.reduce((total, mod) => total + mod.lessons.length, 0)
  const visibleDuration = visibleCourseModules.reduce(
    (total, mod) => total + mod.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0),
    0,
  )

  const openPreview = () => {
    if (courseData?.promotional_video) {
      openPromoVideo()
    } else if (firstFreePreviewLesson) {
      openLessonPreview(firstFreePreviewLesson)
    }
  }

  const handleMessageInstructor = async () => {
    if (!courseData?.instructor) return
    if (!isAuthenticated) {
      toast.error(t('course_detail.login_to_enroll'))
      navigate('/login')
      return
    }
    await openChatWithUser(courseData.instructor.user_id, courseData.instructor.full_name)
  }

  const handleOpenCourseReport = () => {
    if (!courseData) return
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để báo cáo khóa học.')
      navigate('/login', undefined, { redirect: currentRoute })
      return
    }
    setCourseReportOpen(true)
  }

  const handleOpenInstructorProfile = () => {
    if (!courseData?.instructor?.instructor_id) return
    navigate(
      `/instructor/${courseData.instructor.instructor_id}/profile`,
      undefined,
      {
        fromCourseId: String(courseData.id),
        fromCourseTitle: courseData.title,
      }
    )
  }


  const handleEnroll = async (source: 'purchase' | 'subscription' = 'purchase') => {
    if (!courseData || enrolling) return
    if (!isAuthenticated) {
      toast.error(t('course_detail.login_to_enroll'))
      navigate('/login')
      return
    }
    setEnrolling(true)
    try {
      await createEnrollment({ course_id: courseData.id, source })
      toast.success(t('course_detail.enroll_success'), { description: courseData.title })
      refreshOwned()
      navigate(`/course-player/${courseData.id}`)
    } catch (err: any) {
      toast.error(err?.message || t('course_detail.enroll_failed'))
    } finally {
      setEnrolling(false)
    }
  }


  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const params = extractRouteParams('/course/:id', currentRoute)
        const courseId = Number(params?.id)
        if (!courseId || isNaN(courseId)) {
          setError(t('course_detail.invalid_course_id'))
          return
        }
        const data = await getCourseById(courseId)
        if (!cancelled) {
          setCourseData(data)
          getCoursePromotions(courseId).then(setCoursePromos).catch((e) => console.error('getCoursePromotions failed:', e))
        }
      } catch (err: any) {
        if (!cancelled) setError(getErrorMessage(err, t('course_detail.load_failed')))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentRoute])


  const loadReviews = useCallback(async (courseId: number) => {
    setReviewsLoading(true)
    try {

      const res = await getReviewsByCourse(courseId, 1, 50)
      setReviews(res.results)
    } catch (err) {
      console.error('[CourseDetail] Failed to load reviews:', err)
    }
    setReviewsLoading(false)
  }, [])

  useEffect(() => {
    if (courseData) loadReviews(courseData.id)
  }, [courseData, loadReviews])

  useEffect(() => {
    let cancelled = false

    async function loadRelatedCourses() {
      if (!courseData?.category?.category_id) {
        setRelatedCourses([])
        return
      }

      setRelatedCourses([])
      try {
        const res = await getCourses({
          category_id: courseData.category.category_id,
          status: 'published',
          ordering: '-total_students',
          page_size: 8,
        })
        if (!cancelled) {
          setRelatedCourses(
            res.results
              .filter((course) => course.id !== courseData.id && isPublicCourseListItem(course))
              .slice(0, 4)
          )
        }
      } catch (err) {
        console.error('[CourseDetail] Failed to load related courses:', err)
        if (!cancelled) setRelatedCourses([])
      }
    }

    loadRelatedCourses()
    return () => { cancelled = true }
  }, [courseData?.category?.category_id, courseData?.id])

  useEffect(() => {
    let cancelled = false

    async function loadInstructorCourses() {
      if (!courseData?.instructor?.instructor_id) {
        setInstructorCourses([])
        return
      }

      setInstructorCourses([])
      try {
        const res = await getCourses({
          instructor_id: courseData.instructor.instructor_id,
          status: 'published',
          ordering: '-total_students',
          page_size: 8,
        })
        if (!cancelled) {
          setInstructorCourses(
            res.results
              .filter((course) => course.id !== courseData.id && isPublicCourseListItem(course))
              .slice(0, 4)
          )
        }
      } catch (err) {
        console.error('[CourseDetail] Failed to load instructor courses:', err)
        if (!cancelled) setInstructorCourses([])
      }
    }

    loadInstructorCourses()
    return () => { cancelled = true }
  }, [courseData?.instructor?.instructor_id, courseData?.id])


  const rawEffectivePrice = courseData ? getEffectivePrice(courseData) : 0
  const regularPrice = courseData ? parseDecimal(courseData.price) : 0

  const effectivePrice = discountExpired ? regularPrice : rawEffectivePrice
  const courseRating = courseData ? parseDecimal(courseData.rating) : 0
  const hasDiscount = !discountExpired && effectivePrice < regularPrice
  const discountEndDate = courseData?.discount_end_date || null
  const needsSubscriptionEnrollment = canAccessCourse && accessType === 'subscription' && !!accessInfo?.requires_enrollment
  const canGoToPlayerDirectly = canAccessCourse && !needsSubscriptionEnrollment

  const renderRecommendationCards = (courses: CourseListItem[]) => (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 360px))',
        justifyContent: 'start',
      }}
    >
      {courses.map((course, index) => {
        const recommendationPrice = getEffectivePrice(course)
        const recommendationRegularPrice = parseDecimal(course.price)
        const recommendationRating = parseDecimal(course.rating)
        const showRegularPrice = hasActiveDiscount(course) && recommendationRegularPrice > recommendationPrice

        return (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={listItemTransition(index)}
          >
            <button
              type="button"
              onClick={() => navigate(`/course/${course.id}`)}
              className="group flex h-full w-full overflow-hidden rounded-lg border bg-card text-left text-card-foreground transition-colors"
            >
              <div className="h-24 w-32 shrink-0 overflow-hidden bg-muted">
                <ImageWithFallback
                  src={course.thumbnail || ''}
                  alt={course.title}
                  className="h-24 w-32 object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-3">
                <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                  {course.title}
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {course.instructor_name || t('course_detail.by_instructor')}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {recommendationRating.toFixed(1)}
                  </span>
                  <span>({course.total_reviews.toLocaleString()})</span>
                  <span>{formatDuration(course.duration)}</span>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  <span className="text-sm font-bold text-foreground">{formatPrice(recommendationPrice)}</span>
                  {showRegularPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(recommendationRegularPrice)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </motion.div>
        )
      })}
    </div>
  )

  const handleAddToCart = async () => {
    if (!courseData) return

    if (isInCartByCourseId(courseData.id)) {
      navigate('/cart')
      return
    }


    if (isAuthenticated && user?.id) {
      await addToCartFromApi(parseInt(user.id), courseData.id, { suppressSuccessToast: true })
    } else {

      addToCart({
        id: String(courseData.id),
        courseId: courseData.id,
        title: courseData.title,
        instructor: courseData.instructor?.full_name || t('course_detail.by_instructor'),
        originalPrice: regularPrice,
        currentPrice: effectivePrice,
        image: courseData.thumbnail || '',
        rating: courseRating,
        studentsCount: courseData.total_students,
        duration: formatDuration(courseData.duration)
      }, { suppressSuccessToast: true })
    }
    toast.success(t('course_detail.added_to_cart_toast'), { description: courseData.title })
  }

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !courseData?.id) {
      return
    }
    void loadCart(parseInt(user.id))
  }, [courseData?.id, isAuthenticated, loadCart, user?.id])

  const handleBuyNow = async () => {
    await handleAddToCart()
    navigate('/cart')
  }

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !user || !courseData || submittingReview) return
    setSubmittingReview(true)
    try {
      if (currentUserReview) {
        await updateReview(currentUserReview.review_id, { rating: newRating, comment: newComment })
        toast.success(t('course_detail.review_updated'))
        setEditingOwnReview(false)
      } else {
        await createReview({ course: courseData.id, rating: newRating, comment: newComment || undefined })
        toast.success(t('course_detail.review_submitted'))
      }
      setNewComment('')
      setNewRating(5)
      loadReviews(courseData.id)
    } catch (err: any) {
      toast.error(err?.message || t('course_detail.review_submit_failed'))
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleEditOwnReview = () => {
    if (!currentUserReview) return
    setNewRating(currentUserReview.rating)
    setNewComment(currentUserReview.comment || '')
    setEditingOwnReview(true)
  }

  const handleReportReview = async (review: Review) => {
    if (!isAuthenticated) {
      toast.error(t('course_detail.login_to_report_review'))
      navigate('/login')
      return
    }

    const reason = window.prompt(t('course_detail.report_review_prompt'))
    if (reason === null) return

    try {
      await reportReview(review.review_id, reason.trim())
      toast.success(t('course_detail.review_reported'))
      if (courseData) {
        loadReviews(courseData.id)
      }
    } catch (err: any) {
      toast.error(err?.message || t('course_detail.review_report_failed'))
    }
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-gray-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >


      {loading && (
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      )}


      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <Button onClick={() => navigate('/courses')}>{t('course_detail.back_to_courses')}</Button>
        </div>
      )}


      {courseData && !loading && !error && (
      <motion.div
        variants={sectionStagger}
        initial="hidden"
        animate="show"
      >


      <CourseStickyNav
        courseTitle={courseData.title}
        price={canAccessCourse || isFree ? 0 : effectivePrice}
        originalPrice={canAccessCourse || isFree ? undefined : regularPrice}
        isInCart={isInCartByCourseId(courseData.id)}
        primaryActionLabel={
          canGoToPlayerDirectly
            ? t('common.go_to_course')
            : needsSubscriptionEnrollment
              ? t('course_detail.enroll_course')
              : isFree
                ? t('course_detail.enroll_free')
                : t('course_detail.buy_now')
        }
        showAddToCart={!(canGoToPlayerDirectly || needsSubscriptionEnrollment || isFree)}
        onAddToCart={canGoToPlayerDirectly ? () => navigate(`/course-player/${courseData.id}`) : isFree ? () => handleEnroll('purchase') : handleAddToCart}
        onBuyNow={canGoToPlayerDirectly ? () => navigate(`/course-player/${courseData.id}`) : needsSubscriptionEnrollment ? () => handleEnroll('subscription') : isFree ? () => handleEnroll('purchase') : handleBuyNow}
        sidebarCardRef={sidebarCardInnerRef}
      />


      <motion.div className="relative bg-gray-900 dark:bg-gray-950 text-white py-8 overflow-hidden" variants={fadeInUp}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${courseData.thumbnail || ''})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/80" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <CourseBreadcrumb items={[
                { label: t('sidebar.home'), href: '/' },
                ...(courseData.category ? [{ label: courseData.category.name, href: `/courses?category=${courseData.category.category_id}` }] : []),
                ...(courseData.subcategory ? [{ label: courseData.subcategory.name, href: `/courses?category=${courseData.subcategory.category_id}` }] : []),
              ]} />


              {subscriptionPlan && (
                subscriptionPlan.owned ? (
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                    <Crown className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {t('course_detail.in_owned_plan', { plan: subscriptionPlan.name })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 animate-pulse hover:opacity-90 transition-opacity"
                  >
                    <Crown className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {t('course_detail.in_plan_cta', { plan: subscriptionPlan.name })}
                  </button>
                )
              )}

              <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{courseData.title}</h1>
              <p className="text-base text-gray-300 sm:text-lg lg:text-xl">{courseData.shortdescription || ''}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm mt-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{courseRating.toFixed(1)}</span>
                  <span className="text-purple-400 underline">({courseData.total_reviews.toLocaleString()} {t('course_detail.ratings_count', { count: '' }).replace('{{count}} ', '')})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{courseData.total_students >= 1000 ? `${Math.floor(courseData.total_students / 1000)}K` : courseData.total_students} {t('common.students')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{t('course_detail.last_updated_label')} {courseData.updated_at ? new Date(courseData.updated_at).toLocaleDateString() : ''}</span>
                </div>
                 <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span>{courseData.language}</span>
                </div>
              </div>
            </div>


            <div className="hidden lg:block relative min-h-[500px]" ref={sidebarCardRef}>
              <div
                  ref={sidebarCardInnerRef}
                className={`w-[360px] app-surface-elevated shadow-2xl rounded-lg overflow-hidden z-40 ${
                    cardPosition === 'fixed'
                      ? 'fixed top-[8.5rem]'
                      : cardPosition === 'docked'
                        ? 'absolute bottom-0 right-0'
                        : ''
                  }`}
               >

                  <div
                    className={`relative h-48 bg-black overflow-hidden ${hasPreview ? 'group cursor-pointer' : ''}`}
                    onClick={hasPreview ? openPreview : undefined}
                  >
                    <img src={courseData.thumbnail || ''} alt={t('course_detail.preview_alt')} className={`w-full h-full object-cover ${hasPreview ? 'opacity-80 group-hover:opacity-60 transition-opacity' : 'opacity-60'}`} />

                    {hasPreview ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-8 h-8 text-white fill-white" />
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 text-center text-white font-medium">
                          {t('course_detail.preview_course')}
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white/70 text-sm font-medium">{t('course_detail.no_preview_available')}</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6 space-y-6">
                     {canGoToPlayerDirectly ? (

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-green-600">
                                {accessType === 'purchase' ? t('course_detail.purchased') : accessType === 'subscription' ? t('course_detail.subscription_plan') : t('course_detail.owned')}
                              </span>
                              <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                                {accessType === 'purchase' ? t('course_detail.purchased') : accessType === 'subscription' ? t('course_detail.subscription_plan') : t('course_detail.active')}
                              </Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                              {t('course_detail.full_access_desc')}
                           </p>
                           <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" onClick={() => navigate(`/course-player/${courseData.id}`)}>
                              <Play className="w-5 h-5 mr-2" />
                              {t('course_detail.start_learning_now')}
                           </Button>
                        </div>
                     ) : needsSubscriptionEnrollment ? (

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-blue-600">{t('course_detail.included_in_subscription')}</span>
                              <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">{t('course_detail.subscription_plan')}</Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                              {t('course_detail.subscription_enroll_desc')}
                           </p>
                           <Button
                              className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleEnroll('subscription')}
                              disabled={enrolling}
                           >
                              {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                              {t('course_detail.enroll_course')}
                           </Button>
                        </div>
                     ) : !canAccessCourse && isFree ? (

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-green-600">{t('common.free')}</span>
                              <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">{t('common.free')}</Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                              {t('course_detail.free_course_desc')}
                           </p>
                           <Button
                              className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
                              onClick={() => handleEnroll('purchase')}
                              disabled={enrolling}
                           >
                              {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                              {t('course_detail.enroll_free')}
                           </Button>
                        </div>
                     ) : (

                        <div className="space-y-4">

                           {hasDiscount && discountEndDate && (
                              <DiscountCountdown endDate={discountEndDate} onExpire={handleDiscountExpire} variant="banner" />
                           )}

                           {coursePromos.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                 {coursePromos.map((promo) => (
                                    <div key={promo.id} className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                       <Tag className="h-3 w-3" />
                                       <span>Giảm {formatDiscountValue(promo.discount_type, promo.discount_value)} · mã: <span className="font-mono font-semibold">{promo.code}</span></span>
                                    </div>
                                 ))}
                              </div>
                           )}

                           <div className="flex items-end gap-3">
                              <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                                 {formatPrice(effectivePrice)}
                              </span>
                              {effectivePrice < regularPrice && (
                              <span className="text-lg text-slate-500 line-through mb-1">
                                 {formatPrice(regularPrice)}
                              </span>
                              )}
                              {hasDiscount && regularPrice > 0 && (
                              <span className="text-sm font-bold text-red-600 mb-1">
                                 -{Math.round(((regularPrice - effectivePrice) / regularPrice) * 100)}%
                              </span>
                              )}
                           </div>


                           {isCourseInSubscription && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                                       <Zap className="w-4 h-4 fill-blue-500 text-blue-500" />
                                       {t('course_detail.with_pro_plan', { plan: subscriptionPlan?.name || 'Pro' })}
                                    </span>
                                    <span className="font-bold text-blue-600">{t('course_detail.included')}</span>
                                 </div>
                                 <Button
                                    variant="secondary"
                                    className="w-full bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-white border-none h-8 text-xs font-semibold"
                                    onClick={() => navigate('/pricing')}
                                 >
                                    {t('course_detail.save_with_subscription')}
                                 </Button>
                              </div>
                           )}

                          <div className="space-y-3 pt-2">
                            <Button className="w-full h-12 text-lg font-bold" onClick={handleAddToCart}>
                              {isInCartByCourseId(courseData.id) ? t('course_sticky_nav.go_to_cart') : t('course_detail.add_to_cart')}
                            </Button>
                            {!isInCartByCourseId(courseData.id) && (
                              <Button variant="outline" className="w-full h-12 font-semibold" onClick={handleBuyNow}>
                                {t('course_detail.buy_now')}
                              </Button>
                            )}
                          </div>
                           <p className="text-xs text-center text-muted-foreground">
                              {t('course_detail.money_back')}
                           </p>
                        </div>
                     )}

                     <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleOpenCourseReport}
                     >
                        <Flag className="h-4 w-4" />
                        Báo cáo khóa học
                     </Button>

                     <div className="space-y-2 pt-2">
                        <h4 className="font-semibold text-sm">{t('course_detail.course_includes_title')}</h4>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                           {courseData.duration_hours != null && (
                              <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><Clock className="w-4 h-4" /></div> {t('course_detail.on_demand_video', { hours: courseData.duration_hours })}</li>
                           )}
                           {courseData.total_resources != null && courseData.total_resources > 0 && (
                              <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><FileText className="w-4 h-4" /></div> {t('course_detail.downloadable_resources', { total: courseData.total_resources })}</li>
                           )}
                           <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><Globe className="w-4 h-4" /></div> {t('course_detail.access_mobile_tv')}</li>
                           {courseData.certificate && (
                              <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><Crown className="w-4 h-4" /></div> {t('course_detail.certificate')}</li>
                           )}
                        </ul>
                     </div>
                  </CardContent>
               </div>
            </div>
          </div>
        </div>
      </motion.div>


      <motion.div className="container mx-auto px-4 py-8" variants={fadeInUp}>
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">


          <div className="lg:hidden mb-8">
            <Card className="app-surface-elevated overflow-hidden">
               <div
                 className={`relative aspect-video bg-black overflow-hidden ${hasPreview ? 'group cursor-pointer' : ''}`}
                 onClick={hasPreview ? openPreview : undefined}
               >
                  <img src={courseData.thumbnail || ''} alt={t('course_detail.preview_alt')} className={`w-full h-full object-cover ${hasPreview ? '' : 'opacity-60'}`} />

                  {hasPreview ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/70 text-sm font-medium">{t('course_detail.no_preview_available')}</span>
                    </div>
                  )}
               </div>
               <CardContent className="space-y-6 p-4 sm:p-6">
                  {canGoToPlayerDirectly ? (

                      <div className="space-y-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-2xl font-bold text-green-600">
                              {accessType === 'purchase' ? t('course_detail.purchased') : accessType === 'subscription' ? t('course_detail.subscription_plan') : t('course_detail.owned')}
                            </span>
                            <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                              {accessType === 'purchase' ? t('course_detail.purchased') : accessType === 'subscription' ? t('course_detail.subscription_plan') : t('course_detail.active')}
                            </Badge>
                          </div>
                          <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" onClick={() => navigate(`/course-player/${courseData.id}`)}>
                            <Play className="w-5 h-5 mr-2" />
                            {t('common.go_to_course')}
                          </Button>
                      </div>
                  ) : needsSubscriptionEnrollment ? (

                      <div className="space-y-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-2xl font-bold text-blue-600">{t('course_detail.included_in_subscription')}</span>
                            <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">{t('course_detail.subscription_plan')}</Badge>
                          </div>
                          <Button
                            className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleEnroll('subscription')}
                            disabled={enrolling}
                          >
                            {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                            {t('course_detail.enroll_course')}
                          </Button>
                      </div>
                  ) : !canAccessCourse && isFree ? (

                      <div className="space-y-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-2xl font-bold text-green-600">{t('common.free')}</span>
                            <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">{t('common.free')}</Badge>
                          </div>
                          <Button
                            className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
                            onClick={() => handleEnroll('purchase')}
                            disabled={enrolling}
                          >
                            {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                            {t('course_detail.enroll_free')}
                          </Button>
                      </div>
                  ) : (

                      <div className="space-y-4">

                        {hasDiscount && discountEndDate && (
                            <DiscountCountdown endDate={discountEndDate} onExpire={handleDiscountExpire} variant="banner" />
                        )}

                        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                                {formatPrice(effectivePrice)}
                            </span>
                            {effectivePrice < regularPrice && (
                            <span className="text-lg text-slate-500 line-through mb-1">
                                {formatPrice(regularPrice)}
                            </span>
                            )}
                            {hasDiscount && regularPrice > 0 && (
                            <span className="text-sm font-bold text-red-600 mb-1">
                                -{Math.round(((regularPrice - effectivePrice) / regularPrice) * 100)}%
                            </span>
                            )}
                        </div>

                        {isCourseInSubscription && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                                    <Zap className="w-4 h-4 fill-blue-500 text-blue-500" />
                                    {t('course_detail.with_pro_plan', { plan: subscriptionPlan?.name || 'Pro' })}
                                </span>
                                <span className="font-bold text-blue-600">{t('course_detail.included')}</span>
                                </div>
                                <Button
                                variant="secondary"
                                className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-white border-none h-8 text-xs font-semibold"
                                onClick={() => navigate('/pricing')}
                                >
                                {t('course_detail.save_with_subscription')}
                                </Button>
                              </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <Button className="w-full h-12 text-lg font-bold" onClick={handleAddToCart}>
                              {isInCartByCourseId(courseData.id) ? t('course_sticky_nav.go_to_cart') : t('course_detail.add_to_cart')}
                            </Button>
                            {!isInCartByCourseId(courseData.id) && (
                              <Button variant="outline" className="w-full h-12 font-semibold" onClick={handleBuyNow}>
                                  {t('course_detail.buy_now')}
                              </Button>
                            )}
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                            {t('course_detail.money_back')}
                        </p>
                      </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleOpenCourseReport}
                  >
                    <Flag className="h-4 w-4" />
                    Báo cáo khóa học
                  </Button>
               </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">


            {courseData.requirements && (
            <Card>
              <CardHeader><CardTitle>{t('course_detail.what_you_learn')}</CardTitle></CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: courseData.requirements }} />
              </CardContent>
            </Card>
            )}


            <Card>
               <CardHeader>
                 <CardTitle>{t('course_detail.course_content')}</CardTitle>
                 <CardDescription>
                   {t('course_detail.content_summary', {
                     modules: courseData.total_modules,
                     modulesLabel: t('course_detail.modules_count'),
                     lessons: visibleLessonCount,
                     lecturesLabel: t('course_detail.lectures_count'),
                     duration: formatDuration(visibleDuration),
                   })}
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-2">
                  <Accordion type="multiple" className="w-full">
                  {visibleCourseModules.map((mod) => {
                    const moduleDuration = mod.lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0)
                    return (
                    <AccordionItem key={mod.module_id} value={String(mod.module_id)}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex w-full flex-col gap-1 pr-4 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-medium">{mod.title}</span>
                          <span className="text-sm text-muted-foreground">
                            {t('course_detail.module_summary', {
                              lessons: mod.lessons.length,
                              lecturesLabel: t('course_detail.lectures_count'),
                              duration: formatDuration(moduleDuration),
                            })}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          {(mod.lessons || []).map((lesson) => {
                            const canPreview =
                              (lesson.is_free || canAccessCourse) &&
                              lesson.content_type === 'video' &&
                              !!lesson.signed_video_url
                            return (
                            <div
                              key={lesson.lesson_id}
                              onClick={canPreview ? () => openLessonPreview(lesson) : undefined}
                              className={`flex flex-col gap-2 py-2 px-3 rounded sm:flex-row sm:items-center sm:justify-between ${
                                !lesson.is_free && !canAccessCourse
                                  ? 'opacity-70 hover:bg-transparent cursor-not-allowed'
                                  : canPreview
                                    ? 'hover:bg-secondary/50 cursor-pointer'
                                    : 'hover:bg-secondary/50'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Play className="w-4 h-4" />
                                <span className="text-sm break-words">{lesson.title}</span>
                                {lesson.is_free ? (
                                  <Badge variant="outline" className="text-xs">{t('course_detail.preview_badge')}</Badge>
                                ) : !canAccessCourse ? (
                                   <Lock className="w-3 h-3 text-muted-foreground" />
                                ) : null}
                              </div>
                              <span className="text-sm text-muted-foreground">{formatDuration(lesson.duration)}</span>
                            </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    )
                  })}
                </Accordion>
               </CardContent>
            </Card>


            {courseData.promotional_video && (
            <Card className="overflow-hidden relative">
               <CardHeader><CardTitle>{t('course_detail.sample_lecture')}</CardTitle></CardHeader>
               <div className="relative aspect-video bg-slate-900 w-full">
                  {!canAccessCourse && (
                     <SubscriptionLockOverlay
                        title={t('course_detail.locked_content_title')}
                        description={t('course_detail.locked_content_desc')}
                        backgroundImage={courseData.thumbnail || ''}
                     />
                  )}
                  {(canAccessCourse) && (
                     <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                           <Play className="w-16 h-16 mx-auto mb-4 opacity-80 hover:opacity-100 cursor-pointer" />
                           <p>{t('course_detail.click_to_play')}</p>
                        </div>
                     </div>
                  )}
               </div>
            </Card>
            )}


            {courseData.instructor && (
            <Card>
               <CardHeader><CardTitle>{t('course_detail.instructor_title')}</CardTitle></CardHeader>
               <CardContent>
                  <div className="flex flex-col gap-4 sm:flex-row">
                     <button
                       type="button"
                       onClick={handleOpenInstructorProfile}
                       className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                       aria-label={t('course_detail.view_instructor_profile', { name: courseData.instructor.full_name })}
                     >
                       <Avatar className="w-20 h-20 cursor-pointer">
                         <AvatarImage src={courseData.instructor.avatar || undefined} alt={courseData.instructor.full_name} />
                         <AvatarFallback className="text-xl font-semibold">
                           {getInitials(courseData.instructor.full_name)}
                         </AvatarFallback>
                       </Avatar>
                     </button>
                     <div>
                        <button
                          type="button"
                          onClick={handleOpenInstructorProfile}
                          className="font-bold text-lg text-blue-600 underline underline-offset-2 hover:text-blue-700"
                        >
                          {courseData.instructor.full_name}
                        </button>
                        <p className="text-muted-foreground">{courseData.instructor.specialization || ''}</p>
                        <p className="mt-2 text-sm">{courseData.instructor.bio || ''}</p>
                        {/* chat feature hidden across all roles
                        {Number(user?.id) !== courseData.instructor.user_id && (
                          <Button className="mt-3" variant="outline" onClick={() => void handleMessageInstructor()}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t('course_detail.message_instructor')}
                          </Button>
                        )} */}
                     </div>
                  </div>
               </CardContent>
            </Card>
            )}


            {relatedCourses.length > 0 && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">{t('course_detail.related_courses')}</h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      {t('course_detail.related_courses_desc', {
                        category: courseData.category?.name || t('common.courses'),
                      })}
                    </p>
                  </div>
                  {courseData.category && (
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium"
                      onClick={() => navigate(`/courses?category=${courseData.category?.category_id}`)}
                    >
                      {t('course_detail.view_all_related')}
                    </button>
                  )}
                </div>
                {renderRecommendationCards(relatedCourses)}
              </section>
            )}


            {instructorCourses.length > 0 && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">{t('course_detail.instructor_courses')}</h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      {t('course_detail.instructor_courses_desc', {
                        instructor: courseData.instructor?.full_name || t('course_detail.by_instructor'),
                      })}
                    </p>
                  </div>
                  {courseData.instructor?.instructor_id && (
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium"
                      onClick={handleOpenInstructorProfile}
                    >
                      {t('course_detail.view_instructor_profile_short')}
                    </button>
                  )}
                </div>
                {renderRecommendationCards(instructorCourses)}
              </section>
            )}


            <div className="space-y-4" id="reviews">
               <h3 className="text-xl font-bold">{t('course_detail.student_feedback')}</h3>

               {isArchivedCourse && (
                 <Card className="mb-4 border-amber-300 bg-amber-50">
                   <CardContent className="p-4 text-sm text-amber-800">
                     {t('course_detail.archived_banner', 'Khóa học này đã được lưu trữ và không còn nhận hỗ trợ từ giảng viên. Bạn vẫn có thể xem nội dung đã mua.')}
                   </CardContent>
                 </Card>
               )}

               {isAuthenticated && canAccessCourse && !isArchivedCourse && !canReviewCourse && (
                 <Card className="mb-4">
                   <CardContent className="p-4 text-sm text-muted-foreground">
                     {t('course_detail.review_requires_progress', 'Bạn cần học hơn 50% khóa học trước khi đánh giá.')}
                   </CardContent>
                 </Card>
               )}

               {isAuthenticated && canReviewCourse && currentUserReview && !editingOwnReview && (
                 <Card className="mb-4">
                   <CardContent className="p-4 space-y-3">
                     <div className="flex flex-wrap items-start justify-between gap-3">
                       <div>
                         <p className="font-medium">{t('course_detail.your_review')}</p>
                         <div className="mt-2 flex items-center gap-1">
                           {[1, 2, 3, 4, 5].map((s) => (
                             <Star key={s} className={`h-5 w-5 ${s <= currentUserReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                           ))}
                           <span className="ml-2 text-sm text-muted-foreground">{currentUserReview.rating}/5</span>
                         </div>
                       </div>
                       <Button size="sm" variant="outline" onClick={handleEditOwnReview}>
                         <Edit2 className="h-4 w-4 mr-1" />
                         {t('course_detail.edit_review')}
                       </Button>
                     </div>
                     {currentUserReview.comment && (
                       <p className="text-sm text-muted-foreground">{currentUserReview.comment}</p>
                     )}
                   </CardContent>
                 </Card>
               )}

               {isAuthenticated && canReviewCourse && (!currentUserReview || editingOwnReview) && (
                 <Card className="mb-4">
                   <CardContent className="p-4 space-y-3">
                     <p className="font-medium">
                       {currentUserReview ? t('course_detail.edit_review') : t('course_detail.write_review')}
                     </p>
                     <div className="flex items-center gap-1">
                       {[1, 2, 3, 4, 5].map((s) => (
                         <button key={s} onClick={() => setNewRating(s)} className="focus:outline-none">
                           <Star className={`h-5 w-5 ${s <= newRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                         </button>
                       ))}
                       <span className="ml-2 text-sm text-muted-foreground">{newRating}/5</span>
                     </div>
                     <textarea
                       value={newComment}
                       onChange={(e) => setNewComment(e.target.value)}
                       placeholder={t('course_detail.review_placeholder')}
                       className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-y"
                     />
                     <div className="flex flex-wrap gap-2">
                       <Button size="sm" onClick={handleSubmitReview} disabled={submittingReview}>
                         {submittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                         {currentUserReview ? t('course_detail.update_review') : t('course_detail.submit_review')}
                       </Button>
                       {editingOwnReview && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => {
                             setEditingOwnReview(false)
                             setNewComment('')
                             setNewRating(5)
                           }}
                         >
                           {t('common.cancel')}
                         </Button>
                       )}
                     </div>
                   </CardContent>
                 </Card>
               )}


               {reviewsLoading ? (
                 <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
               ) : reviews.length === 0 ? (
                 <p className="text-muted-foreground text-sm py-4">{t('course_detail.no_reviews')}</p>
               ) : (
                 <div className="space-y-4">
                   {reviews.map((r, index) => (
                     <motion.div
                       key={r.review_id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={listItemTransition(index)}
                     >
                     <Card>
                       <CardContent className="p-4">
                         <div className="flex items-start gap-3">
                           <Avatar className="w-10 h-10">
                             <AvatarImage
                               src={r.user_info?.avatar || undefined}
                               alt={r.user_info?.full_name || t('course_detail.user_fallback')}
                             />
                             <AvatarFallback className="text-xs font-medium">
                               {getInitials(r.user_info?.full_name || t('course_detail.user_fallback'))}
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                               <span className="font-medium text-sm">{r.user_info?.full_name || t('course_detail.user_fallback')}</span>
                               <div className="flex">
                                 {[1, 2, 3, 4, 5].map((s) => (
                                   <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                 ))}
                               </div>
                               <span className="text-xs text-muted-foreground">
                                 {new Date(r.review_date).toLocaleDateString('vi-VN')}
                               </span>
                             </div>
                             {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                             {isAuthenticated && user?.id !== String(r.user) && (
                               <div className="mt-2">
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   className="h-8 px-2 text-xs text-muted-foreground"
                                   onClick={() => void handleReportReview(r)}
                                 >
                                   <Flag className="h-3.5 w-3.5 mr-1" />
                                    {t('course_detail.report_review')}
                                 </Button>
                               </div>
                             )}
                             {r.instructor_response && (
                               <div className="mt-2 ml-4 p-2 bg-muted rounded text-sm">
                                 <p className="font-medium text-xs text-primary mb-1">{t('course_detail.instructor_response')}</p>
                                 <p>{r.instructor_response}</p>
                               </div>
                             )}
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                     </motion.div>
                   ))}
                 </div>
               )}
            </div>

          </div>
        </div>
      </motion.div>
      </motion.div>)}

      {previewLesson && (
        <LessonPreviewModal
          open={!!previewLesson}
          onOpenChange={(open) => { if (!open) setPreviewLesson(null) }}
          lesson={previewLesson}
          isPublic
        />
      )}
      {courseData && (
        <ReportDialog
          open={courseReportOpen}
          onOpenChange={setCourseReportOpen}
          targetType="course"
          targetId={courseData.id}
          contentLabel={courseData.title}
        />
      )}
    </motion.div>
  )
}

