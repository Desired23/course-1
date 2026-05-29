import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckCircle2,
  PlayCircle,
  BookOpen,
  ShoppingCart,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from './ui/card'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useRouter } from './Router'
import { useOwnedCourses } from '../hooks/useOwnedCourses'
import { useCart } from '../contexts/CartContext'
import { buildLearningPathProgressSnapshot, type LearningPathStepStatus } from '../utils/learningPathProgress'
import type { LearningPathSummary } from '../services/learning-paths.api'

interface LearningPathTrackingCardProps {
  path: LearningPathSummary
  onOpenAdvisor?: (pathId: number) => void
}

function StepStatusIcon({ status }: { status: LearningPathStepStatus }) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
  if (status === 'in_progress') return <PlayCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
  if (status === 'owned') return <BookOpen className="h-5 w-5 text-purple-500 flex-shrink-0" />
  if (status === 'missing') return <ShoppingCart className="h-5 w-5 text-amber-500 flex-shrink-0" />
  return <MinusCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
}

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang học',
  completed: 'Hoàn thành',
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export function LearningPathTrackingCard({ path, onOpenAdvisor }: LearningPathTrackingCardProps) {
  const { navigate } = useRouter()
  const { isOwned, getProgress } = useOwnedCourses()
  const { isInCartByCourseId } = useCart()
  const [expanded, setExpanded] = useState(false)

  const snapshot = useMemo(
    () => buildLearningPathProgressSnapshot(path, { isOwned, getProgress, isInCartByCourseId }),
    [path, isOwned, getProgress, isInCartByCourseId]
  )

  const handleCourseAction = (courseId: number, owned: boolean) => {
    navigate(owned ? `/course-player/${courseId}` : `/course/${courseId}`)
  }

  const createdDate = new Date(path.created_at).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Card className="overflow-hidden border hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base leading-snug line-clamp-2">{path.goal_text}</p>
            <p className="text-xs text-muted-foreground mt-1">Tạo ngày {createdDate}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <Badge variant="secondary" className={`text-xs border-0 ${STATUS_BADGE_CLASS[snapshot.status]}`}>
              {STATUS_LABEL[snapshot.status]}
            </Badge>
            {path.estimated_weeks > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                ~{(path.estimated_weeks / 4).toFixed(1)} tháng
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tiến độ lộ trình</span>
            <span className="font-semibold text-foreground">{snapshot.completionPercent}%</span>
          </div>
          <Progress value={snapshot.completionPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-2">
            <p className="text-lg font-bold text-green-600">{snapshot.completedItems}</p>
            <p className="text-xs text-muted-foreground">Hoàn thành</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2">
            <p className="text-lg font-bold text-blue-600">{snapshot.inProgressItems + snapshot.ownedItems}</p>
            <p className="text-xs text-muted-foreground">Đang học</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2">
            <p className="text-lg font-bold text-amber-600">{snapshot.pendingItems}</p>
            <p className="text-xs text-muted-foreground">Cần mua</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {snapshot.nextActionItem && snapshot.status !== 'completed' && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
            <Target className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Tiếp theo</p>
              <p className="text-sm font-medium truncate">{snapshot.nextActionItem.course_title}</p>
            </div>
            <Button
              size="sm"
              className="flex-shrink-0 h-7 text-xs"
              onClick={() =>
                handleCourseAction(
                  snapshot.nextActionItem!.course_id,
                  isOwned(snapshot.nextActionItem!.course_id)
                )
              }
            >
              {isOwned(snapshot.nextActionItem.course_id) ? 'Học ngay' : 'Xem khóa học'}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <span>{path.items.length} khóa học trong lộ trình</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-1">
                {snapshot.stepSnapshots.map((step, index) => {
                  const isFree = !step.owned && parseFloat(step.item.course_price ?? '1') === 0
                  const rowClass =
                    step.status === 'completed'
                      ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900'
                      : step.status === 'in_progress'
                        ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900'
                        : step.item.is_skippable
                          ? 'bg-muted/30 border-border/50'
                          : 'bg-background border-border'

                  return (
                    <div
                      key={step.item.course_id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${rowClass}`}
                    >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
                        <StepStatusIcon status={step.status} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${step.item.is_skippable ? 'text-muted-foreground' : ''}`}>
                          {step.item.course_title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {step.item.course_level && (
                            <span className="text-xs text-muted-foreground capitalize">{step.item.course_level}</span>
                          )}
                          {step.item.duration_hours != null && (
                            <span className="text-xs text-muted-foreground">{step.item.duration_hours}h</span>
                          )}
                          {step.status === 'in_progress' && (
                            <span className="text-xs text-blue-600 font-medium">{Math.round(step.progress)}%</span>
                          )}
                          {isFree && (
                            <span className="text-xs text-emerald-600 font-medium">Miễn phí</span>
                          )}
                          {step.item.is_skippable && (
                            <span className="text-xs text-muted-foreground italic">Có thể bỏ qua</span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={step.owned ? 'default' : 'outline'}
                        className="flex-shrink-0 h-7 text-xs"
                        onClick={() => handleCourseAction(step.item.course_id, step.owned)}
                      >
                        {step.status === 'completed' && 'Ôn tập'}
                        {step.status === 'in_progress' && 'Tiếp tục'}
                        {step.status === 'owned' && 'Bắt đầu'}
                        {step.status === 'missing' && (isFree ? 'Đăng ký' : 'Xem')}
                        {step.status === 'skippable' && 'Xem'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onOpenAdvisor?.(path.id)}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Cập nhật lộ trình
          </Button>
          {snapshot.missingCostEstimate > 0 && (
            <span className="text-xs text-muted-foreground">
              Cần thêm:{' '}
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(snapshot.missingCostEstimate * 1000)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
