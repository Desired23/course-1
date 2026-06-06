import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
  WandSparkles,
  ListChecks,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { useRouter } from '../../components/Router'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import {
  getAllCourses,
  type CourseListItem,
  updateCourse,
  bulkUpdateAIMetadata,
  type AIMetadataFields,
} from '../../services/course.api'

type DraftFields = {
  level: string
  target_audience: string
  learning_objectives: string
}

function toMultiline(values?: string[] | null) {
  return (values || []).join('\n')
}

function parseMultiline(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getMissingFields(course: CourseListItem) {
  const missing: string[] = []
  if (!course.level) missing.push('level')
  if (!course.duration && !course.duration_hours) missing.push('duration')
  if (!(course.target_audience || []).length) missing.push('target_audience')
  if (course.status !== 'published') missing.push('status')
  if (!course.is_public) missing.push('visibility')
  return missing
}

function buildDraft(course: CourseListItem): DraftFields {
  return {
    level: course.level || 'all_levels',
    target_audience: toMultiline(course.target_audience),
    learning_objectives: toMultiline(course.learning_objectives),
  }
}

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

// ── Bulk Edit Dialog ─────────────────────────────────────────────────────────

type BulkField = keyof Omit<AIMetadataFields, 'level'>

interface BulkEditState {
  field: BulkField | ''
  value: string
  mode: 'replace' | 'append'
}

const BULK_FIELD_LABELS: Record<BulkField, string> = {
  target_audience: 'Target audience',
  learning_objectives: 'Learning objectives',
  tags: 'Tags',
}

function BulkEditPanel({
  selectedIds,
  onApply,
  onCancel,
  applying,
}: {
  selectedIds: number[]
  onApply: (field: BulkField, values: string[], mode: 'replace' | 'append') => void
  onCancel: () => void
  applying: boolean
}) {
  const [state, setState] = useState<BulkEditState>({ field: '', value: '', mode: 'replace' })

  const handleApply = () => {
    if (!state.field) return
    const values = parseMultiline(state.value)
    if (!values.length) return
    onApply(state.field as BulkField, values, state.mode)
  }

  return (
    <Card className="border-blue-200 bg-blue-50/70">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
            <ListChecks className="h-4 w-4" />
            Bulk update cho {selectedIds.length} khóa học đã chọn
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label>Trường cần cập nhật</Label>
            <Select
              value={state.field}
              onValueChange={(value) => setState((prev) => ({ ...prev, field: value as BulkField }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn trường..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(BULK_FIELD_LABELS) as [BulkField, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chế độ</Label>
            <Select
              value={state.mode}
              onValueChange={(value) => setState((prev) => ({ ...prev, mode: value as 'replace' | 'append' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replace">Thay thế hoàn toàn</SelectItem>
                <SelectItem value="append">Thêm vào cuối</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleApply}
              disabled={applying || !state.field || !state.value.trim()}
              className="w-full md:w-auto"
            >
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              Áp dụng
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Giá trị (mỗi dòng một mục)</Label>
          <Textarea
            value={state.value}
            onChange={(e) => setState((prev) => ({ ...prev, value: e.target.value }))}
            rows={4}
            placeholder="Nhập mỗi giá trị trên một dòng..."
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function AdminCourseMetadataPage() {
  const { t } = useTranslation()
  const { navigate, currentRoute } = useRouter()

  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing' | 'ready'>('missing')
  const [drafts, setDrafts] = useState<Record<number, DraftFields>>({})
  const [savingIds, setSavingIds] = useState<number[]>([])
  const [focusedCourseId, setFocusedCourseId] = useState<number | null>(null)
  const [returnToRoute, setReturnToRoute] = useState<string | null>(null)
  const [returnPathId, setReturnPathId] = useState<number | null>(null)
  const hasScrolledToFocusedCourseRef = useRef(false)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [applyingBulk, setApplyingBulk] = useState(false)

  useEffect(() => {
    const queryString = currentRoute.includes('?') ? currentRoute.split('?')[1] : ''
    const searchParams = new URLSearchParams(queryString)
    const courseId = Number(searchParams.get('courseId') || '')
    const returnTo = searchParams.get('returnTo')
    const pathId = Number(searchParams.get('pathId') || '')

    setReturnToRoute(returnTo || null)
    setReturnPathId(!Number.isNaN(pathId) && pathId > 0 ? pathId : null)

    if (!Number.isNaN(courseId) && courseId > 0) {
      setFocusedCourseId(courseId)
      setStatusFilter('all')
      hasScrolledToFocusedCourseRef.current = false
    }
  }, [currentRoute])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const results = await getAllCourses()
        if (cancelled) return
        setCourses(results)
        setDrafts(
          results.reduce<Record<number, DraftFields>>((acc, course) => {
            acc[course.id] = buildDraft(course)
            return acc
          }, {})
        )
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load metadata courses', error)
          toast.error(t('admin_course_metadata.load_failed'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const metrics = useMemo(() => {
    const total = courses.length
    const ready = courses.filter((course) => getMissingFields(course).length === 0).length
    const missing = total - ready
    const published = courses.filter((course) => course.status === 'published' && course.is_public).length
    return { total, ready, missing, published }
  }, [courses])

  const filteredCourses = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return courses.filter((course) => {
      if (focusedCourseId && course.id === focusedCourseId) return true
      const missingFields = getMissingFields(course)
      if (statusFilter === 'missing' && missingFields.length === 0) return false
      if (statusFilter === 'ready' && missingFields.length > 0) return false
      if (!keyword) return true
      return [
        course.title,
        course.instructor_name || '',
        course.category_name || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
  }, [courses, focusedCourseId, search, statusFilter])

  useEffect(() => {
    if (!focusedCourseId || loading || hasScrolledToFocusedCourseRef.current) return

    const element = document.getElementById(`catalog-course-${focusedCourseId}`)
    if (!element) return

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    hasScrolledToFocusedCourseRef.current = true
  }, [filteredCourses, focusedCourseId, loading])

  const updateDraft = (courseId: number, key: keyof DraftFields, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        [key]: value,
      },
    }))
  }

  const navigateBackToAdvisorReview = (courseId?: number) => {
    if (!returnToRoute) return
    navigate(returnToRoute, undefined, {
      ...(returnPathId ? { pathId: String(returnPathId) } : {}),
      ...(courseId ? { updatedCourseId: String(courseId) } : {}),
    })
  }

  const saveCourseMetadata = async (courseId: number, options?: { returnToAdvisor?: boolean }) => {
    const draft = drafts[courseId]
    if (!draft) return

    try {
      setSavingIds((prev) => [...prev, courseId])
      const updated = await updateCourse(courseId, {
        level: draft.level as CourseListItem['level'],
        target_audience: parseMultiline(draft.target_audience),
        learning_objectives: parseMultiline(draft.learning_objectives),
      })

      setCourses((prev) => prev.map((course) => (course.id === courseId ? updated : course)))
      setDrafts((prev) => ({
        ...prev,
        [courseId]: buildDraft(updated),
      }))
      toast.success(t('admin_course_metadata.update_success'))
      if (options?.returnToAdvisor && returnToRoute) {
        navigateBackToAdvisorReview(courseId)
      }
    } catch (error) {
      console.error('Failed to save course metadata', error)
      toast.error(t('admin_course_metadata.update_failed'))
    } finally {
      setSavingIds((prev) => prev.filter((id) => id !== courseId))
    }
  }

  // ── Bulk selection helpers ─────────────────────────────────────────────────
  const toggleSelect = (courseId: number) => {
    setSelectedIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    )
  }

  const toggleSelectAll = () => {
    const visibleIds = filteredCourses.map((c) => c.id)
    const allSelected = visibleIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : visibleIds)
  }

  const handleBulkApply = async (field: BulkField, values: string[], mode: 'replace' | 'append') => {
    try {
      setApplyingBulk(true)

      let finalValues = values
      if (mode === 'append') {
        // For append mode, we need to get existing values and merge
        // We'll do this per-course using the local draft state
        const updates = selectedIds.map(async (courseId) => {
          const course = courses.find((c) => c.id === courseId)
          if (!course) return
          const existing: string[] = (course[field as keyof CourseListItem] as string[] | undefined) || []
          const merged = Array.from(new Set([...existing, ...values]))
          return updateCourse(courseId, { [field]: merged })
        })
        const results = await Promise.allSettled(updates)
        const updated = results
          .map((r, i) => ({ result: r, courseId: selectedIds[i] }))
          .filter((r) => r.result.status === 'fulfilled' && r.result.value)
          .map((r) => (r.result as PromiseFulfilledResult<CourseListItem>).value)

        setCourses((prev) =>
          prev.map((c) => {
            const upd = updated.find((u) => u.id === c.id)
            return upd ?? c
          })
        )
        setDrafts((prev) => {
          const next = { ...prev }
          updated.forEach((u) => {
            next[u.id] = buildDraft(u)
          })
          return next
        })

        const failCount = results.filter((r) => r.status === 'rejected').length
        toast.success(
          failCount > 0
            ? t('admin_course_metadata.bulk_update_with_errors', { count: updated.length, errors: failCount })
            : t('admin_course_metadata.bulk_update_success', { count: updated.length })
        )
      } else {
        // Replace mode — use bulk API
        const fields: AIMetadataFields = { [field]: finalValues }
        const result = await bulkUpdateAIMetadata(selectedIds, fields)

        // Refresh courses that were updated
        if (result.updated_ids.length > 0) {
          const refreshed = await getAllCourses()
          setCourses(refreshed)
          setDrafts(
            refreshed.reduce<Record<number, DraftFields>>((acc, course) => {
              acc[course.id] = buildDraft(course)
              return acc
            }, {})
          )
        }

        const errCount = result.errors.length + result.not_found_ids.length
        toast.success(
          errCount > 0
            ? t('admin_course_metadata.bulk_update_with_errors', { count: result.updated_count, errors: errCount })
            : t('admin_course_metadata.bulk_update_success', { count: result.updated_count })
        )
      }

      setSelectedIds([])
      setShowBulkPanel(false)
    } catch (error) {
      console.error('Bulk update failed', error)
      toast.error(t('admin_course_metadata.bulk_update_failed'))
    } finally {
      setApplyingBulk(false)
    }
  }

  return (
    <motion.div
      className="space-y-6 p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" variants={fadeInUp}>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-700">
            <Sparkles className="h-4 w-4" />
            Catalog health cho AI advisor
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Course Catalog Metadata</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Màn hình này dùng để rà soát khóa học nào đủ metadata cho AI tư vấn lộ trình, khóa học nào còn thiếu level
            hoặc target audience.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {returnToRoute && (
            <Button
              variant="outline"
              onClick={navigateBackToAdvisorReview}
            >
              Quay lại AI Paths
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/admin/courses')}>
            Mở trang quản lý khóa học
          </Button>
        </div>
      </motion.div>

      {returnToRoute && (
        <motion.div variants={fadeInUp}>
        <Card className="border-blue-200 bg-blue-50/70">
          <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-blue-900">Đang review metadata từ AI Paths</div>
              <p className="text-sm text-blue-900/80">
                Sửa metadata khóa học xong bạn có thể quay lại dashboard để tiếp tục review learning path và fallback.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-blue-300 bg-white text-blue-900 hover:bg-blue-100"
              onClick={navigateBackToAdvisorReview}
            >
              Quay lại đúng path đang review
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      )}

      <motion.div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" variants={fadeInUp}>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng khóa học</CardDescription>
            <CardTitle>{metrics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Advisor-ready</CardDescription>
            <CardTitle className="text-emerald-600">{metrics.ready}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Còn thiếu metadata</CardDescription>
            <CardTitle className="text-amber-600">{metrics.missing}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Published + public</CardDescription>
            <CardTitle>{metrics.published}</CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <Card>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.4fr_220px_220px]">
          <div className="space-y-2">
            <Label htmlFor="catalog-search">Tìm khóa học</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="catalog-search"
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tên khóa học, instructor, category..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Filter</Label>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'missing' | 'ready') => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="missing">Chỉ khóa thiếu metadata</SelectItem>
                <SelectItem value="ready">Chỉ khóa advisor-ready</SelectItem>
                <SelectItem value="all">Tất cả khóa học</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Catalog health</Label>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              {metrics.total > 0 ? `${Math.round((metrics.ready / metrics.total) * 100)}% ready` : '0% ready'}
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Bulk action toolbar */}
      {!loading && filteredCourses.length > 0 && (
        <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={filteredCourses.length > 0 && filteredCourses.every((c) => selectedIds.includes(c.id))}
              onCheckedChange={toggleSelectAll}
            />
            <Label htmlFor="select-all" className="cursor-pointer text-sm">
              Chọn tất cả ({filteredCourses.length})
            </Label>
          </div>
          {selectedIds.length > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.length} đã chọn</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBulkPanel((v) => !v)}
              >
                <ListChecks className="mr-1.5 h-4 w-4" />
                Bulk update metadata
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setSelectedIds([]); setShowBulkPanel(false) }}
              >
                Bỏ chọn
              </Button>
            </>
          )}
        </motion.div>
      )}

      {showBulkPanel && selectedIds.length > 0 && (
        <motion.div variants={fadeInUp}>
          <BulkEditPanel
            selectedIds={selectedIds}
            onApply={handleBulkApply}
            onCancel={() => setShowBulkPanel(false)}
            applying={applyingBulk}
          />
        </motion.div>
      )}

      <motion.div variants={fadeInUp}>
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-medium">Không có khóa học nào khớp bộ lọc.</p>
              <p className="text-sm text-muted-foreground">Thử đổi filter hoặc tìm kiếm theo tên khóa học.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const draft = drafts[course.id] || buildDraft(course)
            const missingFields = getMissingFields(course)
            const isSaving = savingIds.includes(course.id)
            const isFocused = focusedCourseId === course.id
            const isSelected = selectedIds.includes(course.id)

            return (
              <Card
                key={course.id}
                id={`catalog-course-${course.id}`}
                className={
                  isFocused
                    ? 'overflow-hidden border-blue-500 shadow-md shadow-blue-500/10'
                    : isSelected
                    ? 'overflow-hidden border-primary/50 shadow-sm'
                    : 'overflow-hidden'
                }
              >
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(course.id)}
                        className="mt-1"
                      />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-xl">{course.title}</CardTitle>
                          {missingFields.length === 0 ? (
                            <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Advisor-ready
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              Đang thiếu metadata
                            </Badge>
                          )}
                          <Badge variant="outline">{course.status}</Badge>
                          <Badge variant="outline">{course.is_public ? 'public' : 'private'}</Badge>
                        </div>
                        <CardDescription>
                          {course.instructor_name || 'Unknown instructor'} • {course.category_name || 'Uncategorized'} •{' '}
                          {course.duration_hours ? `${course.duration_hours}h` : 'No duration'}
                        </CardDescription>
                        <div className="flex flex-wrap gap-2">
                          {missingFields.length === 0 ? (
                            <span className="text-sm text-emerald-700">Đủ điều kiện đưa vào AI advisor.</span>
                          ) : (
                            missingFields.map((field) => (
                              <Badge key={field} variant="outline" className="border-amber-300 text-amber-700">
                                Missing: {field}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                        Review course
                      </Button>
                      {returnToRoute && isFocused && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={navigateBackToAdvisorReview}
                        >
                          Quay lại AI Paths
                        </Button>
                      )}
                      {returnToRoute && isFocused && (
                        <Button
                          size="sm"
                          onClick={() => void saveCourseMetadata(course.id, { returnToAdvisor: true })}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                          Lưu và quay lại AI Paths
                        </Button>
                      )}
                      <Button size="sm" onClick={() => void saveCourseMetadata(course.id)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                        Lưu metadata
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select value={draft.level || 'all_levels'} onValueChange={(value) => updateDraft(course.id, 'level', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_levels">All levels</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Target audience</Label>
                    <Textarea
                      value={draft.target_audience}
                      onChange={(event) => updateDraft(course.id, 'target_audience', event.target.value)}
                      rows={4}
                      placeholder="Mỗi dòng là 1 đối tượng học"
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label>Learning objectives</Label>
                    <Textarea
                      value={draft.learning_objectives}
                      onChange={(event) => updateDraft(course.id, 'learning_objectives', event.target.value)}
                      rows={4}
                      placeholder="Mỗi dòng là 1 mục tiêu học tập sau khi hoàn thành khóa học"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      </motion.div>
      </motion.div>
    </motion.div>
  )
}
