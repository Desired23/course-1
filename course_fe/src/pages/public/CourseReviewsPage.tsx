import { useState } from 'react'
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
import { useNotifications } from "../../contexts/NotificationContext"
import { toast } from "sonner"

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

type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>

export function CourseReviewsPage() {
  const { params, currentRoute } = useRouter()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
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

  const reviewsData: ReviewRecord[] = [
    {
      id: 1,
      rating: 5,
      title: t('course_reviews_page.mock_reviews.review_1.title'),
      content: t('course_reviews_page.mock_reviews.review_1.content'),
      reviewer: {
        name: "Sarah Johnson",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b789?w=40&h=40&fit=crop&crop=face",
        initials: "SJ"
      },
      date: t('course_reviews_page.mock_reviews.review_1.date'),
      helpful: 24,
      notHelpful: 2,
      verified: true,
      isOwn: false
    },
    {
      id: 2,
      rating: 4,
      title: t('course_reviews_page.mock_reviews.review_2.title'),
      content: t('course_reviews_page.mock_reviews.review_2.content'),
      reviewer: {
        name: "Mike Chen",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
        initials: "MC"
      },
      date: t('course_reviews_page.mock_reviews.review_2.date'),
      helpful: 18,
      notHelpful: 3,
      verified: true,
      isOwn: false
    },
    {
      id: 3,
      rating: 5,
      title: t('course_reviews_page.mock_reviews.review_3.title'),
      content: t('course_reviews_page.mock_reviews.review_3.content'),
      reviewer: {
        name: "Emily Davis",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
        initials: "ED"
      },
      date: t('course_reviews_page.mock_reviews.review_3.date'),
      helpful: 31,
      notHelpful: 1,
      verified: true,
      isOwn: true
    },
    {
      id: 4,
      rating: 3,
      title: t('course_reviews_page.mock_reviews.review_4.title'),
      content: t('course_reviews_page.mock_reviews.review_4.content'),
      reviewer: {
        name: "David Wilson",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
        initials: "DW"
      },
      date: t('course_reviews_page.mock_reviews.review_4.date'),
      helpful: 12,
      notHelpful: 8,
      verified: true,
      isOwn: false
    }
  ]

  const courseInfo = {
    title: t('course_reviews_page.course.title'),
    instructor: t('course_reviews_page.course.instructor'),
    averageRating: 4.6,
    totalReviews: 127543,
    ratingDistribution: {
      5: 78,
      4: 15,
      3: 4,
      2: 2,
      1: 1
    } as RatingDistribution
  }

  const instructorCourses = [
    { id: 'all', name: t('course_reviews_page.instructor_courses.all') },
    { id: '1', name: t('course_reviews_page.instructor_courses.course_1') },
    { id: '2', name: t('course_reviews_page.instructor_courses.course_2') },
    { id: '3', name: t('course_reviews_page.instructor_courses.course_3') }
  ]

  const newReviewsCount = 5

  const filteredReviews = reviewsData.filter((review) => {
    const matchesSearch =
      review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCourse = selectedCourse === 'all' || true

    if (filterRating === "all") return matchesSearch && matchesCourse
    return matchesSearch && matchesCourse && review.rating === parseInt(filterRating, 10)
  })

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting review:', newReview, courseId)
    setNewReview({ rating: 0, title: '', content: '' })
    setShowWriteReview(false)
    toast.success(t('course_reviews_page.toasts.review_submitted'))
  }

  const handleHelpful = (reviewId: number, helpful: boolean) => {
    console.log('Rating review:', { reviewId, helpful })
    toast.success(helpful ? t('course_reviews_page.toasts.marked_helpful') : t('course_reviews_page.toasts.feedback_recorded'))
  }

  const handleReplyToReview = (reviewId: number) => {
    if (!replyText.trim()) {
      toast.error(t('course_reviews_page.toasts.reply_required'))
      return
    }

    console.log('Replying to review:', reviewId, replyText)
    addNotification({
      type: 'review_response',
      title: t('course_reviews_page.notifications.instructor_responded'),
      message: t('course_reviews_page.notifications.instructor_replied_message', {
        instructor: user?.name || t('course_reviews_page.instructor_fallback')
      }),
      timestamp: new Date()
    })

    toast.success(t('course_reviews_page.toasts.reply_posted'))
    setReplyText("")
    setReplyingTo(null)
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
    <>
      <div className="mb-8">
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
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
      </div>

      <div className="space-y-6">
        {filteredReviews.map((review) => (
          <Card key={review.id}>
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
                      <Button variant="ghost" size="sm" aria-label={t('course_reviews_page.actions.edit_review')}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={t('course_reviews_page.actions.delete_review')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">{review.title}</h4>
                  <p className="text-muted-foreground">{review.content}</p>
                </div>

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
                      <Button variant="ghost" size="sm">
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
        ))}

        {filteredReviews.length === 0 && (
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
      </div>
    </>
  )

  if (isInstructorView) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar type="instructor" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{content}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">{content}</div>
    </div>
  )
}
