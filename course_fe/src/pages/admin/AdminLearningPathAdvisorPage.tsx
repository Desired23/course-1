import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Archive, Bot, ChevronDown, ChevronUp, ExternalLink, Loader2, RotateCcw, Route, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useRouter } from '../../components/Router'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { AdminBulkActionBar } from '../../components/admin/AdminBulkActionBar'
import {
  adminActionLearningPath,
  adminBulkActionLearningPaths,
  getAdminLearningPathDetail,
  getLearningPathAdvisorStats,
  type LearningPathAdvisorStats,
  type LearningPathAdvisorStatsQuery,
  type LearningPathDetail,
} from '../../services/learning-paths.api'

type ProviderFilter = 'all' | 'gemini' | 'rule_based'

export function AdminLearningPathAdvisorPage() {
  const { navigate, currentRoute } = useRouter()
  const [stats, setStats] = useState<LearningPathAdvisorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [fallbackOnly, setFallbackOnly] = useState(false)
  const [limit, setLimit] = useState(10)
  const [expandedPathId, setExpandedPathId] = useState<number | null>(null)
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null)
  const [selectedPathDetail, setSelectedPathDetail] = useState<LearningPathDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedPathIds, setSelectedPathIds] = useState<number[]>([])
  const [isApplyingAction, setIsApplyingAction] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [updatedCourseId, setUpdatedCourseId] = useState<number | null>(null)
  const hasOpenedPathFromQueryRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const query: LearningPathAdvisorStatsQuery = {
      provider: providerFilter === 'all' ? undefined : providerFilter,
      fallback_only: fallbackOnly,
      limit,
    }

    getLearningPathAdvisorStats(query)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Khong the tai thong ke AI advisor.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [providerFilter, fallbackOnly, limit, reloadToken])

  useEffect(() => {
    if (loading || !stats || hasOpenedPathFromQueryRef.current) return

    const queryString = currentRoute.includes('?') ? currentRoute.split('?')[1] : ''
    const searchParams = new URLSearchParams(queryString)
    const pathId = Number(searchParams.get('pathId') || '')
    const courseId = Number(searchParams.get('updatedCourseId') || '')
    setUpdatedCourseId(!Number.isNaN(courseId) && courseId > 0 ? courseId : null)
    if (Number.isNaN(pathId) || pathId <= 0) return

    const matchedPath = stats.recent_paths.find((path) => path.id === pathId)
    if (matchedPath) {
      setExpandedPathId(pathId)
    }
    hasOpenedPathFromQueryRef.current = true
    void openPathDetail(pathId)
  }, [currentRoute, loading, stats])

  const openPathDetail = async (pathId: number) => {
    setSelectedPathId(pathId)
    setSelectedPathDetail(null)
    setDetailLoading(true)
    try {
      const detail = await getAdminLearningPathDetail(pathId)
      setSelectedPathDetail(detail)
    } finally {
      setDetailLoading(false)
    }
  }

  const togglePathSelection = (pathId: number, checked: boolean) => {
    setSelectedPathIds((prev) => {
      if (checked) {
        return prev.includes(pathId) ? prev : [...prev, pathId]
      }
      return prev.filter((id) => id !== pathId)
    })
  }

  const toggleAllVisibleSelections = (checked: boolean) => {
    const visibleIds = stats?.recent_paths.map((path) => path.id) || []
    if (checked) {
      setSelectedPathIds(Array.from(new Set(visibleIds)))
      return
    }
    setSelectedPathIds([])
  }

  const runDeleteAction = async (pathId: number) => {
    const confirmDelete = window.confirm(`Xoa learning path #${pathId}?`)
    if (!confirmDelete) return

    try {
      setIsApplyingAction(true)
      await adminActionLearningPath(pathId, 'delete')
      toast.success(`Da xoa learning path #${pathId}.`)
      setSelectedPathIds((prev) => prev.filter((id) => id !== pathId))
      if (selectedPathId === pathId) {
        setSelectedPathId(null)
        setSelectedPathDetail(null)
      }
      setReloadToken((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error?.message || 'Khong the xoa learning path.')
    } finally {
      setIsApplyingAction(false)
    }
  }

  const runArchiveToggleAction = async (pathId: number, shouldArchive: boolean) => {
    const action = shouldArchive ? 'archive' : 'restore'
    const confirmAction = window.confirm(
      shouldArchive
        ? `Archive learning path #${pathId}?`
        : `Restore learning path #${pathId}?`
    )
    if (!confirmAction) return

    try {
      setIsApplyingAction(true)
      await adminActionLearningPath(pathId, action)
      toast.success(shouldArchive ? `Da archive learning path #${pathId}.` : `Da restore learning path #${pathId}.`)
      setReloadToken((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error?.message || 'Khong the cap nhat trang thai learning path.')
    } finally {
      setIsApplyingAction(false)
    }
  }

  const runBulkDeleteAction = async () => {
    if (selectedPathIds.length === 0) return
    const confirmDelete = window.confirm(`Xoa ${selectedPathIds.length} learning path da chon?`)
    if (!confirmDelete) return

    try {
      setIsApplyingAction(true)
      await adminBulkActionLearningPaths('delete', selectedPathIds)
      toast.success(`Da xoa ${selectedPathIds.length} learning path.`)
      if (selectedPathId && selectedPathIds.includes(selectedPathId)) {
        setSelectedPathId(null)
        setSelectedPathDetail(null)
      }
      setSelectedPathIds([])
      setReloadToken((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error?.message || 'Khong the xoa hang loat learning path.')
    } finally {
      setIsApplyingAction(false)
    }
  }

  const runBulkArchiveToggleAction = async (shouldArchive: boolean) => {
    if (selectedPathIds.length === 0) return
    const action = shouldArchive ? 'archive' : 'restore'
    const confirmAction = window.confirm(
      shouldArchive
        ? `Archive ${selectedPathIds.length} learning path da chon?`
        : `Restore ${selectedPathIds.length} learning path da chon?`
    )
    if (!confirmAction) return

    try {
      setIsApplyingAction(true)
      await adminBulkActionLearningPaths(action, selectedPathIds)
      toast.success(shouldArchive ? `Da archive ${selectedPathIds.length} learning path.` : `Da restore ${selectedPathIds.length} learning path.`)
      setSelectedPathIds([])
      setReloadToken((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error?.message || 'Khong the cap nhat trang thai hang loat.')
    } finally {
      setIsApplyingAction(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-3xl font-semibold">AI Learning Path</h1>
        <p className="text-sm text-destructive">{error || 'Khong co du lieu.'}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/15">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Advisor quality
          </Badge>
          <h1 className="text-3xl font-semibold">AI Learning Path</h1>
          <p className="text-sm text-muted-foreground">
            Theo doi xem learning path dang duoc tao boi Gemini hay rule-based, va fallback dang xay ra bao nhieu.
          </p>
        </div>

        {updatedCourseId && (
          <Card className="border-emerald-200 bg-emerald-50/80">
            <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-medium text-emerald-900">Metadata da duoc cap nhat</div>
                <p className="text-sm text-emerald-900/80">
                  Course #{updatedCourseId} vua duoc chinh metadata. Tiep tuc review ly do, skip logic va muc do phu hop cua learning path.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setUpdatedCourseId(null)}>
                An thong bao
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Khoanh vung nhom learning path can review.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Provider</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value as ProviderFilter)}
              >
                <option value="all">Tat ca</option>
                <option value="gemini">Gemini</option>
                <option value="rule_based">Rule-based</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Recent paths</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3"
                value={String(limit)}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>

            <label className="flex items-end gap-3 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={fallbackOnly}
                onChange={(event) => setFallbackOnly(event.target.checked)}
              />
              <span>Chi hien fallback</span>
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProviderFilter('all')
                  setFallbackOnly(false)
                  setLimit(10)
                }}
              >
                Reset filter
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tong lo trinh</CardDescription>
              <CardTitle className="text-3xl">{stats.total_paths}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Tong so path trong bo loc hien tai.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gemini</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Bot className="h-6 w-6 text-blue-600" />
                {stats.gemini_paths}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Path duoc tra ve boi Gemini.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rule-based</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Route className="h-6 w-6 text-emerald-600" />
                {stats.rule_based_paths}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Path dang chay bang rule-based.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fallback</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                {stats.fallback_paths}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{stats.fallback_rate}% trong bo loc hien tai.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Attempt trung binh</CardDescription>
              <CardTitle className="text-3xl">{stats.average_attempt_count}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">So lan advisor can de tra payload hop le.</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent paths</CardTitle>
            <CardDescription>Review nhanh tung path, fallback reason, model va summary day du.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AdminBulkActionBar
              count={selectedPathIds.length}
              label="learning path da chon"
              onClear={() => setSelectedPathIds([])}
              actions={[
                {
                  key: 'archive',
                  label: 'Archive da chon',
                  disabled: isApplyingAction,
                  onClick: () => void runBulkArchiveToggleAction(true),
                },
                {
                  key: 'restore',
                  label: 'Restore da chon',
                  disabled: isApplyingAction,
                  onClick: () => void runBulkArchiveToggleAction(false),
                },
                {
                  key: 'delete',
                  label: 'Xoa da chon',
                  destructive: true,
                  disabled: isApplyingAction,
                  onClick: () => void runBulkDeleteAction(),
                },
              ]}
            />

            {stats.recent_paths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Khong co learning path nao trong bo loc hien tai.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    checked={stats.recent_paths.length > 0 && selectedPathIds.length === stats.recent_paths.length}
                    onCheckedChange={(checked) => toggleAllVisibleSelections(Boolean(checked))}
                  />
                  <span>Chon tat ca trong danh sach hien tai</span>
                </div>

                {stats.recent_paths.map((path) => {
                const expanded = expandedPathId === path.id
                return (
                  <div key={path.id} className="rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={selectedPathIds.includes(path.id)}
                        onCheckedChange={(checked) => togglePathSelection(path.id, Boolean(checked))}
                      />
                      <div className="w-full">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          Path #{path.id} · User {path.user_name} · {new Date(path.updated_at).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-lg font-semibold">{path.goal_text}</div>
                        <p className={expanded ? 'text-sm text-muted-foreground' : 'line-clamp-2 text-sm text-muted-foreground'}>
                          {path.summary}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {path.advisor_meta?.provider_used || 'unknown'}
                          {path.advisor_meta?.model ? ` · ${path.advisor_meta.model}` : ''}
                        </Badge>
                        {path.is_archived && (
                          <Badge className="bg-slate-500/15 text-slate-700 hover:bg-slate-500/15">archived</Badge>
                        )}
                        <Badge variant="outline">
                          attempt {path.advisor_meta?.attempt_count || 1}/{path.advisor_meta?.max_attempts || 1}
                        </Badge>
                        {path.advisor_meta?.fallback_triggered && (
                          <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                            fallback: {path.advisor_meta?.fallback_provider || 'rule_based'}
                          </Badge>
                        )}
                        <Badge variant="outline">{path.course_count} khoa</Badge>
                        <Badge variant="outline">{path.estimated_weeks} tuan</Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void runArchiveToggleAction(path.id, !path.is_archived)}
                        disabled={isApplyingAction}
                      >
                        {path.is_archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        {path.is_archived ? 'Restore' : 'Archive'}
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => void runDeleteAction(path.id)} disabled={isApplyingAction}>
                        <Trash2 className="h-4 w-4" />
                        Xoa
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void openPathDetail(path.id)}>
                        Mo chi tiet
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedPathId(expanded ? null : path.id)}
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {expanded ? 'Thu gon' : 'Xem nhanh'}
                      </Button>
                    </div>

                    {expanded && (
                      <div className="mt-4 space-y-3 rounded-xl bg-muted/30 p-4 text-sm">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Summary</div>
                          <div className="mt-1">{path.summary}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Provider meta</div>
                            <div className="mt-1 space-y-1 text-muted-foreground">
                              <div>Provider: {path.advisor_meta?.provider_used || 'unknown'}</div>
                              <div>Model: {path.advisor_meta?.model || 'n/a'}</div>
                              <div>Attempt: {path.advisor_meta?.attempt_count || 1}/{path.advisor_meta?.max_attempts || 1}</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Fallback</div>
                            <div className="mt-1 space-y-1 text-muted-foreground">
                              <div>Triggered: {path.advisor_meta?.fallback_triggered ? 'Yes' : 'No'}</div>
                              <div>Provider: {path.advisor_meta?.fallback_provider || 'n/a'}</div>
                              <div>Reason: {path.advisor_meta?.fallback_reason || 'n/a'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                )
              })}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedPathId != null} onOpenChange={(open) => {
        if (!open) {
          setSelectedPathId(null)
          setSelectedPathDetail(null)
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Learning path detail</DialogTitle>
            <DialogDescription>
              Review chi tiet conversation, roadmap va advisor metadata.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !selectedPathDetail ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-2xl font-semibold">{selectedPathDetail.goal_text}</div>
                <p className="text-sm text-muted-foreground">{selectedPathDetail.summary}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {selectedPathDetail.advisor_meta?.provider_used || 'unknown'}
                    {selectedPathDetail.advisor_meta?.model ? ` · ${selectedPathDetail.advisor_meta.model}` : ''}
                  </Badge>
                  <Badge variant="outline">
                    attempt {selectedPathDetail.advisor_meta?.attempt_count || 1}/{selectedPathDetail.advisor_meta?.max_attempts || 1}
                  </Badge>
                  <Badge variant="outline">{selectedPathDetail.estimated_weeks} tuan</Badge>
                  {selectedPathDetail.advisor_meta?.fallback_triggered && (
                    <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">
                      fallback: {selectedPathDetail.advisor_meta?.fallback_provider || 'rule_based'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Roadmap</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPathDetail.items.map((item) => (
                      <div
                        key={item.id || `${item.course_id}-${item.order}`}
                        className={
                          updatedCourseId === item.course_id
                            ? 'rounded-lg border border-emerald-300 bg-emerald-50/70 p-3'
                            : 'rounded-lg border p-3'
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium">
                            <span>{item.order}. {item.course_title || `Course #${item.course_id}`}</span>
                            {updatedCourseId === item.course_id && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600">metadata moi</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.is_skippable && (
                              <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">skip</Badge>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/courses/${item.course_id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Mo course
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate('/admin/catalog-metadata', undefined, {
                                  courseId: String(item.course_id),
                                  returnTo: '/admin/ai-learning-paths',
                                  pathId: String(selectedPathDetail.id),
                                })
                              }
                            >
                              Catalog AI
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{item.reason}</div>
                        {item.skippable_reason && (
                          <div className="mt-2 text-xs text-muted-foreground">Skip reason: {item.skippable_reason}</div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conversation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPathDetail.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Khong co conversation message nao.</p>
                    ) : (
                      selectedPathDetail.messages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className="rounded-lg border p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">{message.role}</div>
                          <div className="mt-1 text-sm">{message.content}</div>
                        </div>
                      ))
                    )}
                    <div className="rounded-lg border p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Fallback reason</div>
                      <div className="mt-1 text-sm">{selectedPathDetail.advisor_meta?.fallback_reason || 'n/a'}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AdminLearningPathAdvisorPage
