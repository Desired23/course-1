import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Input } from "../../components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Plus, Search, Eye, Edit, BarChart3, Users, Star, DollarSign, BookOpen, Loader2 } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { useAuth } from "../../contexts/AuthContext"
import { PreviewCourseModal } from "../../components/PreviewCourseModal"
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { UserPagination } from '../../components/UserPagination'
import { getCourses, type CourseListItem, formatPrice, parseDecimal, getLevelLabel, formatDuration } from '../../services/course.api'
import { getInstructorDashboardStats, getMyInstructorProfile, type InstructorDashboardStats } from '../../services/instructor.api'

const ITEMS_PER_PAGE = 6

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
        if (!cancelled) setError(err.message || 'Failed to load courses')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [user?.id])

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
        if (!cancelled) setError(err.message || 'Failed to load courses')
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
    // Prevent stale body lock when closing dialog during route changes
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        <Card>
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

        <Card>
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

        <Card>
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

        <Card>
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
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
            <span className="hidden sm:inline">{t('instructor_courses.all_courses_tab')} </span>
            <span className="sm:hidden">{t('common.all')} </span>
            ({stats?.total_courses ?? totalCount})
          </TabsTrigger>
          <TabsTrigger value="published" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
            <span className="hidden sm:inline">{t('instructor_courses.published_tab')} </span>
            <span className="sm:hidden">Pub. </span>
            ({stats?.published_courses ?? 0})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
            <span className="hidden sm:inline">{t('instructor_courses.drafts_tab')} </span>
            <span className="sm:hidden">Draft </span>
            ({stats?.draft_courses ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6 md:mt-8">
          {listLoading ? (
            <div className="min-h-[220px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {courses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
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
                              <span>{course.category_name || 'Uncategorized'} â€¢ {getLevelLabel(course.level)}</span>
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
                            <Button variant="outline" size="sm" onClick={() => navigate(`/course/${course.id}`)}>
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
                                <p className="text-xs md:text-sm text-muted-foreground">Modules</p>
                              </div>
                            </>
                          )}

                          {course.status === 'draft' && (
                            <div className="col-span-2 sm:col-span-3 text-center">
                              <p className="text-muted-foreground text-sm">{t('instructor_courses.draft_mode_notice')}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-3 border-t">
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <span className="font-medium">{formatPrice(parseDecimal(course.price))}</span>
                            {course.discount_price && (
                              <>
                                <span className="text-muted-foreground">â€¢</span>
                                <span className="text-green-600">{t('instructor_courses.discount')}: {formatPrice(parseDecimal(course.discount_price))}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                    Showing {startIdx}-{endIdx} of {totalCount} courses
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

      <PreviewCourseModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        courseId={previewCourseId}
      />

      <Dialog open={editCourseId !== null} onOpenChange={(open) => !open && handleCloseEditChoice()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chá»n kiá»ƒu chá»‰nh sá»­a</DialogTitle>
            <DialogDescription>
              Báº¡n muá»‘n chá»‰nh sá»­a danh sÃ¡ch bÃ i há»c hay thÃ´ng tin khÃ³a há»c?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              variant="outline"
              onClick={() => handleNavigateFromEditChoice('lessons')}
            >
              Chá»‰nh sá»­a list bÃ i há»c
            </Button>
            <Button
              onClick={() => handleNavigateFromEditChoice('landing')}
            >
              Chá»‰nh sá»­a thÃ´ng tin khÃ³a há»c
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

