import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Award, BookOpen, Crown, Loader2, Play } from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Badge } from "../../components/ui/badge"
import { Skeleton } from '../../components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { useRouter } from "../../components/Router"
import { UserPagination } from '../../components/UserPagination'
import { getMyEnrollments, type Enrollment, parseProgress } from '../../services/enrollment.api'
import { formatDuration } from '../../services/course.api'
import { getMySubscriptionCourses, type PlanCourse, formatPrice as formatSubscriptionPrice } from '../../services/subscription.api'
import { listItemTransition } from '../../lib/motion'

type SortBy = 'recent_access' | 'newest_enrollment' | 'oldest_enrollment' | 'title_asc' | 'progress_desc'
type LearningTab = 'in-progress' | 'completed' | 'plan-courses' | 'bookmarks'

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
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
  const [recentCourses, setRecentCourses] = useState<Enrollment[]>([])
  const [recentCoursesLoading, setRecentCoursesLoading] = useState(true)

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
    let cancelled = false
    setRecentCoursesLoading(true)

    getMyEnrollments({
      page: 1,
      page_size: 4,
      status: 'active',
      sort_by: 'recent_access',
    })
      .then((response) => {
        if (cancelled) return
        setRecentCourses(response.results || [])
      })
      .catch(() => {
        if (cancelled) return
        setRecentCourses([])
      })
      .finally(() => {
        if (!cancelled) setRecentCoursesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

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

  const renderCardSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: pageSize }).map((_, index) => (
        <div key={`skeleton-${index}`} className="overflow-hidden rounded-lg border bg-card p-4 space-y-4">
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )

  const renderPlanCourses = (items: PlanCourse[]) => {
    if (planCoursesLoading) {
      return renderCardSkeleton()
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
          {items.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={listItemTransition(index)}
            >
            <Card className="app-interactive group hover:shadow-lg">
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>{formatSubscriptionPrice(course.course_price)}</span>
                  <span>{course.course_rating ? `${Number(course.course_rating).toFixed(1)}★` : '-'}</span>
                </div>

                <Button variant="outline" className="w-full" onClick={() => navigate(`/course/${course.course}`)}>
                  {t('my_learning.view_details')}
                </Button>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('my_learning.plan_pagination', { current: planCurrentPage, totalPages: planTotalPages, totalCount: planTotalCount })}</p>
          <UserPagination currentPage={planCurrentPage} totalPages={planTotalPages} onPageChange={setPlanCurrentPage} />
        </div>
      </>
    )
  }

  const renderRecentCourses = () => {
    if (recentCoursesLoading) {
      return (
        <motion.div variants={fadeInUp} className="mb-6 md:mb-8">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">{t('my_learning.recent_courses_title')}</h2>
            <p className="text-sm text-muted-foreground">{t('my_learning.recent_courses_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`recent-course-skeleton-${index}`} className="rounded-lg border bg-card p-3 space-y-2">
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))}
          </div>
        </motion.div>
      )
    }

    if (recentCourses.length === 0) {
      return null
    }

    return (
      <motion.div variants={fadeInUp} className="mb-6 md:mb-8 space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t('my_learning.recent_courses_title')}</h2>
          <p className="text-sm text-muted-foreground">{t('my_learning.recent_courses_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {recentCourses.map((enrollment) => {
            const progress = parseProgress(enrollment.progress)
            const lastWatched = enrollment.last_access_date
              ? new Date(enrollment.last_access_date).toLocaleDateString()
              : t('my_learning.last_watched_fallback')

            return (
              <Card key={`recent-${enrollment.enrollment_id}`} className="overflow-hidden">
                <div className="relative">
                  <img
                    src={enrollment.course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop'}
                    alt={enrollment.course.title}
                    className="h-24 w-full object-cover"
                  />
                </div>
                <CardContent className="space-y-2 p-3">
                  <p className="line-clamp-2 text-sm font-medium">{enrollment.course.title}</p>
                  <p className="text-xs text-muted-foreground">{t('my_learning.last_watched')}: {lastWatched}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t('my_learning.progress')}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                  <Button size="sm" className="w-full gap-2" onClick={() => handleContinueLearning(enrollment.course.course_id)}>
                    <Play className="h-3.5 w-3.5" />
                    {t('my_learning.continue_learning')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </motion.div>
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
          {items.map((enrollment, index) => {
            const course = enrollment.course
            const progress = parseProgress(enrollment.progress)
            return (
              <motion.div
                key={enrollment.enrollment_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={listItemTransition(index)}
              >
              <Card className="app-interactive group hover:shadow-lg">
                <div className="relative">
                  <img
                    src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=200&fit=crop'}
                    alt={course.title}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 sm:flex-row">
                    <Button size="sm" className="w-[80%] gap-2 sm:w-auto" onClick={() => handleContinueLearning(course.course_id)}>
                      <Play className="h-4 w-4" />
                      {t('my_learning.continue_learning')}
                    </Button>
                    <Button size="sm" variant="secondary" className="w-[80%] gap-2 sm:w-auto" onClick={() => navigate(`/course/${course.course_id}`)}>
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

                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
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
              </motion.div>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t('my_learning.pagination', { current: currentPage, totalPages, totalCount })}</p>
          <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </>
    )
  }

  if (loading && isCourseTab && !hasLoadedOnce) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          {renderCardSkeleton()}
        </div>
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
    <motion.div
      className="p-4 sm:p-6 lg:p-8 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div className="mb-6 md:mb-8" variants={fadeInUp} initial="hidden" animate="show">
          <h1 className="mb-2">{t('my_learning.title')}</h1>
          <p className="text-muted-foreground">{t('my_learning.subtitle')}</p>
        </motion.div>

        <motion.div variants={sectionStagger} initial="hidden" animate="show">
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as LearningTab)} className="w-full">
          <TabsList className="relative h-auto w-full justify-start overflow-x-auto p-1">
            <TabsTrigger value="in-progress" className="relative shrink-0 whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'in-progress' && (
                <motion.span
                  layoutId="my-learning-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('my_learning.in_progress')} ({inProgressCount})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="relative shrink-0 whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'completed' && (
                <motion.span
                  layoutId="my-learning-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('my_learning.completed')} ({completedCount})</span>
            </TabsTrigger>
            <TabsTrigger value="plan-courses" className="relative shrink-0 whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'plan-courses' && (
                <motion.span
                  layoutId="my-learning-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('my_learning.plan_courses')}</span>
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="relative shrink-0 whitespace-nowrap px-2 text-xs sm:px-4 sm:text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {selectedTab === 'bookmarks' && (
                <motion.span
                  layoutId="my-learning-tabs-glider"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 rounded-md bg-background shadow-sm"
                />
              )}
              <span className="relative z-10">{t('my_learning.archived')}</span>
            </TabsTrigger>
          </TabsList>

          {isCourseTab && (
            <motion.div variants={fadeInUp} className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
            </motion.div>
          )}

          {isPlanCoursesTab && (
            <motion.div variants={fadeInUp} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
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
            </motion.div>
          )}

          {isCourseTab && loading && hasLoadedOnce && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('my_learning.loading')}</span>
            </div>
          )}

          <TabsContent value="in-progress" className="mt-6 md:mt-8">
            <motion.div variants={fadeInUp} className="space-y-6 md:space-y-8">
              {renderRecentCourses()}
              {renderCourseGrid(enrollments)}
            </motion.div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6 md:mt-8">
            <motion.div variants={fadeInUp}>{renderCourseGrid(enrollments, true)}</motion.div>
          </TabsContent>

          <TabsContent value="plan-courses" className="mt-6 md:mt-8">
            <motion.div variants={fadeInUp}>{renderPlanCourses(planCourses)}</motion.div>
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-6 md:mt-8">
            <motion.div variants={fadeInUp} className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('my_learning.empty_title')}</p>
            </motion.div>
          </TabsContent>
        </Tabs>
        </motion.div>

      </div>
    </motion.div>
  )
}
