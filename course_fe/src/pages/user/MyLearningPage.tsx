import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Play, Clock, BookOpen, Award, Loader2, Info } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { useTranslation } from "react-i18next"
import { getAllMyEnrollments, type Enrollment, parseProgress, formatTimeSpent } from '../../services/enrollment.api'
import { formatDuration } from '../../services/course.api'

export function MyLearningPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [selectedTab, setSelectedTab] = useState("in-progress")
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAllMyEnrollments()
      .then((data) => {
        if (!cancelled) setEnrollments(data)
      })
      .catch((err) => {
        if (!cancelled) {
          // If no enrollments found, treat as empty list (not error)
          if (err?.message?.includes('No enrollments found') || err?.response?.status === 400) {
            setEnrollments([])
          } else {
            setError('Không thể tải danh sách khóa học. Vui lòng thử lại.')
          }
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const inProgressCourses = enrollments.filter(e => e.status === 'active')
  const completedCourses = enrollments.filter(e => e.status === 'complete')

  const handleContinueLearning = (courseId: number) => {
    navigate(`/course-player/${courseId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="mb-2">{t('my_learning.title')}</h1>
          <p className="text-muted-foreground">
            Keep track of your learning journey and continue where you left off.
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="in-progress" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">{t('my_learning.in_progress')} </span>
              <span className="sm:hidden">{t('my_learning.in_progress')} </span>
              ({inProgressCourses.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">{t('my_learning.completed')} </span>
              <span className="sm:hidden">{t('my_learning.completed')} </span>
              ({completedCourses.length})
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs sm:text-sm px-2 sm:px-4">{t('my_learning.archived')}</TabsTrigger>
          </TabsList>

          <TabsContent value="in-progress" className="mt-6 md:mt-8">
            {inProgressCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bạn chưa đăng ký khóa học nào.</p>
                <Button className="mt-4" onClick={() => navigate('/courses')}>Khám phá khóa học</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {inProgressCourses.map((enrollment) => {
                  const course = enrollment.course
                  const progress = parseProgress(enrollment.progress)
                  return (
                    <Card key={enrollment.enrollment_id} className="group hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <img
                          src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop'}
                          alt={course.title}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => handleContinueLearning(course.course_id)}
                          >
                            <Play className="h-4 w-4" />
                            Tiếp tục học
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-2"
                            onClick={() => navigate(`/course/${course.course_id}`)}
                          >
                            <Info className="h-4 w-4" />
                            Xem chi tiết
                          </Button>
                        </div>
                      </div>
                      
                      <CardHeader className="pb-3">
                        <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                        <CardDescription>By {course.instructor_name || 'Instructor'}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{t('my_learning.progress')}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{course.total_lessons} {t('my_learning.lessons_completed')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{course.duration ? formatDuration(course.duration) : ''}</span>
                          </div>
                        </div>
                        
                        {enrollment.last_access_date && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">{t('my_learning.last_watched')}: </span>
                            <span>{new Date(enrollment.last_access_date).toLocaleDateString('vi-VN')}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 md:mt-8">
            {completedCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có khóa học nào hoàn thành.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {completedCourses.map((enrollment) => {
                  const course = enrollment.course
                  return (
                    <Card key={enrollment.enrollment_id} className="group hover:shadow-lg transition-shadow">
                      <div className="relative">
                        <img
                          src={course.thumbnail || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop'}
                          alt={course.title}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          {enrollment.certificate_issue_date && (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <Award className="h-3 w-3 mr-1" />
                              {t('common.certificate')}
                            </Badge>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => navigate(`/course-player/${course.course_id}`)}
                          >
                            <Play className="h-4 w-4" />
                            Tiếp tục học
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-2"
                            onClick={() => navigate(`/course/${course.course_id}`)}
                          >
                            <Info className="h-4 w-4" />
                            Xem chi tiết
                          </Button>
                        </div>
                      </div>
                      
                      <CardHeader className="pb-3">
                        <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                        <CardDescription>By {course.instructor_name || 'Instructor'}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        {enrollment.completion_date && (
                          <div className="text-sm text-muted-foreground">
                            Hoàn thành: {new Date(enrollment.completion_date).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                        {enrollment.certificate_issue_date && (
                          <Button 
                            variant="outline" 
                            className="w-full gap-2"
                            onClick={() => navigate('/certificate')}
                          >
                            <Award className="h-4 w-4" />
                            {t('my_learning.view_certificate')}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-6 md:mt-8">
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('my_learning.empty_title')}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}