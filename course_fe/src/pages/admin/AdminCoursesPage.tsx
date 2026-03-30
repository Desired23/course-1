import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Textarea } from "../../components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Search, Eye, Edit, Trash2, Check, X, Clock, Users, Star, DollarSign, BookOpen, Loader2 } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { toast } from 'sonner'
import { UserPagination } from '../../components/UserPagination'
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog'
import { Checkbox } from "../../components/ui/checkbox"
import { getCourses, updateCourse, deleteCourse as deleteCourseApi, type CourseListItem, parseDecimal } from '../../services/course.api'

const ITEMS_PER_PAGE = 10

export function AdminCoursesPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()

  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])
  const [moderationState, setModerationState] = useState<{
    open: boolean
    courseId: number | null
    courseTitle: string
    nextStatus: 'published' | 'rejected'
    confirmLabel: string
    title: string
    description: string
    loading: boolean
  }>({
    open: false,
    courseId: null,
    courseTitle: '',
    nextStatus: 'published',
    confirmLabel: '',
    title: '',
    description: '',
    loading: false,
  })
  const [moderationReason, setModerationReason] = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: '',
    destructive: false,
    loading: false,
    action: null,
  })
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    published: 0,
    pending: 0,
    draft: 0,
    rejected: 0,
  })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, debouncedSearch, sortBy])

  useEffect(() => {
    setSelectedCourseIds([])
  }, [currentPage, statusFilter, debouncedSearch, sortBy])

  const ordering = useMemo(() => {
    switch (sortBy) {
      case 'students': return '-total_students'
      case 'rating': return '-rating'
      default: return '-updated_at'
    }
  }, [sortBy])

  async function loadStatusCounts() {
    try {
      const [allRes, publishedRes, pendingRes, draftRes, rejectedRes] = await Promise.all([
        getCourses({ page: 1, page_size: 1 }),
        getCourses({ page: 1, page_size: 1, status: 'published' }),
        getCourses({ page: 1, page_size: 1, status: 'pending' }),
        getCourses({ page: 1, page_size: 1, status: 'draft' }),
        getCourses({ page: 1, page_size: 1, status: 'rejected' }),
      ])
      setStatusCounts({
        all: allRes.count || 0,
        published: publishedRes.count || 0,
        pending: pendingRes.count || 0,
        draft: draftRes.count || 0,
        rejected: rejectedRes.count || 0,
      })
    } catch {
      // counts are supplemental; ignore if BE does not support a status filter
    }
  }

  useEffect(() => {
    loadStatusCounts()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchCourses() {
      try {
        setLoading(true)
        const res = await getCourses({
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: debouncedSearch || undefined,
          ordering,
        })
        if (cancelled) return
        setCourses(res.results)
        setTotalPages(res.total_pages || 1)
        setTotalCount(res.count || 0)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch courses:', err)
          toast.error(t('admin_courses.toasts.load_failed'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCourses()
    return () => { cancelled = true }
  }, [currentPage, statusFilter, debouncedSearch, ordering])

  const getStatusBadge = (status: string) => {
    const variants = {
      published: { variant: "default" as const, text: t('admin_courses.status_published'), icon: Check },
      pending: { variant: "secondary" as const, text: t('admin_courses.status_pending'), icon: Clock },
      draft: { variant: "outline" as const, text: t('admin_courses.status_draft'), icon: Edit },
      rejected: { variant: "destructive" as const, text: t('admin_courses.status_rejected'), icon: X }
    }
    const config = variants[status as keyof typeof variants] || variants.draft
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const getLocalizedLevel = (level?: string | null) => {
    if (!level) return t('common.unknown')

    switch (level) {
      case 'beginner':
      case 'intermediate':
      case 'advanced':
      case 'all_levels':
        return t(`common.${level}`)
      default:
        return level
    }
  }

  async function refetchCurrentPageAndCounts() {
    const res = await getCourses({
      page: currentPage,
      page_size: ITEMS_PER_PAGE,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: debouncedSearch || undefined,
      ordering,
    })
    setCourses(res.results)
    setTotalPages(res.total_pages || 1)
    setTotalCount(res.count || 0)
    await loadStatusCounts()
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: '',
        description: '',
        confirmLabel: '',
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const openModerationDialog = (
    courseId: number,
    courseTitle: string,
    nextStatus: 'published' | 'rejected'
  ) => {
    setModerationReason('')
    setSendNotification(true)
    setNotifyMessage('')
    setModerationState({
      open: true,
      courseId,
      courseTitle,
      nextStatus,
      confirmLabel: nextStatus === 'published' ? t('admin_courses.moderation.approve_course') : t('admin_courses.moderation.reject_course'),
      title: nextStatus === 'published' ? t('admin_courses.moderation.approve_course') : t('admin_courses.moderation.reject_course'),
      description:
        nextStatus === 'published'
          ? t('admin_courses.moderation.approve_description', { title: courseTitle })
          : t('admin_courses.moderation.reject_description', { title: courseTitle }),
      loading: false,
    })
  }

  const handleModerationSubmit = async () => {
    if (!moderationState.courseId) return
    try {
      setModerationState(prev => ({ ...prev, loading: true }))
      await updateCourse(moderationState.courseId, {
        status: moderationState.nextStatus,
        status_reason: moderationReason.trim() || undefined,
        send_notification: sendNotification,
        notify_message: sendNotification ? notifyMessage.trim() || undefined : undefined,
      })
      toast.success(moderationState.nextStatus === 'published' ? t('admin_courses.toasts.approve_success') : t('admin_courses.toasts.reject_success'))
      setModerationState(prev => ({ ...prev, open: false, loading: false }))
      await refetchCurrentPageAndCounts()
    } catch {
      setModerationState(prev => ({ ...prev, loading: false }))
      toast.error(moderationState.nextStatus === 'published' ? t('admin_courses.toasts.approve_failed') : t('admin_courses.toasts.reject_failed'))
    }
  }

  const handleDeleteCourse = async (courseId: number) => {
    try {
      await deleteCourseApi(courseId)
      toast.success(t('admin_courses.toasts.delete_success'))
      await refetchCurrentPageAndCounts()
    } catch {
      toast.error(t('admin_courses.toasts.delete_failed'))
    }
  }

  const toggleCourseSelection = (courseId: number, checked: boolean) => {
    setSelectedCourseIds(prev => checked ? [...prev, courseId] : prev.filter(id => id !== courseId))
  }

  const toggleAllCourses = (checked: boolean) => {
    setSelectedCourseIds(checked ? courses.map(course => course.id) : [])
  }

  const bulkUpdateCourses = async (
    ids: number[],
    updater: (courseId: number) => Promise<void>,
    successMessage: string
  ) => {
    try {
      for (const id of ids) {
        await updater(id)
      }
      toast.success(successMessage)
      setSelectedCourseIds([])
      await refetchCurrentPageAndCounts()
    } catch {
      toast.error(t('admin_courses.toasts.bulk_failed'))
    }
  }

  const totalStudentsOnPage = courses.reduce((sum, c) => sum + (c.total_students || 0), 0)
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIdx = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2">{t('admin_courses.title')}</h1>
        <p className="text-muted-foreground">{t('admin_courses.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_courses.stats.total_courses')}</p>
                <p className="text-2xl font-semibold mt-1">{statusCounts.all}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_courses.stats.published')}</p>
                <p className="text-2xl font-semibold mt-1 text-green-600">{statusCounts.published}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_courses.stats.pending_review')}</p>
                <p className="text-2xl font-semibold mt-1 text-yellow-600">{statusCounts.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('admin_courses.stats.students_current_page')}</p>
                <p className="text-2xl font-semibold mt-1">{totalStudentsOnPage.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin_courses.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t('admin_courses.sort_label')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('admin_courses.sort_recent')}</SelectItem>
            <SelectItem value="students">{t('admin_courses.sort_students')}</SelectItem>
            <SelectItem value="rating">{t('admin_courses.sort_rating')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AdminBulkActionBar
        count={selectedCourseIds.length}
        label={t('admin_courses.bulk.selected_label')}
        onClear={() => setSelectedCourseIds([])}
        actions={[
          {
            key: 'approve',
            label: t('admin_courses.approve'),
            onClick: () => openConfirm(
              t('admin_courses.bulk.approve_title'),
              t('admin_courses.bulk.approve_description', { count: selectedCourseIds.length }),
              t('admin_courses.approve'),
              () => bulkUpdateCourses(selectedCourseIds, (id) => updateCourse(id, { status: 'published' }), t('admin_courses.toasts.bulk_approve_success')),
            ),
          },
          {
            key: 'reject',
            label: t('admin_courses.reject'),
            destructive: true,
            onClick: () => openConfirm(
              t('admin_courses.bulk.reject_title'),
              t('admin_courses.bulk.reject_description', { count: selectedCourseIds.length }),
              t('admin_courses.reject'),
              () => bulkUpdateCourses(selectedCourseIds, (id) => updateCourse(id, { status: 'rejected' }), t('admin_courses.toasts.bulk_reject_success')),
              true,
            ),
          },
          {
            key: 'delete',
            label: t('common.delete'),
            destructive: true,
            onClick: () => openConfirm(
              t('admin_courses.bulk.delete_title'),
              t('admin_courses.bulk.delete_description', { count: selectedCourseIds.length }),
              t('common.delete'),
              () => bulkUpdateCourses(selectedCourseIds, (id) => deleteCourseApi(id), t('admin_courses.toasts.bulk_delete_success')),
              true,
            ),
          },
        ]}
      />

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <div className="overflow-x-auto mb-6">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="all" className="whitespace-nowrap">{t('admin_courses.tabs.all', { count: statusCounts.all })}</TabsTrigger>
            <TabsTrigger value="published" className="whitespace-nowrap">{t('admin_courses.tabs.published', { count: statusCounts.published })}</TabsTrigger>
            <TabsTrigger value="pending" className="whitespace-nowrap">{t('admin_courses.tabs.pending', { count: statusCounts.pending })}</TabsTrigger>
            <TabsTrigger value="draft" className="whitespace-nowrap">{t('admin_courses.tabs.draft', { count: statusCounts.draft })}</TabsTrigger>
            <TabsTrigger value="rejected" className="whitespace-nowrap">{t('admin_courses.tabs.rejected', { count: statusCounts.rejected })}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={statusFilter}>
          {loading ? (
            <div className="min-h-[220px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      <div className="pt-1">
                        <Checkbox
                          checked={selectedCourseIds.includes(course.id)}
                          onCheckedChange={(checked) => toggleCourseSelection(course.id, Boolean(checked))}
                        />
                      </div>
                      <div className="flex-shrink-0">
                        <img
                          src={course.thumbnail || ''}
                          alt={course.title}
                          className="w-full md:w-48 h-48 md:h-32 object-cover rounded-lg"
                        />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                              <h3 className="font-semibold line-clamp-2 sm:line-clamp-1">{course.title}</h3>
                              {getStatusBadge(course.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{t('admin_courses.by_instructor', { name: course.instructor_name || t('admin_courses.unknown') })}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground mt-2">
                              <span>{course.category_name || t('admin_courses.uncategorized')} / {getLocalizedLevel(course.level)}</span>
                              <span className="hidden sm:inline">{t('admin_courses.created_at', { date: course.created_at?.split('T')[0] || '' })}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                              <Eye className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">{t('admin_courses.view')}</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                              <Edit className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">{t('admin_courses.edit')}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openConfirm(
                                t('admin_courses.actions.delete_title'),
                                t('admin_courses.actions.delete_description', { title: course.title }),
                                t('common.delete'),
                                () => handleDeleteCourse(course.id),
                                true,
                              )}
                            >
                              <Trash2 className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">{t('common.delete')}</span>
                            </Button>
                          </div>
                        </div>

                        {course.status === 'published' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 pt-3 border-t">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <p className="font-semibold text-sm md:text-base">{(course.total_students || 0).toLocaleString()}</p>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground">{t('admin_courses.metrics.students')}</p>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <p className="font-semibold text-sm md:text-base">{parseDecimal(course.rating).toFixed(1)}</p>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground">{t('admin_courses.metrics.reviews', { count: course.total_reviews || 0 })}</p>
                            </div>

                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <p className="font-semibold text-sm md:text-base">${parseDecimal(course.price)}</p>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground">{t('admin_courses.metrics.price')}</p>
                            </div>

                            <div className="text-center">
                              <p className="font-semibold text-sm md:text-base">${Math.round((course.total_students || 0) * parseDecimal(course.price) * 0.7).toLocaleString()}</p>
                              <p className="text-xs md:text-sm text-muted-foreground">{t('admin_courses.metrics.estimated_revenue')}</p>
                            </div>
                          </div>
                        ) : course.status === 'pending' ? (
                          <div className="flex gap-2 pt-3 border-t">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openModerationDialog(course.id, course.title, 'published')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {t('admin_courses.moderation.approve_course')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openModerationDialog(course.id, course.title, 'rejected')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              {t('admin_courses.moderation.reject_course')}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {courses.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">{t('admin_courses.no_courses')}</h3>
                    <p className="text-muted-foreground">{t('admin_courses.no_courses_hint')}</p>
                  </CardContent>
                </Card>
              )}

              {totalCount > 0 && (
                <div className="pt-2">
                  <div className="mb-3 flex items-center gap-2">
                    <Checkbox
                      checked={courses.length > 0 && selectedCourseIds.length === courses.length}
                      onCheckedChange={(checked) => toggleAllCourses(Boolean(checked))}
                    />
                    <span className="text-sm text-muted-foreground">{t('admin_courses.select_all_on_page')}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {t('admin_courses.pagination_summary', { start: startIdx, end: endIdx, total: totalCount })}
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
      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
      <Dialog
        open={moderationState.open}
        onOpenChange={(open) => {
          if (!moderationState.loading) {
            setModerationState(prev => ({ ...prev, open }))
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moderationState.title}</DialogTitle>
            <DialogDescription>{moderationState.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-moderation-reason">{t('admin_courses.moderation.reason')}</Label>
              <Textarea
                id="course-moderation-reason"
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
                placeholder={t('admin_courses.moderation.reason_placeholder')}
                rows={4}
              />
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                id="course-moderation-notify"
                checked={sendNotification}
                onCheckedChange={(checked) => setSendNotification(Boolean(checked))}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="course-moderation-notify">{t('admin_courses.moderation.send_notification')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin_courses.moderation.send_notification_hint')}
                </p>
              </div>
            </div>
            {sendNotification && (
              <div className="space-y-2">
                <Label htmlFor="course-moderation-message">{t('admin_courses.moderation.notification_message')}</Label>
                <Textarea
                  id="course-moderation-message"
                  value={notifyMessage}
                  onChange={(event) => setNotifyMessage(event.target.value)}
                  placeholder={t('admin_courses.moderation.notification_placeholder')}
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModerationState(prev => ({ ...prev, open: false }))}
              disabled={moderationState.loading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant={moderationState.nextStatus === 'rejected' ? 'destructive' : 'default'}
              onClick={handleModerationSubmit}
              disabled={moderationState.loading}
            >
              {moderationState.loading ? t('admin_courses.moderation.saving') : moderationState.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
