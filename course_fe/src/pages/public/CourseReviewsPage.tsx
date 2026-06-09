import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Star, ThumbsUp, ThumbsDown, Search, Edit3, Trash2, AlertCircle, Reply, MessageCircle, Send } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { DashboardSidebar } from "../../components/DashboardSidebar"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "sonner"
import { motion } from 'motion/react'
import { listItemTransition } from '../../lib/motion'
import { getErrorMessage } from '../../lib/apiError'
import { getReviewsByCourse, getCourseReviewStats, createReview, updateReview, deleteReview, reportReview, type Review, type ReviewSortBy, type CourseReviewStats, formatReviewDate } from '../../services/review.api'
import { getCourseById } from '../../services/course.api'
import { UserPagination } from '../../components/UserPagination'

const PAGE_SIZE = 10

type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>

function toDistributionPercent(stats: CourseReviewStats): RatingDistribution {
  const total = stats.total || 1
  return {
    5: Math.round((stats.distribution[5] / total) * 100),
    4: Math.round((stats.distribution[4] / total) * 100),
    3: Math.round((stats.distribution[3] / total) * 100),
    2: Math.round((stats.distribution[2] / total) * 100),
    1: Math.round((stats.distribution[1] / total) * 100),
  }
}

function sortByParam(sortBy: string): ReviewSortBy {
  switch (sortBy) {
    case 'helpful':
      return 'likes'
    case 'rating-high':
      return 'rating_desc'
    case 'rating-low':
      return 'rating_asc'
    case 'recent':
    default:
      return 'newest'
  }
}

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

type ReviewRecord = {
  id: number
  rating: number
  title: string
  content: string
  reviewer: {
    name: string
    avatar: string
    initials: string
  }
  date: string
  helpful: number
  notHelpful: number
  verified: boolean
  isOwn: boolean
}

export function CourseReviewsPage() {
  const { params, currentRoute } = useRouter()
  const { user } = useAuth()

  const { t } = useTranslation()

  const courseId = params?.courseId
  const isInstructorView = currentRoute.startsWith('/instructor/')
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState(isInstructorView ? "recent" : "helpful")
  const [filterRating, setFilterRating] = useState("all")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    content: ''
  })
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null)

  const [reviewsData, setReviewsData] = useState<ReviewRecord[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [courseInfo, setCourseInfo] = useState({
    title: '',
    instructor: '',
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as RatingDistribution,
  })

  const mapReview = (r: Review): ReviewRecord => {
    const nameParts = (r.user_info.full_name || '').trim().split(' ')
    const initials = nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase() || '?'
    return {
      id: r.review_id,
      rating: r.rating,
      title: r.comment ? r.comment.split('\n')[0].substring(0, 80) : '',
      content: r.comment || '',
      reviewer: {
        name: r.user_info.full_name || t('course_reviews_page.anonymous', 'Anonymous'),
        avatar: r.user_info.avatar || '',
        initials,
      },
      date: formatReviewDate(r.review_date),
      helpful: r.likes,
      notHelpful: 0,
      verified: r.status === 'approved',
      isOwn: String(r.user) === user?.id,
    }
  }

  const reloadStats = async (id: number) => {
    const stats = await getCourseReviewStats(id)
    setCourseInfo(prev => ({
      ...prev,
      totalReviews: stats.total,
      ratingDistribution: toDistributionPercent(stats),
    }))
  }

  const instructorCourses = [
    { id: 'all', name: t('course_reviews_page.instructor_courses.all') },
  ]

  const newReviewsCount = 0

  // Debounce the search box so each keystroke doesn't hit the server.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(handle)
  }, [searchQuery])

  // Reset to page 1 whenever filters/search/sort change.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filterRating, sortBy])

  // Load course info + accurate review stats (total + distribution) once per course.
  useEffect(() => {
    if (!courseId) return
    const id = Number(courseId)
    if (!id) return

    Promise.all([
      getCourseById(id),
      getCourseReviewStats(id),
    ]).then(([course, stats]) => {
      setCourseInfo({
        title: course.title,
        instructor: course.instructor?.full_name || '',
        averageRating: parseFloat(course.rating) || stats.average || 0,
        totalReviews: stats.total,
        ratingDistribution: toDistributionPercent(stats),
      })
    }).catch((e) => toast.error(getErrorMessage(e, 'Không thể tải đánh giá.')))
  }, [courseId])

  // Load the current page of reviews with server-side search/filter/sort.
  useEffect(() => {
    if (!courseId) return
    const id = Number(courseId)
    if (!id) return

    let cancelled = false
    getReviewsByCourse(id, page, PAGE_SIZE, {
      search: debouncedSearch || undefined,
      rating: filterRating !== 'all' ? filterRating : undefined,
      sort_by: sortByParam(sortBy),
    }).then((reviewsPage) => {
      if (cancelled) return
      setReviewsData(reviewsPage.results.map(mapReview))
      setTotalPages(reviewsPage.total_pages || 1)
    }).catch((e) => {
      if (!cancelled) toast.error(getErrorMessage(e, 'Không thể tải đánh giá.'))
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, page, debouncedSearch, filterRating, sortBy, user?.id])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId || !newReview.rating) return
    try {
      await createReview({ course: Number(courseId), rating: newReview.rating, comment: newReview.content })
      setNewReview({ rating: 0, title: '', content: '' })
      setShowWriteReview(false)
      toast.success(t('course_reviews_page.toasts.review_submitted'))
      const id = Number(courseId)
      const reviewsPage = await getReviewsByCourse(id, 1, PAGE_SIZE, {
        search: debouncedSearch || undefined,
        rating: filterRating !== 'all' ? filterRating : undefined,
        sort_by: sortByParam(sortBy),
      })
      setReviewsData(reviewsPage.results.map(mapReview))
      setTotalPages(reviewsPage.total_pages || 1)
      setPage(1)
      await reloadStats(id)
    } catch {
      toast.error(t('course_reviews_page.toasts.review_error', 'Failed to submit review'))
    }
  }

  const handleHelpful = async (reviewId: number, helpful: boolean) => {
    if (!user) { toast.error(t('course_reviews_page.toasts.login_required')); return }
    const review = reviewsData.find(r => r.id === reviewId)
    if (!review) return
    try {
      if (helpful) {
        await updateReview(reviewId, { likes: review.helpful + 1 } as any)
        setReviewsData(prev => prev.map(r => r.id === reviewId ? { ...r, helpful: r.helpful + 1 } : r))
        toast.success(t('course_reviews_page.toasts.marked_helpful'))
      } else {
        setReviewsData(prev => prev.map(r => r.id === reviewId ? { ...r, notHelpful: r.notHelpful + 1 } : r))
      }
    } catch { /* silent */ }
  }

  const handleReplyToReview = async (reviewId: number) => {
    if (!replyText.trim()) {
      toast.error(t('course_reviews_page.toasts.reply_required'))
      return
    }
    try {
      await updateReview(reviewId, { instructor_response: replyText })
      toast.success(t('course_reviews_page.toasts.reply_posted'))
      setReplyText("")
      setReplyingTo(null)
    } catch {
      toast.error(t('course_reviews_page.toasts.reply_error', 'Failed to post reply'))
    }
  }

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await deleteReview(reviewId)
      setReviewsData(prev => prev.filter(r => r.id !== reviewId))
      if (courseId) await reloadStats(Number(courseId))
      toast.success(t('course_reviews_page.toasts.review_deleted', 'Review deleted'))
    } catch {
      toast.error(t('course_reviews_page.toasts.delete_error', 'Failed to delete review'))
    }
  }

  const handleReportReview = async (reviewId: number) => {
    try {
      await reportReview(reviewId, 'inappropriate')
      toast.success(t('course_reviews_page.toasts.report_submitted', 'Report submitted'))
    } catch { /* silent */ }
  }

  const StarRating = ({
    rating,
    size = "h-4 w-4",
    interactive = false,
    onRatingChange
  }: {
    rating: number
    size?: string
    interactive?: boolean
    onRatingChange?: (rating: number) => void
  }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
          onClick={() => interactive && onRatingChange?.(star)}
        />
      ))}
    </div>
  )

  const ratingOptions = [
    { value: 'all', label: t('course_reviews_page.filters.all_ratings') },
    { value: '5', label: t('course_reviews_page.filters.stars', { count: 5 }) },
    { value: '4', label: t('course_reviews_page.filters.stars', { count: 4 }) },
    { value: '3', label: t('course_reviews_page.filters.stars', { count: 3 }) },
    { value: '2', label: t('course_reviews_page.filters.stars', { count: 2 }) },
    { value: '1', label: t('course_reviews_page.filters.star', { count: 1 }) }
  ]

  const sortOptions = [
    { value: 'helpful', label: t('course_reviews_page.sort.most_helpful') },
    { value: 'recent', label: t('course_reviews_page.sort.most_recent') },
    { value: 'rating-high', label: t('course_reviews_page.sort.highest_rating') },
    { value: 'rating-low', label: t('course_reviews_page.sort.lowest_rating') }
  ]

  const content = (
    <motion.div variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-8" variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-2">
              {isInstructorView ? t('course_reviews_page.headers.student_reviews') : t('course_reviews_page.headers.course_reviews')}
            </h1>
            <p className="text-muted-foreground">{courseInfo.title}</p>
          </div>
          {isInstructorView && newReviewsCount > 0 && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950 px-4 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {t('course_reviews_page.new_reviews_this_week', { count: newReviewsCount })}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('course_reviews_page.overview.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold">{courseInfo.averageRating}</div>
                <div>
                  <StarRating rating={Math.round(courseInfo.averageRating)} size="h-6 w-6" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('course_reviews_page.overview.total_reviews', { count: courseInfo.totalReviews.toLocaleString() })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(courseInfo.ratingDistribution)
                  .reverse()
                  .map(([rating, percentage]) => (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-sm w-4">{rating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <Progress value={percentage} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground w-8">{percentage}%</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {!isInstructorView ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('course_reviews_page.write_review.title')}</CardTitle>
                <CardDescription>{t('course_reviews_page.write_review.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {!showWriteReview ? (
                  <Button onClick={() => setShowWriteReview(true)} className="w-full gap-2">
                    <Edit3 className="h-4 w-4" />
                    {t('course_reviews_page.write_review.cta')}
                  </Button>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div className="space-y-2">
                      <label>{t('course_reviews_page.form.rating')}</label>
                      <StarRating
                        rating={newReview.rating}
                        size="h-8 w-8"
                        interactive
                        onRatingChange={(rating) => setNewReview((prev) => ({ ...prev, rating }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label>{t('course_reviews_page.form.review_title')}</label>
                      <Input
                        placeholder={t('course_reviews_page.form.review_title_placeholder')}
                        value={newReview.title}
                        onChange={(e) => setNewReview((prev) => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label>{t('course_reviews_page.form.review')}</label>
                      <Textarea
                        placeholder={t('course_reviews_page.form.review_placeholder')}
                        value={newReview.content}
                        onChange={(e) => setNewReview((prev) => ({ ...prev, content: e.target.value }))}
                        className="min-h-[100px]"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit">{t('course_reviews_page.form.submit')}</Button>
                      <Button type="button" variant="outline" onClick={() => setShowWriteReview(false)}>
                        {t('course_reviews_page.actions.cancel')}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t('course_reviews_page.activity.title')}</CardTitle>
                <CardDescription>{t('course_reviews_page.activity.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('course_reviews_page.activity.new_reviews')}</span>
                    <span className="font-medium text-lg">{newReviewsCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('course_reviews_page.activity.avg_response_time')}</span>
                    <span className="font-medium text-lg">{t('course_reviews_page.activity.response_time_value')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('course_reviews_page.activity.helpful_votes')}</span>
                    <span className="font-medium text-lg">142</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  {t('course_reviews_page.activity.view_analytics')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      <motion.div className="flex flex-col md:flex-row gap-4 mb-6" variants={fadeInUp}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('course_reviews_page.filters.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isInstructorView && (
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder={t('course_reviews_page.filters.course_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {instructorCourses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterRating} onValueChange={setFilterRating}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('course_reviews_page.filters.rating_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {ratingOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('course_reviews_page.filters.sort_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div className="space-y-6" variants={fadeInUp}>
        {reviewsData.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={listItemTransition(index)}
          >
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.reviewer.avatar} />
                      <AvatarFallback>{review.reviewer.initials}</AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{review.reviewer.name}</span>
                        {review.verified && (
                          <Badge variant="outline" className="text-green-600">
                            {t('course_reviews_page.badges.verified')}
                          </Badge>
                        )}
                        {review.isOwn && (
                          <Badge variant="secondary">{t('course_reviews_page.badges.your_review')}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-muted-foreground">{review.date}</span>
                      </div>
                    </div>
                  </div>

                  {review.isOwn && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" aria-label={t('course_reviews_page.actions.edit_review')} onClick={() => setEditingReviewId(editingReviewId === review.id ? null : review.id)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={t('course_reviews_page.actions.delete_review')} onClick={() => handleDeleteReview(review.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingReviewId === review.id ? (
                  <div className="space-y-2">
                    <StarRating rating={newReview.rating || review.rating} interactive onRatingChange={r => setNewReview(prev => ({ ...prev, rating: r }))} />
                    <Textarea
                      defaultValue={review.content}
                      onChange={e => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={async () => {
                        try {
                          await updateReview(review.id, { rating: newReview.rating || review.rating, comment: newReview.content || review.content })
                          setReviewsData(prev => prev.map(r => r.id === review.id ? { ...r, rating: newReview.rating || r.rating, content: newReview.content || r.content } : r))
                          setEditingReviewId(null)
                          if (courseId) await reloadStats(Number(courseId))
                          toast.success(t('course_reviews_page.toasts.review_updated', 'Review updated'))
                        } catch { toast.error(t('course_reviews_page.toasts.review_error', 'Failed to update')) }
                      }}>{t('course_reviews_page.actions.save', 'Save')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingReviewId(null)}>{t('course_reviews_page.actions.cancel', 'Cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium mb-2">{review.title}</h4>
                    <p className="text-muted-foreground">{review.content}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleHelpful(review.id, true)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {t('course_reviews_page.actions.helpful', { count: review.helpful })}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleHelpful(review.id, false)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {t('course_reviews_page.actions.not_helpful', { count: review.notHelpful })}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isInstructorView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplyingTo(review.id)}
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          {t('course_reviews_page.actions.reply')}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleReportReview(review.id)}>
                        {t('course_reviews_page.actions.report')}
                      </Button>
                    </div>
                  </div>

                  {isInstructorView && replyingTo === review.id && (
                    <div className="pl-4 border-l-2 border-primary space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        <span>{t('course_reviews_page.reply_form.title')}</span>
                      </div>
                      <Textarea
                        placeholder={t('course_reviews_page.reply_form.placeholder')}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleReplyToReview(review.id)}>
                          <Send className="h-4 w-4 mr-2" />
                          {t('course_reviews_page.reply_form.submit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReplyingTo(null)
                            setReplyText("")
                          }}
                        >
                          {t('course_reviews_page.actions.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        ))}

        {reviewsData.length === 0 && (
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="mb-2">{t('course_reviews_page.empty.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? t('course_reviews_page.empty.try_different_search') : t('course_reviews_page.empty.be_first')}
            </p>
            {!isInstructorView && (
              <Button onClick={() => setShowWriteReview(true)}>
                {t('course_reviews_page.empty.write_first_review')}
              </Button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pt-4">
            <UserPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </motion.div>
    </motion.div>
  )

  if (isInstructorView) {
    return (
      <motion.div
        className="flex min-h-screen bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <DashboardSidebar type="instructor" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{content}</div>
        </main>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="container mx-auto px-4 py-8">{content}</div>
    </motion.div>
  )
}
