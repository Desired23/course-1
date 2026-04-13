import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Skeleton } from '../../components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Input } from "../../components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Plus, Search, Eye, Edit, BarChart3, Users, Star, DollarSign, BookOpen, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { PreviewCourseModal } from "../../components/PreviewCourseModal"
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { UserPagination } from '../../components/UserPagination'
import { getCourses, updateCourse, deleteCourse, type CourseListItem, formatPrice, parseDecimal, getLevelLabel, formatDuration } from '../../services/course.api'
import { getInstructorDashboardStats, getMyInstructorProfile, type InstructorDashboardStats } from '../../services/instructor.api'
import { toast } from 'sonner'
import { listItemTransition } from '../../lib/motion'

const ITEMS_PER_PAGE = 6

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

export function InstructorCoursesPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()

  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [stats, setStats] = useState<InstructorDashboardStats | null>(null)
  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedTab, setSelectedTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editCourseId, setEditCourseId] = useState<number | null>(null)
  const [mutatingCourseId, setMutatingCourseId] = useState<number | null>(null)

  const renderCourseSkeleton = () => (
    <div className="space-y-4 md:space-y-6">
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
        <div key={`instructor-course-skeleton-${index}`} className="rounded-lg border bg-card p-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-32 w-full md:w-48 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        setError(null)
        const profile = await getMyInstructorProfile(user.id)
        if (cancelled) return
        setInstructorId(profile.id)
        const dashboardStats = await getInstructorDashboardStats(profile.id)
        if (!cancelled) setStats(dashboardStats)
      } catch (err: any) {
        if (!cancelled) setError(err.message || t('instructor_courses.load_failed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [user?.id])

  const refreshDashboardStats = async () => {
    if (!instructorId) return
    const dashboardStats = await getInstructorDashboardStats(instructorId)
    setStats(dashboardStats)
  }

  const refreshCourses = async (pageOverride?: number) => {
    if (!instructorId) return
    const nextPage = pageOverride ?? currentPage
    const res = await getCourses({
      instructor_id: instructorId,
      page: nextPage,
      page_size: ITEMS_PER_PAGE,
      status: effectiveStatus,
      search: debouncedSearch || undefined,
      ordering,
    })
    setCourses(res.results)
    setTotalPages(res.total_pages || 1)
    setTotalCount(res.count || 0)
    if (nextPage > (res.total_pages || 1)) {
      setCurrentPage(Math.max(1, res.total_pages || 1))
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTab, statusFilter, sortBy, debouncedSearch])

  const effectiveStatus = useMemo(() => {
    if (selectedTab === 'published') return 'published'
    if (selectedTab === 'draft') return 'draft'
    return statusFilter !== 'all' ? statusFilter : undefined
  }, [selectedTab, statusFilter])

  const ordering = useMemo(() => {
    switch (sortBy) {
      case 'students': return '-total_students'
      case 'rating': return '-rating'
      case 'revenue': return '-price'
      default: return '-updated_at'
    }
  }, [sortBy])

  useEffect(() => {
    if (!instructorId) return
    let cancelled = false
    async function loadList() {
      try {
        setListLoading(true)
        const res = await getCourses({
          instructor_id: instructorId,
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
          status: effectiveStatus,
          search: debouncedSearch || undefined,
          ordering,
        })
        if (cancelled) return
        setCourses(res.results)
        setTotalPages(res.total_pages || 1)
        setTotalCount(res.count || 0)
      } catch (err: any) {
        if (!cancelled) setError(err.message || t('instructor_courses.load_failed'))
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }
    loadList()
    return () => { cancelled = true }
  }, [instructorId, currentPage, effectiveStatus, debouncedSearch, ordering])

  const handlePreview = (courseId: number) => {
    setPreviewCourseId(courseId.toString())
    setIsPreviewOpen(true)
  }

  const handleOpenEditChoice = (courseId: number) => {
    setEditCourseId(courseId)
  }

  const handleCloseEditChoice = () => {
    setEditCourseId(null)

    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        document.body.style.pointerEvents = ''
      })
    }
  }

  const handleNavigateFromEditChoice = (target: 'lessons' | 'landing') => {
    if (!editCourseId) return
    const selectedCourseId = editCourseId
    handleCloseEditChoice()
    requestAnimationFrame(() => {
      if (target === 'lessons') {
        navigate(`/instructor/lessons/${selectedCourseId}`)
        return
      }
      navigate(`/instructor/course-landing/${selectedCourseId}`)
    })
  }

  const getAvailableActions = (course: CourseListItem) => {
    if (course.status === 'draft') {
      return [{ label: t('instructor_courses.submit_for_review'), run: () => handleCourseStatusChange(course, 'pending', t('instructor_courses.confirm_submit_for_review')) }]
    }
    if (course.status === 'archived') {
      const actions = [{ label: t('instructor_courses.move_to_draft'), run: () => handleCourseStatusChange(course, 'draft', t('instructor_courses.confirm_move_archived_to_draft')) }]
      if (!course.content_changed_since_publish) {
        actions.unshift({ label: t('instructor_courses.restore_published'), run: () => handleCourseStatusChange(course, 'published', t('instructor_courses.confirm_restore_published')) })
      }
      return actions
    }
    if (['pending', 'rejected'].includes(course.status)) {
      return [{ label: t('instructor_courses.move_to_draft'), run: () => handleCourseStatusChange(course, 'draft', t('instructor_courses.confirm_move_to_draft')) }]
    }
    if (course.status === 'published') {
      return [{ label: t('instructor_courses.archive'), run: () => handleCourseStatusChange(course, 'archived', t('instructor_courses.confirm_archive')) }]
    }
    return []
  }

  const handleCourseStatusChange = async (
    course: CourseListItem,
    nextStatus: CourseListItem['status'],
    confirmationMessage: string
  ) => {
    if (!window.confirm(confirmationMessage)) return
    try {
      setMutatingCourseId(course.id)
      await updateCourse(course.id, { status: nextStatus })
      await Promise.all([refreshCourses(), refreshDashboardStats()])
      toast.success(t('instructor_courses.status_updated', { status: t(`instructor_courses.status_${nextStatus}`) }))
    } catch (err: any) {
      toast.error(err?.message || t('instructor_courses.status_update_failed'))
    } finally {
      setMutatingCourseId(null)
    }
  }

  const handleDeleteCourse = async (course: CourseListItem) => {
    if (!window.confirm(t('instructor_courses.confirm_delete', { title: course.title }))) return
    try {
      setMutatingCourseId(course.id)
      await deleteCourse(course.id)
      const shouldGoBackPage = courses.length === 1 && currentPage > 1
      const nextPage = shouldGoBackPage ? currentPage - 1 : currentPage
      await Promise.all([refreshCourses(nextPage), refreshDashboardStats()])
      toast.success(t('instructor_courses.delete_success'))
    } catch (err: any) {
      toast.error(err?.message || t('instructor_courses.delete_failed'))
    } finally {
      setMutatingCourseId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500 hover:bg-green-600">{t('instructor_courses.published')}</Badge>
      case 'draft':
        return <Badge variant="secondary">{t('instructor_courses.draft')}</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{t('instructor_courses.pending_review')}</Badge>
      case 'rejected':
        return <Badge variant="destructive">{t('instructor_courses.rejected')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-80" />
        </div>
        {renderCourseSkeleton()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>{t('instructor_courses.retry')}</Button>
      </div>
    )
  }

  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  return (
    <motion.div className="container mx-auto px-4 py-6 md:py-8" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8" variants={fadeInUp}>
        <div>
          <h1 className="mb-2">{t('instructor_courses.title')}</h1>
          <p className="text-muted-foreground">
            {t('instructor_courses.subtitle')}
          </p>
        </div>

        <Button onClick={() => navigate('/instructor/courses/create')} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          {t('instructor_courses.create_course')}
        </Button>
      </motion.div>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8" variants={fadeInUp}>
        <Card className="app-interactive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.total_courses ?? totalCount}</p>
                <p className="text-sm text-muted-foreground">{t('instructor_courses.total_courses')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-interactive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{(stats?.total_students ?? 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t('instructor_courses.total_students')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-interactive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.published_courses ?? 0}</p>
                <p className="text-sm text-muted-foreground">{t('instructor_courses.published')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-interactive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{(stats?.average_rating ?? 0).toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">{t('instructor_courses.avg_rating')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="app-surface-elevated flex flex-col md:flex-row gap-4 mb-6 rounded-lg p-4" variants={fadeInUp}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('instructor_courses.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('instructor_courses.filter_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('instructor_courses.all_status')}</SelectItem>
            <SelectItem value="published">{t('instructor_courses.published')}</SelectItem>
            <SelectItem value="draft">{t('instructor_courses.draft')}</SelectItem>
            <SelectItem value="pending">{t('instructor_courses.pending_review')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('instructor_courses.sort_by')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('instructor_courses.most_recent')}</SelectItem>
            <SelectItem value="students">{t('instructor_courses.most_students')}</SelectItem>
            <SelectItem value="rating">{t('instructor_courses.highest_rated')}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="relative grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="all" className="relative text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {selectedTab === 'all' && <motion.span layoutId="instructor-courses-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10"><span className="hidden sm:inline">{t('instructor_courses.all_courses_tab')} </span><span className="sm:hidden">{t('common.all')} </span>({stats?.total_courses ?? totalCount})</span>
          </TabsTrigger>
          <TabsTrigger value="published" className="relative text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {selectedTab === 'published' && <motion.span layoutId="instructor-courses-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10"><span className="hidden sm:inline">{t('instructor_courses.published_tab')} </span><span className="sm:hidden">{t('instructor_courses.published_short')} </span>({stats?.published_courses ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="draft" className="relative text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            {selectedTab === 'draft' && <motion.span layoutId="instructor-courses-tabs-glider" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-md bg-background shadow-sm" />}
            <span className="relative z-10"><span className="hidden sm:inline">{t('instructor_courses.drafts_tab')} </span><span className="sm:hidden">{t('instructor_courses.draft_short')} </span>({stats?.draft_courses ?? 0})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6 md:mt-8">
          {listLoading ? (
            renderCourseSkeleton()
          ) : (
            <div className="space-y-4 md:space-y-6">
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={listItemTransition(index)}
                >
                <Card className="app-interactive hover:shadow-lg">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      <div className="flex-shrink-0">
                        <ImageWithFallback
                          src={course.thumbnail || ''}
                          alt={course.title}
                          className="w-full md:w-48 h-48 md:h-32 object-cover rounded-lg"
                        />
                      </div>

                      <div className="flex-1 space-y-3 md:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="font-semibold line-clamp-2">{course.title}</h3>
                              {getStatusBadge(course.status)}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                              <span>{course.category_name || 'Uncategorized'} • {getLevelLabel(course.level)}</span>
                              <span>{course.total_lessons} {t('instructor_courses.lessons')}</span>
                              {course.duration && <span className="hidden sm:inline">{formatDuration(course.duration)}</span>}
                              <span className="hidden lg:inline">{t('instructor_courses.updated')} {new Date(course.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={() => handlePreview(course.id)}>
                              <Eye className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">{t('instructor_courses.preview')}</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditChoice(course.id)}>
                              <Edit className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">{t('instructor_courses.edit')}</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/instructor/courses/${course.id}`)}>
                              <BarChart3 className="h-4 w-4 md:mr-1" />
                              <span className="hidden lg:inline">{t('instructor_courses.analytics')}</span>
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                          <div className="text-center">
                            <p className="font-semibold text-sm md:text-base">{course.total_students.toLocaleString()}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">{t('instructor_courses.students')}</p>
                          </div>

                          {course.status === 'published' && (
                            <>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <p className="font-semibold text-sm md:text-base">{parseDecimal(course.rating).toFixed(1)}</p>
                                </div>
                                <p className="text-xs md:text-sm text-muted-foreground">{course.total_reviews} {t('instructor_courses.reviews')}</p>
                              </div>

                              <div className="text-center">
                                <p className="font-semibold text-sm md:text-base">{formatPrice(parseDecimal(course.price))}</p>
                                <p className="text-xs md:text-sm text-muted-foreground">{t('instructor_courses.price')}</p>
                              </div>

                              <div className="text-center">
                                <p className="font-semibold text-sm md:text-base">{course.total_modules}</p>
                                <p className="text-xs md:text-sm text-muted-foreground">{t('instructor_courses.modules')}</p>
                              </div>
                            </>
                          )}

                          {course.status === 'draft' && (
                            <div className="col-span-2 sm:col-span-3 text-center">
                              <p className="text-muted-foreground text-sm">{t('instructor_courses.draft_mode_notice')}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <span className="font-medium">{formatPrice(parseDecimal(course.price))}</span>
                            {course.discount_price && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-green-600">{t('instructor_courses.discount')}: {formatPrice(parseDecimal(course.discount_price))}</span>
                              </>
                            )}
                          </div>
                          {course.status === 'archived' && course.content_changed_since_publish && (
                            <span className="text-xs text-amber-600">
                              {t('instructor_courses.archived_changed_notice')}
                            </span>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/instructor/courses/${course.id}`)}>
                              {t('instructor_courses.view_analytics')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/instructor/lessons/${course.id}`)}>
                              {t('instructor_courses.edit_lessons')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/instructor/course-landing/${course.id}`)}>
                              {t('instructor_courses.edit_course_info')}
                            </Button>
                            {getAvailableActions(course).map((action) => (
                              <Button
                                key={action.label}
                                variant="outline"
                                size="sm"
                                onClick={action.run}
                                disabled={mutatingCourseId === course.id}
                              >
                                {mutatingCourseId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : action.label}
                              </Button>
                            ))}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCourse(course)}
                              disabled={mutatingCourseId === course.id}
                            >
                              {mutatingCourseId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.delete')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              ))}

              {courses.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="mb-2">{t('instructor_courses.no_courses_found')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? t('instructor_courses.no_courses_search') : t('instructor_courses.no_courses_empty')}
                  </p>
                  <Button onClick={() => navigate('/instructor/courses/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('instructor_courses.create_course')}
                  </Button>
                </div>
              )}

              {totalCount > 0 && (
                <div className="pt-2">
                  <div className="text-sm text-muted-foreground mb-3">
                    {t('instructor_courses.pagination_summary', { start: startIdx, end: endIdx, total: totalCount })}
                  </div>
                  <UserPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </motion.div>

      <PreviewCourseModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        courseId={previewCourseId}
      />

      <Dialog open={editCourseId !== null} onOpenChange={(open) => !open && handleCloseEditChoice()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('instructor_courses.edit_mode_title')}</DialogTitle>
            <DialogDescription>
              {t('instructor_courses.edit_mode_description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              variant="outline"
              onClick={() => handleNavigateFromEditChoice('lessons')}
            >
              {t('instructor_courses.edit_lesson_list')}
            </Button>
            <Button
              onClick={() => handleNavigateFromEditChoice('landing')}
            >
              {t('instructor_courses.edit_course_info')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

