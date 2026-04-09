import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Award, BookOpen, Crown, Loader2, Play } from 'lucide-react'

import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { useRouter } from "../../components/Router"
import { UserPagination } from '../../components/UserPagination'
import { getMyEnrollments, type Enrollment, parseProgress } from '../../services/enrollment.api'
import { formatDuration } from '../../services/course.api'
import { getMySubscriptionCourses, type PlanCourse, formatPrice as formatSubscriptionPrice } from '../../services/subscription.api'

type SortBy = 'recent_access' | 'newest_enrollment' | 'oldest_enrollment' | 'title_asc' | 'progress_desc'
type LearningTab = 'in-progress' | 'completed' | 'plan-courses' | 'bookmarks'

export function MyLearningPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()

  const [selectedTab, setSelectedTab] = useState<LearningTab>('in-progress')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [inProgressCount, setInProgressCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent_access')
  const [enrollmentDateFrom, setEnrollmentDateFrom] = useState('')
  const [enrollmentDateTo, setEnrollmentDateTo] = useState('')
  const [purchaseDateFrom, setPurchaseDateFrom] = useState('')
  const [purchaseDateTo, setPurchaseDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [planCourses, setPlanCourses] = useState<PlanCourse[]>([])
  const [planCoursesLoading, setPlanCoursesLoading] = useState(false)
  const [planCoursesError, setPlanCoursesError] = useState<string | null>(null)
  const [planSearch, setPlanSearch] = useState('')
  const [debouncedPlanSearch, setDebouncedPlanSearch] = useState('')
  const [planCurrentPage, setPlanCurrentPage] = useState(1)
  const [planPageSize, setPlanPageSize] = useState(6)
  const [planTotalCount, setPlanTotalCount] = useState(0)
  const [planTotalPages, setPlanTotalPages] = useState(1)

  const isCourseTab = selectedTab === 'in-progress' || selectedTab === 'completed'
  const isPlanCoursesTab = selectedTab === 'plan-courses'

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPlanSearch(planSearch)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [planSearch])

  useEffect(() => {
    if (!isCourseTab) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const statusFilter = selectedTab === 'in-progress' ? 'active' : 'complete'

    getMyEnrollments({
      page: currentPage,
      page_size: pageSize,
      status: statusFilter,
      search: debouncedSearch || undefined,
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
        } else {
          setCompletedCount(listRes.count || 0)
        }
        setHasLoadedOnce(true)
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.message?.includes('No enrollments found') || err?.response?.status === 400) {
          setEnrollments([])
          setTotalCount(0)
          setTotalPages(1)
          if (selectedTab === 'in-progress') setInProgressCount(0)
          if (selectedTab === 'completed') setCompletedCount(0)
          setHasLoadedOnce(true)
          return
        }
        setError(t('my_learning.load_failed'))
        setHasLoadedOnce(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedTab, currentPage, pageSize, debouncedSearch, sortBy, enrollmentDateFrom, enrollmentDateTo, purchaseDateFrom, purchaseDateTo, isCourseTab, t])

  useEffect(() => {
    if (!isPlanCoursesTab) return

    let cancelled = false
    setPlanCoursesLoading(true)
    setPlanCoursesError(null)

    getMySubscriptionCourses({
      page: planCurrentPage,
      page_size: planPageSize,
      search: debouncedPlanSearch || undefined,
    })
      .then((res) => {
        if (cancelled) return
        setPlanCourses((res.results || []).filter((item) => item.status === 'active'))
        setPlanTotalCount(res.count || 0)
        setPlanTotalPages(res.total_pages || 1)
      })
      .catch(() => {
        if (cancelled) return
        setPlanCourses([])
        setPlanTotalCount(0)
        setPlanTotalPages(1)
        setPlanCoursesError(t('my_learning.plan_courses_load_failed'))
      })
      .finally(() => {
        if (!cancelled) setPlanCoursesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isPlanCoursesTab, planCurrentPage, planPageSize, debouncedPlanSearch, t])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTab, search, sortBy, enrollmentDateFrom, enrollmentDateTo, purchaseDateFrom, purchaseDateTo, pageSize])

  useEffect(() => {
    setPlanCurrentPage(1)
  }, [debouncedPlanSearch, planPageSize])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (planCurrentPage > planTotalPages) {
      setPlanCurrentPage(planTotalPages)
    }
  }, [planCurrentPage, planTotalPages])

  const handleContinueLearning = (courseId: number) => {
    navigate(`/course-player/${courseId}`)
  }

  const renderPlanCourses = (items: PlanCourse[]) => {
    if (planCoursesLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )
    }

    if (planCoursesError) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>{planCoursesError}</p>
        </div>
      )
    }

    if (planTotalCount === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{debouncedPlanSearch ? t('my_learning.plan_courses_no_match') : t('my_learning.plan_courses_empty')}</p>
        </div>
      )
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map((course) => (
            <Card key={course.id} className="group hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={course.course_thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop'}
                  alt={course.course_title}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-blue-600 hover:bg-blue-700">
                    <Crown className="h-3 w-3 mr-1" />
                    {t('my_learning.subscription_badge')}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2">{course.course_title}</CardTitle>
                <CardDescription>
                  {t('my_learning.by_instructor', { name: course.course_instructor || t('my_learning.instructor_fallback') })}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatSubscriptionPrice(course.course_price)}</span>
                  <span>{course.course_rating ? `${Number(course.course_rating).toFixed(1)}★` : '-'}</span>
                </div>

                <Button variant="outline" className="w-full" onClick={() => navigate(`/course/${course.course}`)}>
                  {t('my_learning.view_details')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">{t('my_learning.plan_pagination', { current: planCurrentPage, totalPages: planTotalPages, totalCount: planTotalCount })}</p>
          <UserPagination currentPage={planCurrentPage} totalPages={planTotalPages} onPageChange={setPlanCurrentPage} />
        </div>
      </>
    )
  }

  const renderCourseGrid = (items: Enrollment[], completedMode = false) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          {completedMode ? <Award className="h-12 w-12 mx-auto mb-4 opacity-50" /> : <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />}
          <p>{completedMode ? t('my_learning.no_completed') : t('my_learning.empty_not_enrolled')}</p>
          {!completedMode && <Button className="mt-4" onClick={() => navigate('/courses')}>{t('my_learning.explore_courses')}</Button>}
        </div>
      )
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {items.map((enrollment) => {
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
                      {t('my_learning.view_details')}
                    </Button>
                  </div>
                  {completedMode && enrollment.certificate_issue_date && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <Award className="h-3 w-3 mr-1" />
                        {t('common.certificate')}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription>{t('my_learning.by_instructor', { name: course.instructor_name || t('my_learning.instructor_fallback') })}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {!completedMode ? (
                    <>
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
                          <span>{course.duration ? formatDuration(course.duration) : ''}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
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
    )
  }

  if (loading && isCourseTab && !hasLoadedOnce) {
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

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as LearningTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="in-progress" className="text-xs sm:text-sm px-2 sm:px-4">
              {t('my_learning.in_progress')} ({inProgressCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-4">
              {t('my_learning.completed')} ({completedCount})
            </TabsTrigger>
            <TabsTrigger value="plan-courses" className="text-xs sm:text-sm px-2 sm:px-4">
              {t('my_learning.plan_courses')}
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs sm:text-sm px-2 sm:px-4">
              {t('my_learning.archived')}
            </TabsTrigger>
          </TabsList>

          {isCourseTab && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                className="h-9 rounded-md border px-3 text-sm"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('my_learning.search_placeholder')}
              />
              <select className="h-9 rounded-md border px-3 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
                <option value="recent_access">{t('my_learning.sort_recent')}</option>
                <option value="newest_enrollment">{t('my_learning.sort_newest_enrollment')}</option>
                <option value="oldest_enrollment">{t('my_learning.sort_oldest_enrollment')}</option>
                <option value="title_asc">{t('my_learning.sort_title')}</option>
                <option value="progress_desc">{t('my_learning.sort_progress')}</option>
              </select>
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={enrollmentDateFrom} onChange={(event) => setEnrollmentDateFrom(event.target.value)} />
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={enrollmentDateTo} onChange={(event) => setEnrollmentDateTo(event.target.value)} />
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={purchaseDateFrom} onChange={(event) => setPurchaseDateFrom(event.target.value)} />
              <input type="date" className="h-9 rounded-md border px-3 text-sm" value={purchaseDateTo} onChange={(event) => setPurchaseDateTo(event.target.value)} />
              <select className="h-9 rounded-md border px-3 text-sm" value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))}>
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

          {isPlanCoursesTab && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="h-9 rounded-md border px-3 text-sm"
                value={planSearch}
                onChange={(event) => setPlanSearch(event.target.value)}
                placeholder={t('my_learning.plan_search_placeholder')}
              />
              <select className="h-9 rounded-md border px-3 text-sm" value={String(planPageSize)} onChange={(event) => setPlanPageSize(Number(event.target.value))}>
                <option value="6">{t('my_learning.page_size.six')}</option>
                <option value="9">{t('my_learning.page_size.nine')}</option>
                <option value="12">{t('my_learning.page_size.twelve')}</option>
              </select>
              <Button
                variant="ghost"
                className="h-9"
                onClick={() => {
                  setPlanSearch('')
                  setPlanCurrentPage(1)
                }}
              >
                {t('my_learning.clear_filters')}
              </Button>
            </div>
          )}

          {isCourseTab && loading && hasLoadedOnce && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('my_learning.loading')}</span>
            </div>
          )}

          <TabsContent value="in-progress" className="mt-6 md:mt-8">
            {renderCourseGrid(enrollments)}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 md:mt-8">
            {renderCourseGrid(enrollments, true)}
          </TabsContent>

          <TabsContent value="plan-courses" className="mt-6 md:mt-8">
                {renderPlanCourses(planCourses)}
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
