import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Search, Sparkles, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'

import { useRouter } from '../../components/Router'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { getAllCourses, type CourseListItem, updateCourse } from '../../services/course.api'

type DraftFields = {
  level: string
  target_audience: string
  skills_taught: string
  prerequisites: string
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
  if (!(course.skills_taught || []).length) missing.push('skills_taught')
  if (!Array.isArray(course.prerequisites)) missing.push('prerequisites')
  if (course.status !== 'published') missing.push('status')
  if (!course.is_public) missing.push('visibility')
  return missing
}

function buildDraft(course: CourseListItem): DraftFields {
  return {
    level: course.level || 'all_levels',
    target_audience: toMultiline(course.target_audience),
    skills_taught: toMultiline(course.skills_taught),
    prerequisites: toMultiline(course.prerequisites),
  }
}

export function AdminCourseMetadataPage() {
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
          toast.error('Khong the tai catalog metadata.')
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
        (course.skills_taught || []).join(' '),
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
        skills_taught: parseMultiline(draft.skills_taught),
        prerequisites: parseMultiline(draft.prerequisites),
      })

      setCourses((prev) => prev.map((course) => (course.id === courseId ? updated : course)))
      setDrafts((prev) => ({
        ...prev,
        [courseId]: buildDraft(updated),
      }))
      toast.success('Da cap nhat metadata khoa hoc.')
      if (options?.returnToAdvisor && returnToRoute) {
        navigateBackToAdvisorReview(courseId)
      }
    } catch (error) {
      console.error('Failed to save course metadata', error)
      toast.error('Khong the cap nhat metadata khoa hoc.')
    } finally {
      setSavingIds((prev) => prev.filter((id) => id !== courseId))
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-700">
            <Sparkles className="h-4 w-4" />
            Catalog health cho AI advisor
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Course Catalog Metadata</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Man hinh nay dung de ra soat khoa hoc nao du metadata cho AI tu van lo trinh, khoa hoc nao con thieu level,
            target audience, skills_taught hoac prerequisites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {returnToRoute && (
            <Button
              variant="outline"
              onClick={navigateBackToAdvisorReview}
            >
              Quay lai AI Paths
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/admin/courses')}>
            Mo trang quan ly khoa hoc
          </Button>
        </div>
      </div>

      {returnToRoute && (
        <Card className="border-blue-200 bg-blue-50/70">
          <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-blue-900">Dang review metadata tu AI Paths</div>
              <p className="text-sm text-blue-900/80">
                Sua metadata khoa hoc xong ban co the quay lai dashboard de tiep tuc review learning path va fallback.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-blue-300 bg-white text-blue-900 hover:bg-blue-100"
              onClick={navigateBackToAdvisorReview}
            >
              Quay lai dung path dang review
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tong khoa hoc</CardDescription>
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
            <CardDescription>Con thieu metadata</CardDescription>
            <CardTitle className="text-amber-600">{metrics.missing}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Published + public</CardDescription>
            <CardTitle>{metrics.published}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.4fr_220px_220px]">
          <div className="space-y-2">
            <Label htmlFor="catalog-search">Tim khoa hoc</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="catalog-search"
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ten khoa hoc, instructor, category..."
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
                <SelectItem value="missing">Chi khoa thieu metadata</SelectItem>
                <SelectItem value="ready">Chi khoa advisor-ready</SelectItem>
                <SelectItem value="all">Tat ca khoa hoc</SelectItem>
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

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-medium">Khong co khoa hoc nao khop bo loc.</p>
              <p className="text-sm text-muted-foreground">Thu doi filter hoac tim kiem theo ten khoa hoc.</p>
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

            return (
              <Card
                key={course.id}
                id={`catalog-course-${course.id}`}
                className={isFocused ? 'overflow-hidden border-blue-500 shadow-md shadow-blue-500/10' : 'overflow-hidden'}
              >
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
                            Dang thieu metadata
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
                          <span className="text-sm text-emerald-700">Du dieu kien dua vao AI advisor.</span>
                        ) : (
                          missingFields.map((field) => (
                            <Badge key={field} variant="outline" className="border-amber-300 text-amber-700">
                              Missing: {field}
                            </Badge>
                          ))
                        )}
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
                          Quay lai AI Paths
                        </Button>
                      )}
                      {returnToRoute && isFocused && (
                        <Button
                          size="sm"
                          onClick={() => void saveCourseMetadata(course.id, { returnToAdvisor: true })}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                          Luu va quay lai AI Paths
                        </Button>
                      )}
                      <Button size="sm" onClick={() => void saveCourseMetadata(course.id)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                        Luu metadata
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
                      placeholder="Moi dong la 1 doi tuong hoc"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Skills taught</Label>
                    <Textarea
                      value={draft.skills_taught}
                      onChange={(event) => updateDraft(course.id, 'skills_taught', event.target.value)}
                      rows={5}
                      placeholder="Moi dong la 1 skill se day trong khoa hoc"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prerequisites</Label>
                    <Textarea
                      value={draft.prerequisites}
                      onChange={(event) => updateDraft(course.id, 'prerequisites', event.target.value)}
                      rows={5}
                      placeholder="Moi dong la 1 kien thuc dau vao"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
