import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from "../../components/Router"
import { useCart } from "../../contexts/CartContext"
import { useAuth } from "../../contexts/AuthContext"
import { ImageWithFallback } from "../../components/figma/ImageWithFallback"
import { CourseCategoryTags } from "../../components/CourseCategoryTags"
import { CourseBreadcrumb } from "../../components/CourseBreadcrumb"
import { CourseStickyNav } from "../../components/CourseStickyNav"
import { LearningGoals } from "../../components/LearningGoals"
import { toast } from "sonner@2.0.3"
import { getCourseById, type CourseDetail, parseDecimal, getEffectivePrice, formatPrice, getLevelLabel, formatDuration } from "../../services/course.api"
import { extractRouteParams } from "../../utils/routeHelpers"
import { getAllWishlistByUser, addToWishlist, removeFromWishlist, type WishlistItem } from "../../services/wishlist.api"
import { getReviewsByCourse, createReview, type Review } from "../../services/review.api"
import { DiscountCountdown } from "../../components/DiscountCountdown"
import { useOwnedCourses } from "../../hooks/useOwnedCourses"
import { createEnrollment } from "../../services/enrollment.api"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion"
import { Avatar } from "../../components/ui/avatar"
import { SubscriptionLockOverlay } from '../../components/subscription/SubscriptionLockOverlay'
import { useTranslation } from 'react-i18next'
import { 
  Star, Users, Clock, Globe, Languages, Play, FileText, 
  Check, Zap, Crown, Lock, Loader2, MessageSquare, BookOpen
} from 'lucide-react'

export function CourseDetailPage() {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState<number | null>(null)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const { t } = useTranslation()
  
  // Course data from API
  const [courseData, setCourseData] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [discountExpired, setDiscountExpired] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  
  const handleDiscountExpire = useCallback(() => {
    setDiscountExpired(true)
  }, [])
  
  const sidebarCardRef = useRef<HTMLDivElement>(null)       // container in hero grid (for scroll position)
  const sidebarCardInnerRef = useRef<HTMLDivElement>(null)  // the actual card (follows fixed/docked)
  const [cardPosition, setCardPosition] = useState<'natural' | 'fixed' | 'docked'>('natural')
  
  const { addToCart, addToCartFromApi, isInCartByCourseId } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { navigate, currentRoute } = useRouter()
  const { isOwned: isEnrolled, refresh: refreshOwned } = useOwnedCourses()

  // Scroll listener: manage sidebar card position (natural → fixed → docked)
  useEffect(() => {
    const handleScroll = () => {
      const container = sidebarCardRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const topThreshold = 136 // 8.5rem = nav height offset
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

  // Derived from API access_info
  const accessInfo = courseData?.access_info
  const canAccessCourse = accessInfo?.has_access || false
  const accessType = accessInfo?.access_type || null  // "purchase" | "subscription" | "admin" | "instructor" | null
  const isCourseInSubscription = accessInfo?.in_subscription || false

  // Determine if user is enrolled in this course
  const courseId = courseData?.id || 0
  const enrolled = isEnrolled(courseId)
  // Free course = effective price is 0
  const isFree = courseData ? getEffectivePrice(courseData) === 0 : false

  // Handle enrollment for free or subscription courses
  const handleEnroll = async (source: 'purchase' | 'subscription' = 'purchase') => {
    if (!courseData || enrolling) return
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đăng ký khóa học')
      navigate('/login')
      return
    }
    setEnrolling(true)
    try {
      await createEnrollment({ course_id: courseData.id, source })
      toast.success('Đăng ký khóa học thành công!', { description: courseData.title })
      refreshOwned()
      navigate(`/course-player/${courseData.id}`)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đăng ký khóa học')
    } finally {
      setEnrolling(false)
    }
  }

  // Load course from API
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const params = extractRouteParams('/course/:id', currentRoute)
        const courseId = Number(params?.id)
        if (!courseId || isNaN(courseId)) {
          setError('Invalid course ID')
          return
        }
        const data = await getCourseById(courseId)
        if (!cancelled) setCourseData(data)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load course')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentRoute])

  // Load wishlist status for current user
  useEffect(() => {
    if (!isAuthenticated || !user || !courseData) return
    let cancelled = false
    async function loadWishlist() {
      try {
        const items = await getAllWishlistByUser(Number(user!.id))
        if (cancelled) return
        const match = items.find((w) => w.course === courseData!.id || (w as any).course_detail?.course_id === courseData!.id)
        if (match) {
          setIsWishlisted(true)
          setWishlistItemId(match.id)
        } else {
          setIsWishlisted(false)
          setWishlistItemId(null)
        }
      } catch { /* silently ignore */ }
    }
    loadWishlist()
    return () => { cancelled = true }
  }, [isAuthenticated, user, courseData])

  // Load reviews
  const loadReviews = useCallback(async (courseId: number) => {
    setReviewsLoading(true)
    try {
      // pass numeric page and pageSize - avoid passing an object which serializes to "[object Object]"
      const res = await getReviewsByCourse(courseId, 1, 50)
      setReviews(res.results)
    } catch { /* ignore */ }
    setReviewsLoading(false)
  }, [])

  useEffect(() => {
    if (courseData) loadReviews(courseData.id)
  }, [courseData, loadReviews])

  // Derived values
  const rawEffectivePrice = courseData ? getEffectivePrice(courseData) : 0
  const regularPrice = courseData ? parseDecimal(courseData.price) : 0
  // When discount expires, revert to regular price
  const effectivePrice = discountExpired ? regularPrice : rawEffectivePrice
  const courseRating = courseData ? parseDecimal(courseData.rating) : 0
  const hasDiscount = !discountExpired && effectivePrice < regularPrice
  const discountEndDate = courseData?.discount_end_date || null

  const handleAddToCart = async () => {
    if (!courseData) return
    
    // If logged in, use API to persist cart on server
    if (isAuthenticated && user?.id) {
      if (isInCartByCourseId(courseData.id)) {
        toast.info('Khóa học này đã có trong giỏ hàng')
        return
      }
      await addToCartFromApi(parseInt(user.id), courseData.id, {})
    } else {
      // Fallback: local-only for guests
      addToCart({
        id: String(courseData.id),
        courseId: courseData.id,
        title: courseData.title,
        instructor: courseData.instructor?.full_name || 'Instructor',
        originalPrice: regularPrice,
        currentPrice: effectivePrice,
        image: courseData.thumbnail || '',
        rating: courseRating,
        studentsCount: courseData.total_students,
        duration: formatDuration(courseData.duration)
      })
    }
    toast.success(t('course_detail.added_to_cart_toast'), { description: courseData.title })
  }

  const handleBuyNow = async () => {
    await handleAddToCart()
    navigate('/cart')
  }

  const handleWishlist = async () => {
    if (!isAuthenticated || !user || !courseData || wishlistLoading) return
    setWishlistLoading(true)
    try {
      if (isWishlisted && wishlistItemId) {
        await removeFromWishlist(wishlistItemId)
        setIsWishlisted(false)
        setWishlistItemId(null)
        toast.success(t('course_detail.wishlist_removed'))
      } else {
        const created = await addToWishlist({ user: Number(user.id), course: courseData.id })
        setIsWishlisted(true)
        setWishlistItemId(created.id)
        toast.success(t('course_detail.wishlist_added'))
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi cập nhật wishlist')
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !user || !courseData || submittingReview) return
    setSubmittingReview(true)
    try {
      await createReview({ course: courseData.id, rating: newRating, comment: newComment || undefined })
      toast.success('Đánh giá đã được gửi!')
      setNewComment('')
      setNewRating(5)
      loadReviews(courseData.id)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi đánh giá.')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      )}

      {/* Course Content */}
      {courseData && !loading && !error && (<>

      {/* Sticky Navigation Bar */}
      <CourseStickyNav
        courseTitle={courseData.title}
        price={canAccessCourse || isFree ? 0 : effectivePrice}
        originalPrice={canAccessCourse || isFree ? undefined : regularPrice}
        isInCart={false}
        isWishlisted={isWishlisted}
        onAddToCart={enrolled ? () => navigate(`/course-player/${courseData.id}`) : isFree ? () => handleEnroll('purchase') : handleAddToCart}
        onBuyNow={enrolled ? () => navigate(`/course-player/${courseData.id}`) : isFree ? () => handleEnroll('purchase') : handleBuyNow}
        onToggleWishlist={handleWishlist}
        sidebarCardRef={sidebarCardInnerRef}
      />

      {/* Hero Section */}
      <div className="relative bg-gray-900 dark:bg-gray-950 text-white py-8 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${courseData.thumbnail || ''})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/80" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <CourseBreadcrumb items={[
                { label: 'Home', href: '/' },
                ...(courseData.category ? [{ label: courseData.category.name, href: `/courses?category=${courseData.category.category_id}` }] : []),
                ...(courseData.subcategory ? [{ label: courseData.subcategory.name, href: `/courses?category=${courseData.subcategory.category_id}` }] : []),
              ]} />
              
              {/* Subscription Badge */}
              {isCourseInSubscription && !canAccessCourse && (
                 <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 animate-pulse">
                   <Crown className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                   {t('course_detail.included_in_pro_plan')}
                 </div>
              )}
              
              <h1 className="text-4xl font-bold">{courseData.title}</h1>
              <p className="text-xl text-gray-300">{courseData.shortdescription || ''}</p>
              
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
            
            {/* Desktop Sidebar Card */}
            <div className="hidden lg:block relative min-h-[500px]" ref={sidebarCardRef}>
               <div
                  ref={sidebarCardInnerRef}
                  className={`w-[360px] bg-white dark:bg-slate-900 shadow-2xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 z-40 ${
                    cardPosition === 'fixed'
                      ? 'fixed top-[8.5rem]'
                      : cardPosition === 'docked'
                        ? 'absolute bottom-0 right-0'
                        : ''
                  }`}
               >
                  {/* Video Preview Area */}
                  <div className="relative h-48 bg-black group cursor-pointer overflow-hidden">
                    <img src={courseData.thumbnail || ''} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                    
                    {/* Render Lock Overlay if it's a paid course and user is NOT subscribed */}
                    {/* Just for demo: We lock it if it's NOT a free preview logic, but here we just show play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-white fill-white" />
                       </div>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center text-white font-medium">
                       {t('course_detail.preview_course')}
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-6">
                     {canAccessCourse && enrolled ? (
                        /* VIEW: Already enrolled — go to player */
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-green-600">
                                {accessType === 'purchase' ? 'Đã mua' : accessType === 'subscription' ? 'Gói đăng ký' : 'Đã sở hữu'}
                              </span>
                              <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                                {accessType === 'purchase' ? 'Đã mua' : accessType === 'subscription' ? 'Subscription' : 'Active'}
                              </Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                              {t('course_detail.full_access_desc')}
                           </p>
                           <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" onClick={() => navigate(`/course-player/${courseData.id}`)}>
                              <Play className="w-5 h-5 mr-2" />
                              Vào học
                           </Button>
                        </div>
                     ) : canAccessCourse && !enrolled && accessType === 'subscription' ? (
                        /* VIEW: Has subscription access but not enrolled yet */
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-blue-600">Đã bao gồm trong gói</span>
                              <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">Subscription</Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                              Khóa học này nằm trong gói đăng ký của bạn. Đăng ký để bắt đầu học.
                           </p>
                           <Button 
                              className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700" 
                              onClick={() => handleEnroll('subscription')}
                              disabled={enrolling}
                           >
                              {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                              Đăng ký học
                           </Button>
                        </div>
                     ) : !canAccessCourse && isFree ? (
                        /* VIEW: Free course — enroll for free */
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-green-600">Miễn phí</span>
                              <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">Free</Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                              Khóa học này hoàn toàn miễn phí. Đăng ký ngay để bắt đầu học!
                           </p>
                           <Button 
                              className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" 
                              onClick={() => handleEnroll('purchase')}
                              disabled={enrolling}
                           >
                              {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                              Đăng ký miễn phí
                           </Button>
                        </div>
                     ) : (
                        /* VIEW: Non-subscribers / paid course */
                        <div className="space-y-4">
                           {/* Flash Sale Banner (above price) */}
                           {hasDiscount && discountEndDate && (
                              <DiscountCountdown endDate={discountEndDate} onExpire={handleDiscountExpire} variant="banner" />
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
                           
                           {/* Subscription Upsell */}
                           {isCourseInSubscription && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                                 <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                                       <Zap className="w-4 h-4 fill-blue-500 text-blue-500" /> 
                                       {t('course_detail.with_pro_plan')}
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
                                 {t('course_detail.add_to_cart')}
                              </Button>
                              <Button variant="outline" className="w-full h-12 font-semibold" onClick={handleBuyNow}>
                                 {t('course_detail.buy_now')}
                              </Button>
                           </div>
                           <p className="text-xs text-center text-muted-foreground">
                              {t('course_detail.money_back')}
                           </p>
                        </div>
                     )}

                     <div className="space-y-2 pt-2">
                        <h4 className="font-semibold text-sm">{t('course_detail.course_includes_title')}</h4>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                           <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><Clock className="w-4 h-4" /></div> {t('course_detail.on_demand_video')}</li>
                           <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><FileText className="w-4 h-4" /></div> {t('course_detail.downloadable_resources')}</li>
                           <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><Globe className="w-4 h-4" /></div> {t('course_detail.access_mobile_tv')}</li>
                           <li className="flex items-center gap-2"><div className="w-4 flex justify-center"><Crown className="w-4 h-4" /></div> {t('course_detail.certificate')}</li>
                        </ul>
                     </div>
                  </CardContent>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          
          {/* Mobile Pricing Card (Only visible on small screens) */}
          <div className="lg:hidden mb-8">
            <Card className="overflow-hidden">
               <div className="relative aspect-video bg-black group cursor-pointer overflow-hidden">
                  <img src={courseData.thumbnail || ''} alt="Preview" className="w-full h-full object-cover" />
                  {/* Play Button Overlay */}
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                   </div>
               </div>
               <CardContent className="p-6 space-y-6">
                  {canAccessCourse && enrolled ? (
                      /* Mobile: Already enrolled */
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-green-600">
                              {accessType === 'purchase' ? 'Đã mua' : accessType === 'subscription' ? 'Gói đăng ký' : 'Đã sở hữu'}
                            </span>
                            <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                              {accessType === 'purchase' ? 'Đã mua' : accessType === 'subscription' ? 'Subscription' : 'Active'}
                            </Badge>
                          </div>
                          <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" onClick={() => navigate(`/course-player/${courseData.id}`)}>
                            <Play className="w-5 h-5 mr-2" />
                            Vào học
                          </Button>
                      </div>
                  ) : canAccessCourse && !enrolled && accessType === 'subscription' ? (
                      /* Mobile: Has subscription but not enrolled */
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-blue-600">Đã bao gồm trong gói</span>
                            <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">Subscription</Badge>
                          </div>
                          <Button 
                            className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700" 
                            onClick={() => handleEnroll('subscription')}
                            disabled={enrolling}
                          >
                            {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                            Đăng ký học
                          </Button>
                      </div>
                  ) : !canAccessCourse && isFree ? (
                      /* Mobile: Free course */
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-green-600">Miễn phí</span>
                            <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">Free</Badge>
                          </div>
                          <Button 
                            className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700" 
                            onClick={() => handleEnroll('purchase')}
                            disabled={enrolling}
                          >
                            {enrolling ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookOpen className="w-5 h-5 mr-2" />}
                            Đăng ký miễn phí
                          </Button>
                      </div>
                  ) : (
                      /* Mobile: Paid course */
                      <div className="space-y-4">
                        {/* Flash Sale Banner (mobile) */}
                        {hasDiscount && discountEndDate && (
                            <DiscountCountdown endDate={discountEndDate} onExpire={handleDiscountExpire} variant="banner" />
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
                                    {t('course_detail.with_pro_plan')}
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
                                {t('course_detail.add_to_cart')}
                            </Button>
                            <Button variant="outline" className="w-full h-12 font-semibold" onClick={handleBuyNow}>
                                {t('course_detail.buy_now')}
                            </Button>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                            {t('course_detail.money_back')}
                        </p>
                      </div>
                  )}
               </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">
            
            {/* Learning Goals */}
            {courseData.requirements && (
            <Card>
              <CardHeader><CardTitle>{t('course_detail.what_you_learn')}</CardTitle></CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: courseData.requirements }} />
              </CardContent>
            </Card>
            )}

            {/* Course Content (from modules) */}
            <Card>
               <CardHeader>
                 <CardTitle>{t('course_detail.course_content')}</CardTitle>
                 <CardDescription>
                   {courseData.total_modules} modules • {courseData.total_lessons} {t('course_detail.lectures_count')} • {formatDuration(courseData.duration)}
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-2">
                  <Accordion type="multiple" className="w-full">
                  {(courseData.modules || []).map((mod) => (
                    <AccordionItem key={mod.module_id} value={String(mod.module_id)}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex justify-between items-center w-full pr-4">
                          <span className="font-medium">{mod.title}</span>
                          <span className="text-sm text-muted-foreground">
                            {mod.lessons.length} {t('course_detail.lectures_count')} • {formatDuration(mod.duration)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          {(mod.lessons || []).map((lesson) => (
                            <div
                              key={lesson.lesson_id}
                              className={`flex items-center justify-between py-2 px-3 rounded ${
                                !lesson.is_free && !canAccessCourse 
                                  ? 'opacity-70 hover:bg-transparent cursor-not-allowed' 
                                  : 'hover:bg-secondary/50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {lesson.content_type === 'video' && <Play className="w-4 h-4" />}
                                {lesson.content_type !== 'video' && <FileText className="w-4 h-4" />}
                                <span className="text-sm">{lesson.title}</span>
                                {lesson.is_free ? (
                                  <Badge variant="outline" className="text-xs">{t('course_detail.preview_badge')}</Badge>
                                ) : !canAccessCourse ? (
                                   <Lock className="w-3 h-3 text-muted-foreground" />
                                ) : null}
                              </div>
                              <span className="text-sm text-muted-foreground">{formatDuration(lesson.duration)}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
               </CardContent>
            </Card>

            {/* Locked Video Player Simulation (New) */}
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

            {/* Instructor */}
            {courseData.instructor && (
            <Card>
               <CardHeader><CardTitle>{t('course_detail.instructor_title')}</CardTitle></CardHeader>
               <CardContent>
                  <div className="flex gap-4">
                     <Avatar className="w-20 h-20"><img src={courseData.instructor.avatar || ''} alt={courseData.instructor.full_name} /></Avatar>
                     <div>
                        <h3 className="font-bold text-lg text-blue-600 underline">{courseData.instructor.full_name}</h3>
                        <p className="text-muted-foreground">{courseData.instructor.specialization || ''}</p>
                        <p className="mt-2 text-sm">{courseData.instructor.bio || ''}</p>
                     </div>
                  </div>
               </CardContent>
            </Card>
            )}

            {/* Reviews Section */}
            <div className="space-y-4" id="reviews">
               <h3 className="text-xl font-bold">{t('course_detail.student_feedback')}</h3>

               {/* Submit review form (only for enrolled, authenticated users) */}
               {isAuthenticated && canAccessCourse && (
                 <Card className="mb-4">
                   <CardContent className="p-4 space-y-3">
                     <p className="font-medium">Viết đánh giá</p>
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
                       placeholder="Nhận xét của bạn..."
                       className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-y"
                     />
                     <Button size="sm" onClick={handleSubmitReview} disabled={submittingReview}>
                       {submittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                       Gửi đánh giá
                     </Button>
                   </CardContent>
                 </Card>
               )}

               {/* Review list */}
               {reviewsLoading ? (
                 <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
               ) : reviews.length === 0 ? (
                 <p className="text-muted-foreground text-sm py-4">Chưa có đánh giá nào cho khóa học này.</p>
               ) : (
                 <div className="space-y-4">
                   {reviews.map((r) => (
                     <Card key={r.review_id}>
                       <CardContent className="p-4">
                         <div className="flex items-start gap-3">
                           <Avatar className="w-10 h-10">
                             <img src={r.user_info?.avatar || ''} alt={r.user_info?.full_name || 'User'} />
                           </Avatar>
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <span className="font-medium text-sm">{r.user_info?.full_name || 'Học viên'}</span>
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
                             {r.instructor_response && (
                               <div className="mt-2 ml-4 p-2 bg-muted rounded text-sm">
                                 <p className="font-medium text-xs text-primary mb-1">Phản hồi từ giảng viên:</p>
                                 <p>{r.instructor_response}</p>
                               </div>
                             )}
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               )}
            </div>

          </div>
        </div>
      </div>
      </>)}
    </div>
  )
}