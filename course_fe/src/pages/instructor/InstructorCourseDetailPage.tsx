import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Progress } from "../../components/ui/progress"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "../../components/ui/table"
import { useRouter } from "../../components/Router"
import { 
  ArrowLeft, BookOpen, Users, Star, DollarSign, TrendingUp,
  Eye, MessageCircle, Edit, Loader2
} from "lucide-react"
import { PreviewCourseModal } from "../../components/PreviewCourseModal"
import { getCourseById, type CourseDetail, formatPrice, parseDecimal, formatDuration } from '../../services/course.api'
import { getInstructorCourseAnalytics, type CourseAnalytics } from '../../services/instructor.api'
import { getReviewsByCourse } from '../../services/review.api'

export function InstructorCourseDetailPage() {
  const { navigate, params } = useRouter()
  const courseId = params.courseId ? Number(params.courseId) : NaN
  
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  useEffect(() => {
    if (isNaN(courseId)) {
      setError('Invalid course ID')
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [courseData, analyticsData, reviewsData] = await Promise.allSettled([
          getCourseById(courseId),
          getInstructorCourseAnalytics(courseId),
          getReviewsByCourse(courseId, 1, 10),
        ])
        if (cancelled) return
        if (courseData.status === 'fulfilled') setCourse(courseData.value)
        else throw new Error('Failed to load course')
        if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value)
        if (reviewsData.status === 'fulfilled') setReviews(reviewsData.value.results || [])
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load course')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error || 'Course not found'}</p>
        <Button onClick={() => navigate('/instructor/courses')}>Back to Courses</Button>
      </div>
    )
  }

  const totalStudents = course.total_students || 0
  const rating = parseDecimal(course.rating)
  const totalReviews = course.total_reviews || 0
  const studentProgress = analytics?.student_progress
  const completionRate = studentProgress
    ? Math.round(
        (studentProgress.completed /
          Math.max(1, studentProgress.not_started + studentProgress.in_progress + studentProgress.completed)) *
          100
      )
    : 0

  return (
    <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/instructor/courses')}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="font-medium">{course.title}</h1>
                    <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400">
                      {course.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {course.shortdescription || course.description?.slice(0, 100)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(`/course/${courseId}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Public
                </Button>
                <Button onClick={() => setIsPreviewOpen(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Students</p>
                  <p className="text-2xl font-bold">{totalStudents.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">{rating.toFixed(1)} ⭐</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-2xl font-bold">{formatPrice(course.price)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
              </div>
            </Card>
          </div>

          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({totalReviews})</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-6">
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Student Progress */}
                  <Card className="p-6">
                    <h3 className="font-medium mb-4">Student Progress</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Not Started</span>
                        <span>{analytics.student_progress.not_started}</span>
                      </div>
                      <Progress value={analytics.student_progress.not_started / Math.max(1, totalStudents) * 100} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>In Progress</span>
                        <span>{analytics.student_progress.in_progress}</span>
                      </div>
                      <Progress value={analytics.student_progress.in_progress / Math.max(1, totalStudents) * 100} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span>{analytics.student_progress.completed}</span>
                      </div>
                      <Progress value={analytics.student_progress.completed / Math.max(1, totalStudents) * 100} className="h-2" />
                    </div>
                  </Card>

                  {/* Rating Distribution */}
                  <Card className="p-6">
                    <h3 className="font-medium mb-4">Rating Distribution</h3>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map(star => {
                        const key = `${star}_star`
                        const count = analytics.rating_distribution[key] || 0
                        const total = Object.values(analytics.rating_distribution).reduce((s, v) => s + v, 0)
                        const pct = total ? Math.round(count / total * 100) : 0
                        return (
                          <div key={star} className="flex items-center gap-2 text-sm">
                            <span className="w-12">{star} star</span>
                            <div className="flex-1">
                              <Progress value={pct} className="h-2" />
                            </div>
                            <span className="w-8 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  {/* Enrollment Trend */}
                  <Card className="p-6">
                    <h3 className="font-medium mb-4">Enrollment Trend (6 months)</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Enrollments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.enrollment_trend.map(row => (
                          <TableRow key={row.date}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell className="text-right">{row.enrollments}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>

                  {/* Popular Lessons */}
                  <Card className="p-6">
                    <h3 className="font-medium mb-4">Popular Lessons</h3>
                    {analytics.popular_lessons.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No lesson data yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lesson</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Avg. Completion</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.popular_lessons.map(lesson => (
                            <TableRow key={lesson.lesson_id}>
                              <TableCell className="max-w-[200px] truncate">{lesson.title}</TableCell>
                              <TableCell className="text-right">{lesson.views}</TableCell>
                              <TableCell className="text-right">{lesson.avg_completion_rate}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Card>
                </div>
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  <p>Analytics data not available.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="content">
              <Card className="p-6">
                <h3 className="font-medium mb-4">Course Content ({course.total_modules} modules, {course.total_lessons} lessons)</h3>
                <div className="space-y-4">
                  {(course.modules || []).map((mod, idx) => (
                    <div key={mod.module_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Module {idx + 1}: {mod.title}</h4>
                        <Badge variant="secondary">{mod.lessons.length} lessons</Badge>
                      </div>
                      {mod.description && (
                        <p className="text-sm text-muted-foreground mb-2">{mod.description}</p>
                      )}
                      <div className="space-y-1">
                        {mod.lessons.map((lesson, lIdx) => (
                          <div key={lesson.lesson_id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                            <span>{lIdx + 1}. {lesson.title}</span>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="capitalize">{lesson.content_type}</span>
                              {lesson.duration && <span>{formatDuration(lesson.duration)}</span>}
                              {lesson.is_free && <Badge variant="secondary" className="text-xs">Free</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              {reviews.length > 0 ? (
                <Card className="p-6">
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{review.user_name || 'Anonymous'}</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews yet for this course.</p>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <PreviewCourseModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            courseId={courseId?.toString()}
          />
    </div>
  )
}