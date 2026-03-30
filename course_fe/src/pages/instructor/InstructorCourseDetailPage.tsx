import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeft, BookOpen, DollarSign, Eye, Loader2, MessageCircle, Star, TrendingUp, Users } from "lucide-react"
import { toast } from "sonner"

import { PreviewCourseModal } from "../../components/PreviewCourseModal"
import { useRouter } from "../../components/Router"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { getReviewsByCourse } from "../../services/review.api"
import { deleteCourse, formatDuration, formatPrice, getCourseById, parseDecimal, updateCourse, type CourseDetail } from "../../services/course.api"
import { getInstructorCourseAnalytics, type CourseAnalytics } from "../../services/instructor.api"

export function InstructorCourseDetailPage() {
  const { t } = useTranslation()
  const { navigate, params } = useRouter()
  const courseId = params.courseId ? Number(params.courseId) : NaN

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isMutating, setIsMutating] = useState(false)

  useEffect(() => {
    if (isNaN(courseId)) {
      setError(t("instructor_course_detail_page.invalid_course_id"))
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

        if (courseData.status === "fulfilled") {
          setCourse(courseData.value)
        } else {
          throw new Error(t("instructor_course_detail_page.load_failed"))
        }

        if (analyticsData.status === "fulfilled") {
          setAnalytics(analyticsData.value)
          setAnalyticsError(null)
        } else {
          setAnalyticsError(t("instructor_course_detail_page.analytics_unavailable"))
        }

        if (reviewsData.status === "fulfilled") {
          setReviews(reviewsData.value.results || [])
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || t("instructor_course_detail_page.load_failed"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [courseId, t])

  const refreshCourse = async () => {
    const [courseData, analyticsData, reviewsData] = await Promise.allSettled([
      getCourseById(courseId),
      getInstructorCourseAnalytics(courseId),
      getReviewsByCourse(courseId, 1, 10),
    ])

    if (courseData.status === "fulfilled") setCourse(courseData.value)

    if (analyticsData.status === "fulfilled") {
      setAnalytics(analyticsData.value)
      setAnalyticsError(null)
    } else {
      setAnalytics(null)
      setAnalyticsError(t("instructor_course_detail_page.analytics_unavailable"))
    }

    if (reviewsData.status === "fulfilled") setReviews(reviewsData.value.results || [])
  }

  const handleStatusChange = async (nextStatus: "pending" | "draft" | "archived" | "published", confirmation: string) => {
    if (!course || !window.confirm(confirmation)) return

    try {
      setIsMutating(true)
      await updateCourse(course.id, { status: nextStatus })
      await refreshCourse()
      toast.success(
        t("instructor_course_detail_page.status_updated", {
          status: t(`instructor_course_detail_page.status_${nextStatus}`),
        }),
      )
    } catch (err: any) {
      toast.error(err?.message || t("instructor_course_detail_page.update_failed"))
    } finally {
      setIsMutating(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!course || !window.confirm(t("instructor_course_detail_page.delete_confirm", { title: course.title }))) return

    try {
      setIsMutating(true)
      await deleteCourse(course.id)
      toast.success(t("instructor_course_detail_page.delete_success"))
      navigate("/instructor/courses")
    } catch (err: any) {
      toast.error(err?.message || t("instructor_course_detail_page.delete_failed"))
    } finally {
      setIsMutating(false)
    }
  }

  const renderManagementActions = () => {
    if (!course) return null

    const actions: Array<{ key: string; label: string; onClick: () => void; variant?: "default" | "outline" | "destructive" }> = [
      {
        key: "lessons",
        label: t("instructor_course_detail_page.edit_lessons"),
        onClick: () => navigate(`/instructor/lessons/${course.id}`),
        variant: "outline",
      },
      {
        key: "landing",
        label: t("instructor_course_detail_page.edit_course_info"),
        onClick: () => navigate(`/instructor/course-landing/${course.id}`),
        variant: "outline",
      },
    ]

    if (course.status === "draft") {
      actions.push({
        key: "submit",
        label: t("instructor_course_detail_page.submit_for_review"),
        onClick: () => handleStatusChange("pending", t("instructor_course_detail_page.confirm_submit_for_review")),
      })
    }

    if (course.status === "archived") {
      if (!course.content_changed_since_publish) {
        actions.push({
          key: "restore",
          label: t("instructor_course_detail_page.restore_published"),
          onClick: () => handleStatusChange("published", t("instructor_course_detail_page.confirm_restore_published")),
          variant: "outline",
        })
      }

      actions.push({
        key: "draft",
        label: t("instructor_course_detail_page.move_to_draft"),
        onClick: () => handleStatusChange("draft", t("instructor_course_detail_page.confirm_move_archived_to_draft")),
        variant: "outline",
      })
    }

    if (["pending", "rejected"].includes(course.status)) {
      actions.push({
        key: "draft",
        label: t("instructor_course_detail_page.move_to_draft"),
        onClick: () => handleStatusChange("draft", t("instructor_course_detail_page.confirm_move_to_draft")),
        variant: "outline",
      })
    }

    if (course.status === "published") {
      actions.push({
        key: "archive",
        label: t("instructor_course_detail_page.archive"),
        onClick: () => handleStatusChange("archived", t("instructor_course_detail_page.confirm_archive")),
        variant: "outline",
      })
    }

    actions.push({
      key: "delete",
      label: t("instructor_course_detail_page.delete"),
      onClick: handleDeleteCourse,
      variant: "destructive",
    })

    return actions.map((action) => (
      <Button key={action.key} variant={action.variant ?? "default"} onClick={action.onClick} disabled={isMutating}>
        {action.label}
      </Button>
    ))
  }

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
        <p className="text-destructive mb-4">{error || t("instructor_course_detail_page.course_not_found")}</p>
        <Button onClick={() => navigate("/instructor/courses")}>{t("instructor_course_detail_page.back_to_courses")}</Button>
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
          100,
      )
    : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate("/instructor/courses")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("instructor_course_detail_page.back_to_courses")}
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
              <p className="text-sm text-muted-foreground line-clamp-1">{course.shortdescription || course.description?.slice(0, 100)}</p>
              {course.status === "archived" && course.content_changed_since_publish && (
                <p className="text-xs text-amber-600 mt-2">{t("instructor_course_detail_page.archived_changed_notice")}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/course/${courseId}`)} disabled={course.status !== "published" || !course.is_public}>
              <Eye className="h-4 w-4 mr-2" />
              {t("instructor_course_detail_page.view_public")}
            </Button>
            <Button onClick={() => setIsPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              {t("instructor_course_detail_page.preview")}
            </Button>
            {renderManagementActions()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("instructor_course_detail_page.students")}</p>
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
              <p className="text-sm text-muted-foreground">{t("instructor_course_detail_page.rating")}</p>
              <p className="text-2xl font-bold">{rating.toFixed(1)} ★</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("instructor_course_detail_page.price")}</p>
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
              <p className="text-sm text-muted-foreground">{t("instructor_course_detail_page.completion")}</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics">{t("instructor_course_detail_page.analytics_tab")}</TabsTrigger>
          <TabsTrigger value="content">{t("instructor_course_detail_page.content_tab")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("instructor_course_detail_page.reviews_tab", { count: totalReviews })}</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-medium mb-4">{t("instructor_course_detail_page.student_progress")}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{t("instructor_course_detail_page.not_started")}</span>
                    <span>{analytics.student_progress.not_started}</span>
                  </div>
                  <Progress value={(analytics.student_progress.not_started / Math.max(1, totalStudents)) * 100} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>{t("instructor_course_detail_page.in_progress")}</span>
                    <span>{analytics.student_progress.in_progress}</span>
                  </div>
                  <Progress value={(analytics.student_progress.in_progress / Math.max(1, totalStudents)) * 100} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>{t("instructor_course_detail_page.completed")}</span>
                    <span>{analytics.student_progress.completed}</span>
                  </div>
                  <Progress value={(analytics.student_progress.completed / Math.max(1, totalStudents)) * 100} className="h-2" />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-medium mb-4">{t("instructor_course_detail_page.rating_distribution")}</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const key = `${star}_star`
                    const count = analytics.rating_distribution[key] || 0
                    const total = Object.values(analytics.rating_distribution).reduce((sum, value) => sum + value, 0)
                    const pct = total ? Math.round((count / total) * 100) : 0

                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-12">{t("instructor_course_detail_page.star_label", { count: star })}</span>
                        <div className="flex-1">
                          <Progress value={pct} className="h-2" />
                        </div>
                        <span className="w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-medium mb-4">{t("instructor_course_detail_page.enrollment_trend")}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("instructor_course_detail_page.month")}</TableHead>
                      <TableHead className="text-right">{t("instructor_course_detail_page.enrollments")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.enrollment_trend.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell className="text-right">{row.enrollments}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <Card className="p-6">
                <h3 className="font-medium mb-4">{t("instructor_course_detail_page.popular_lessons")}</h3>
                {analytics.popular_lessons.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("instructor_course_detail_page.no_lesson_data")}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("instructor_course_detail_page.lesson")}</TableHead>
                        <TableHead className="text-right">{t("instructor_course_detail_page.views")}</TableHead>
                        <TableHead className="text-right">{t("instructor_course_detail_page.avg_completion")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.popular_lessons.map((lesson) => (
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
              <p>{analyticsError || t("instructor_course_detail_page.analytics_data_not_available")}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content">
          <Card className="p-6">
            <h3 className="font-medium mb-4">
              {t("instructor_course_detail_page.course_content_summary", {
                modules: course.total_modules,
                lessons: course.total_lessons,
              })}
            </h3>
            <div className="space-y-4">
              {(course.modules || []).map((mod, idx) => (
                <div key={mod.module_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{t("instructor_course_detail_page.module_title", { number: idx + 1, title: mod.title })}</h4>
                    <Badge variant="secondary">{t("instructor_course_detail_page.lessons_badge", { count: mod.lessons.length })}</Badge>
                  </div>
                  {mod.description && <p className="text-sm text-muted-foreground mb-2">{mod.description}</p>}
                  <div className="space-y-1">
                    {mod.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.lesson_id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                        <span>{lessonIndex + 1}. {lesson.title}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="capitalize">{lesson.content_type}</span>
                          {lesson.duration && <span>{formatDuration(lesson.duration)}</span>}
                          {lesson.is_free && (
                            <Badge variant="secondary" className="text-xs">
                              {t("instructor_course_detail_page.free")}
                            </Badge>
                          )}
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
                      <span className="font-medium">{review.user_name || t("instructor_course_detail_page.anonymous")}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-3 w-3 ${index < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
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
                <p>{t("instructor_course_detail_page.no_reviews")}</p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <PreviewCourseModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} courseId={courseId.toString()} />
    </div>
  )
}
