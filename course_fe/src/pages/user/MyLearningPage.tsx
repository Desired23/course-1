import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Play, Clock, BookOpen, Award, Loader2, Info } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { useTranslation } from "react-i18next"
import { getMyEnrollments, type Enrollment, parseProgress } from '../../services/enrollment.api'
import { formatDuration } from '../../services/course.api'
import { UserPagination } from '../../components/UserPagination'

type SortBy = 'recent_access' | 'newest_enrollment' | 'oldest_enrollment' | 'title_asc' | 'progress_desc'

export function MyLearningPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [selectedTab, setSelectedTab] = useState("in-progress")
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [inProgressCount, setInProgressCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent_access')
  const [enrollmentDateFrom, setEnrollmentDateFrom] = useState('')
  const [enrollmentDateTo, setEnrollmentDateTo] = useState('')
  const [purchaseDateFrom, setPurchaseDateFrom] = useState('')
  const [purchaseDateTo, setPurchaseDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const statusFilter = selectedTab === 'in-progress' ? 'active' : selectedTab === 'completed' ? 'complete' : undefined

    getMyEnrollments({
      page: currentPage,
      page_size: pageSize,
      status: statusFilter,
      search: search || undefined,
      sort_by: sortBy,
      enrollment_date_from: enrollmentDateFrom || undefined,
      enrollment_date_to: enrollmentDateTo || undefined,
      purchase_date_from: purchaseDateFrom || undefined,
      purchase_date_to: purchaseDateTo || undefined,
    })
      .then((listRes) => {
        if (cancelled) return
        setEnrollments(listRes.results)
        setTotalCount(listRes.count || 0)
        setTotalPages(listRes.total_pages || 1)
        if (selectedTab === 'in-progress') {
          setInProgressCount(listRes.count || 0)
        } else if (selectedTab === 'completed') {
          setCompletedCount(listRes.count || 0)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err?.message?.includes('No enrollments found') || err?.response?.status === 400) {
            setEnrollments([])
            setTotalCount(0)
            setTotalPages(1)
            setInProgressCount(0)
            setCompletedCount(0)
          } else {
            setError(t('my_learning.load_failed'))
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedTab, currentPage, pageSize, search, sortBy, enrollmentDateFrom, enrollmentDateTo, purchaseDateFrom, purchaseDateTo])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTab, search, sortBy, enrollmentDateFrom, enrollmentDateTo, purchaseDateFrom, purchaseDateTo, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

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
        <Button onClick={() => window.location.reload()}>{t('my_learning.retry')}</Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="mb-2">{t('my_learning.title')}</h1>
          <p className="text-muted-foreground">{t('my_learning.subtitle')}</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="in-progress" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">{t('my_learning.in_progress')} </span>
              <span className="sm:hidden">{t('my_learning.in_progress')} </span>
              ({inProgressCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">{t('my_learning.completed')} </span>
              <span className="sm:hidden">{t('my_learning.completed')} </span>
              ({completedCount})
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs sm:text-sm px-2 sm:px-4">{t('my_learning.archived')}</TabsTrigger>
          </TabsList>

          {(selectedTab === 'in-progress' || selectedTab === 'completed') && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                className="h-9 rounded-md border px-3 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('my_learning.search_placeholder')}
              />
              <select className="h-9 rounded-md border px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="recent_access">{t('my_learning.sort_recent')}</option>
                <option value="newest_enrollment">{t('my_learning.sort_newest_enrollment')}</option>
                <option value="oldest_enrollment">{t('my_learning.sort_oldest_enrollment')}</option>
                <option value="title_asc">{t('my_learning.sort_title')}</option>
                <option value="progress_desc">{t('my_learning.sort_progress')}</option>
              </select>
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={enrollmentDateFrom} onChange={(e) => setEnrollmentDateFrom(e.target.value)} title={t('my_learning.enrollment_from')} />
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={enrollmentDateTo} onChange={(e) => setEnrollmentDateTo(e.target.value)} title={t('my_learning.enrollment_to')} />
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={purchaseDateFrom} onChange={(e) => setPurchaseDateFrom(e.target.value)} title={t('my_learning.purchase_from')} />
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={purchaseDateTo} onChange={(e) => setPurchaseDateTo(e.target.value)} title={t('my_learning.purchase_to')} />
              <select className="h-9 rounded-md border px-3 text-sm" value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value="6">{t('my_learning.page_size.six')}</option>
                <option value="9">{t('my_learning.page_size.nine')}</option>
                <option value="12">{t('my_learning.page_size.twelve')}</option>
              </select>
              <Button
                variant="ghost"
                className="h-9"
                onClick={() => {
                  setSearch('')
                  setSortBy('recent_access')
                  setEnrollmentDateFrom('')
                  setEnrollmentDateTo('')
                  setPurchaseDateFrom('')
                  setPurchaseDateTo('')
                }}
              >
                {t('my_learning.clear_filters')}
              </Button>
            </div>
          )}

          <TabsContent value="in-progress" className="mt-6 md:mt-8">
            {enrollments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('my_learning.empty_not_enrolled')}</p>
                <Button className="mt-4" onClick={() => navigate('/courses')}>{t('my_learning.explore_courses')}</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {enrollments.map((enrollment) => {
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
                            <Button size="sm" className="gap-2" onClick={() => handleContinueLearning(course.course_id)}>
                              <Play className="h-4 w-4" />
                              {t('my_learning.continue_learning')}
                            </Button>
                            <Button size="sm" variant="secondary" className="gap-2" onClick={() => navigate(`/course/${course.course_id}`)}>
                              <Info className="h-4 w-4" />
                              {t('my_learning.view_details')}
                            </Button>
                          </div>
                        </div>

                        <CardHeader className="pb-3">
                          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                          <CardDescription>{t('my_learning.by_instructor', { name: course.instructor_name || t('my_learning.instructor_fallback') })}</CardDescription>
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

                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">{t('my_learning.pagination', { current: currentPage, totalPages, totalCount })}</p>
                  <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 md:mt-8">
            {enrollments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('my_learning.no_completed')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {enrollments.map((enrollment) => {
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
                            <Button size="sm" className="gap-2" onClick={() => navigate(`/course-player/${course.course_id}`)}>
                              <Play className="h-4 w-4" />
                              {t('my_learning.continue_learning')}
                            </Button>
                            <Button size="sm" variant="secondary" className="gap-2" onClick={() => navigate(`/course/${course.course_id}`)}>
                              <Info className="h-4 w-4" />
                              {t('my_learning.view_details')}
                            </Button>
                          </div>
                        </div>

                        <CardHeader className="pb-3">
                          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                          <CardDescription>{t('my_learning.by_instructor', { name: course.instructor_name || t('my_learning.instructor_fallback') })}</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {enrollment.completion_date && (
                            <div className="text-sm text-muted-foreground">
                              {t('my_learning.completed_on', { date: new Date(enrollment.completion_date).toLocaleDateString('vi-VN') })}
                            </div>
                          )}
                          {enrollment.certificate_issue_date && (
                            <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/certificate')}>
                              <Award className="h-4 w-4" />
                              {t('my_learning.view_certificate')}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">{t('my_learning.pagination', { current: currentPage, totalPages, totalCount })}</p>
                  <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              </>
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
