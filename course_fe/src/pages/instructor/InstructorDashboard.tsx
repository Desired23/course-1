import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from "../../contexts/AuthContext"
import { useRouter } from "../../components/Router"
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Input } from "../../components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { UserPagination } from "../../components/UserPagination"
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  Star, 
  Plus, 
  Eye, 
  Edit, 
  Loader2
} from 'lucide-react'
import { getInstructorDashboardStats, getMyInstructorProfile, type InstructorDashboardStats } from '../../services/instructor.api'
import { getCourses, type CourseListItem, formatPrice, parseDecimal } from '../../services/course.api'

export function InstructorDashboard() {
  const { user, hasRole } = useAuth()
  const { navigate } = useRouter()
  const { t } = useTranslation()

  const [stats, setStats] = useState<InstructorDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('students')
  const [currentPage, setCurrentPage] = useState(1)
  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [editCourseId, setEditCourseId] = useState<number | null>(null)

  useEffect(() => {
    if (!hasRole('instructor')) return
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [profile, data] = await Promise.all([
          user?.id ? getMyInstructorProfile(user.id) : Promise.resolve(null),
          getInstructorDashboardStats(),
        ])
        if (!cancelled) {
          setStats(data)
          setInstructorId(profile?.id ?? null)
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [hasRole, user?.id])

  const courseStatsMap = useMemo(() => {
    const map = new Map<number, InstructorDashboardStats['course_stats'][number]>()
    for (const c of stats?.course_stats ?? []) map.set(c.course_id, c)
    return map
  }, [stats?.course_stats])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortBy])

  const ITEMS_PER_PAGE = 5

  const effectiveStatus = useMemo(() => {
    if (statusFilter === 'all') return undefined
    return statusFilter
  }, [statusFilter])

  const ordering = useMemo(() => {
    if (sortBy === 'rating') return '-rating'
    if (sortBy === 'earnings') return '-price'
    return '-total_students'
  }, [sortBy])

  useEffect(() => {
    let cancelled = false
    async function loadCourses() {
      try {
        setListLoading(true)
        const res = await getCourses({
          instructor_id: instructorId ?? undefined,
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
          status: effectiveStatus,
          search: searchQuery || undefined,
          ordering,
        })
        if (cancelled) return
        setCourses(res.results || [])
        setTotalCount(res.count || 0)
        setTotalPages(res.total_pages || 1)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load courses')
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }
    if (hasRole('instructor') && instructorId) loadCourses()
    return () => { cancelled = true }
  }, [hasRole, instructorId, currentPage, effectiveStatus, searchQuery, ordering])

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

  if (!hasRole('instructor')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">{t('instructor_dashboard.access_denied')}</h2>
          <p className="text-muted-foreground mb-4">{t('instructor_dashboard.access_denied_desc')}</p>
          <Button onClick={() => window.history.back()}>
            {t('instructor_dashboard.go_back')}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">{error || 'Failed to load dashboard'}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.total_courses')}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.total_courses}</div>
              <p className="text-xs text-muted-foreground">
                {t('instructor_dashboard.published_draft_count', { published: stats.published_courses, draft: stats.draft_courses })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.total_students')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.total_students.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t('instructor_dashboard.this_month_gain', { count: stats.new_students_this_month })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.total_earnings')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatPrice(stats.total_earnings)}</div>
              <p className="text-xs text-muted-foreground">
                {t('instructor_dashboard.this_month_revenue_gain', { amount: formatPrice(stats.this_month_earnings) })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('instructor_dashboard.avg_rating')}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.average_rating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_reviews} {t('instructor_dashboard.reviews_suffix')} â€¢ {stats.pending_questions} Q&A pending
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses">{t('instructor_dashboard.courses_tab')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('instructor_dashboard.analytics_tab')}</TabsTrigger>
            <TabsTrigger value="earnings">{t('instructor_dashboard.earnings_tab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('instructor_dashboard.course_management')}</CardTitle>
                  <Button onClick={() => navigate('/instructor/courses/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('instructor_dashboard.create_new_course')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses..."
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="students">Most Students</SelectItem>
                      <SelectItem value="earnings">Highest Earnings</SelectItem>
                      <SelectItem value="rating">Highest Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  {listLoading ? (
                    <div className="min-h-[160px] flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : courses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No courses yet. Create your first course!</p>
                  ) : (
                    courses.map((course) => {
                      const extra = courseStatsMap.get(course.id)
                      const completionRate = extra?.completion_rate ?? 0
                      const newStudentsThisMonth = extra?.new_students_this_month ?? 0
                      const earnings = extra?.earnings ?? parseDecimal(course.price)
                      return (
                      <div key={course.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                            <div>
                              <h3 className="font-medium text-lg sm:text-base">{course.title}</h3>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1 sm:mt-0">
                                <span>{course.total_students.toLocaleString()} {t('instructor_dashboard.students_suffix')}</span>
                                {parseDecimal(course.rating) > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span>{parseDecimal(course.rating).toFixed(1)}</span>
                                    <span className="hidden sm:inline">({course.total_reviews} {t('instructor_dashboard.reviews_suffix')})</span>
                                  </div>
                                )}
                                <span className="font-medium text-green-600">{formatPrice(earnings)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/course/${course.id}`)}>
                                <Eye className="h-4 w-4 mr-1" />
                                {t('instructor_dashboard.view_course')}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditCourseId(course.id)}>
                                <Edit className="h-4 w-4 mr-1" />
                                {t('instructor_dashboard.edit_course')}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span>{t('instructor_dashboard.completion_rate_label')}</span>
                            <div className="flex-1 max-w-[200px]">
                              <Progress value={completionRate} className="h-2" />
                            </div>
                            <span>{completionRate}%</span>
                          </div>
                          
                          {newStudentsThisMonth > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              +{newStudentsThisMonth} new students this month
                            </p>
                          )}
                        </div>
                      </div>
                    )})
                  )}
                </div>
                {courses.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      Showing {totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
                      -
                      {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
                      {' '}of {totalCount} courses
                    </div>
                    <UserPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('instructor_dashboard.performance_metrics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('instructor_dashboard.student_satisfaction')}</span>
                      <span className="font-medium">{stats.average_rating.toFixed(1)}/5</span>
                    </div>
                    <Progress value={stats.average_rating * 20} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Reviews</span>
                      <span className="font-medium">{stats.total_reviews}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Q&A</span>
                      <span className="font-medium">{stats.pending_questions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Published Courses</span>
                      <span className="font-medium">{stats.published_courses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Draft Courses</span>
                      <span className="font-medium">{stats.draft_courses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Students This Month</span>
                      <span className="font-medium">{stats.new_students_this_month}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">This Month Earnings</span>
                      <span className="font-medium text-green-600">{formatPrice(stats.this_month_earnings)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>{t('instructor_dashboard.earnings_overview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-medium">{formatPrice(stats.this_month_earnings)}</div>
                    <p className="text-sm text-muted-foreground">{t('instructor_dashboard.this_month')}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-medium">{formatPrice(stats.this_month_earnings * 12)}</div>
                    <p className="text-sm text-muted-foreground">{t('instructor_dashboard.projected_annual')}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-medium">{formatPrice(stats.total_earnings)}</div>
                    <p className="text-sm text-muted-foreground">{t('instructor_dashboard.all_time')}</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <Button variant="outline" onClick={() => navigate('/instructor/earnings')}>
                    View Detailed Earnings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={editCourseId !== null} onOpenChange={(open) => !open && handleCloseEditChoice()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('instructor_dashboard.edit_mode_title')}</DialogTitle>
              <DialogDescription>
                {t('instructor_dashboard.edit_mode_description')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
              <Button
                variant="outline"
                onClick={() => handleNavigateFromEditChoice('lessons')}
              >
                {t('instructor_dashboard.edit_lesson_list')}
              </Button>
              <Button
                onClick={() => handleNavigateFromEditChoice('landing')}
              >
                {t('instructor_dashboard.edit_course_info')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}

