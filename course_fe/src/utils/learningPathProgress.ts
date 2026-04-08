import { parseDecimal } from '../services/course.api'
import type { LearningPathDetail, LearningPathItem, LearningPathSummary } from '../services/learning-paths.api'

export type LearningPathProgressStatus = 'not_started' | 'in_progress' | 'completed'

export type LearningPathStepStatus = 'completed' | 'in_progress' | 'owned' | 'missing' | 'skippable'

export interface LearningPathStepSnapshot {
  item: LearningPathItem
  status: LearningPathStepStatus
  progress: number
  owned: boolean
  inCart: boolean
  isCurrent: boolean
}

export interface LearningPathProgressSnapshot {
  status: LearningPathProgressStatus
  completionPercent: number
  completedItems: number
  inProgressItems: number
  ownedItems: number
  pendingItems: number
  skippableItems: number
  currentItem: LearningPathItem | null
  nextActionItem: LearningPathItem | null
  missingItems: LearningPathItem[]
  missingCostEstimate: number
  stepSnapshots: LearningPathStepSnapshot[]
}

function getLearningPathItemPrice(item: LearningPathItem) {
  const regularPrice = parseDecimal(item.course_price)
  const discountPrice = parseDecimal(item.course_discount_price)
  if (
    discountPrice > 0 &&
    item.course_discount_start_date &&
    item.course_discount_end_date
  ) {
    const now = new Date()
    const start = new Date(item.course_discount_start_date)
    const end = new Date(item.course_discount_end_date)
    if (now >= start && now <= end) return discountPrice
  }
  return regularPrice
}

export function buildLearningPathProgressSnapshot(
  path: Pick<LearningPathSummary, 'items'> | Pick<LearningPathDetail, 'items'>,
  options: {
    isOwned: (courseId: number) => boolean
    getProgress: (courseId: number) => number
    isInCartByCourseId: (courseId: number) => boolean
  }
): LearningPathProgressSnapshot {
  const { isOwned, getProgress, isInCartByCourseId } = options
  const nonSkippableItems = path.items.filter((item) => !item.is_skippable)
  const totalRequiredItems = nonSkippableItems.length

  let ownedItems = 0
  let completedItems = 0
  let inProgressItems = 0
  let pendingItems = 0

  const stepSnapshotsBase = path.items.map((item) => {
    const progress = Math.max(0, Math.min(100, getProgress(item.course_id)))
    const owned = isOwned(item.course_id)
    const inCart = isInCartByCourseId(item.course_id)

    let status: LearningPathStepStatus
    if (item.is_skippable) {
      status = 'skippable'
    } else if (progress >= 100) {
      status = 'completed'
    } else if (progress > 0) {
      status = 'in_progress'
    } else if (owned) {
      status = 'owned'
    } else {
      status = 'missing'
    }

    if (!item.is_skippable) {
      if (owned) ownedItems += 1
      if (status === 'completed') completedItems += 1
      else if (status === 'in_progress') inProgressItems += 1
      else pendingItems += 1
    }

    return {
      item,
      status,
      progress,
      owned,
      inCart,
      isCurrent: false,
    }
  })

  const currentStep = stepSnapshotsBase.find((step) => !step.item.is_skippable && step.status !== 'completed') || null
  const nextActionStep =
    stepSnapshotsBase.find((step) => !step.item.is_skippable && (step.status === 'in_progress' || step.status === 'owned')) ||
    currentStep ||
    stepSnapshotsBase.find((step) => !step.item.is_skippable) ||
    stepSnapshotsBase[0] ||
    null

  const stepSnapshots = stepSnapshotsBase.map((step) => ({
    ...step,
    isCurrent: currentStep?.item.course_id === step.item.course_id,
  }))

  const missingItems = stepSnapshots
    .filter((step) => !step.item.is_skippable && !step.owned && !step.inCart)
    .map((step) => step.item)

  let status: LearningPathProgressStatus = 'not_started'
  if (totalRequiredItems > 0 && completedItems === totalRequiredItems) {
    status = 'completed'
  } else if (
    stepSnapshots.some(
      (step) => !step.item.is_skippable && (step.status === 'in_progress' || step.status === 'owned' || step.status === 'completed')
    )
  ) {
    status = 'in_progress'
  }

  return {
    status,
    completionPercent: totalRequiredItems > 0 ? Math.round((completedItems / totalRequiredItems) * 100) : 100,
    completedItems,
    inProgressItems,
    ownedItems,
    pendingItems,
    skippableItems: path.items.filter((item) => item.is_skippable).length,
    currentItem: currentStep?.item || null,
    nextActionItem: nextActionStep?.item || null,
    missingItems,
    missingCostEstimate: missingItems.reduce((sum, item) => sum + getLearningPathItemPrice(item), 0),
    stepSnapshots,
  }
}
