import { useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { toast } from 'sonner'
import {
  ArrowRight,
  Bot,
  ListChecks,
  Play,
  Save,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useRouter } from './Router'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useOwnedCourses } from '../hooks/useOwnedCourses'
import { useModal } from '../stores/modal.store'
import { formatPrice } from '../services/course.api'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import {
  chatWithLearningAdvisor,
  chatWithLearningAdvisorStream,
  createLearningPath,
  deleteLearningPath,
  getLearningPathDetail,
  getLearningPaths,
  recalculateLearningPath,
  type AdvisorMeta,
  type AdvisorMessage,
  type AdvisorChatResponse,
  type LearningPathDetail,
  type LearningPathItem,
  type LearningPathSummary,
} from '../services/learning-paths.api'
import { buildLearningPathProgressSnapshot } from '../utils/learningPathProgress'

type MessageBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

interface AiLearningPathDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPathId?: number | null
  onSaved?: (path: LearningPathDetail) => void
}

interface AdvisorState {
  path: LearningPathItem[]
  estimated_weeks: number
  summary: string
  advisor_meta?: AdvisorMeta
}

const introAssistantMessage = 'Xin chào! Bạn chỉ cần mô tả nhu cầu, tôi sẽ tự động tư vấn phù hợp: tìm khóa học, thiết kế lộ trình, hoặc kết hợp cả hai.'
const introQuestionMessage = 'Bạn muốn học gì hoặc đang hướng tới mục tiêu nào?'
const FALLBACK_QUICK_ACTIONS = [
  'Cho tôi lộ trình tối thiểu.',
  'Gợi ý cho tôi các khóa học phù hợp với mục tiêu này.',
]


function parseMarkdownTable(tableStr: string): { headers: string[]; rows: string[][] } | null {
  const lines = tableStr.trim().split('\n')
  if (lines.length < 3) return null


  const headerLine = lines[0].trim()
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h)


  const separatorLine = lines[1].trim()
  const isSeparator = /^\|?[\s\-|:]+\|?$/.test(separatorLine)
  if (!isSeparator || headers.length === 0) return null


  const rows: string[][] = []
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c)
    if (cells.length === headers.length) {
      rows.push(cells)
    }
  }

  return { headers, rows }
}

function parseMessageBlocks(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {

    let tableEndIdx = i
    let foundTable = false


    if (lines[i].trim().startsWith('|')) {

      tableEndIdx = i + 1
      if (tableEndIdx < lines.length && /^\|?[\s\-|:]+\|?$/.test(lines[tableEndIdx].trim())) {

        tableEndIdx = i + 2
        while (tableEndIdx < lines.length && lines[tableEndIdx].trim().startsWith('|')) {
          tableEndIdx++
        }
        foundTable = true
      }
    }

    if (foundTable && tableEndIdx > i + 2) {
      const tableStr = lines.slice(i, tableEndIdx).join('\n')
      const parsed = parseMarkdownTable(tableStr)
      if (parsed) {
        blocks.push({ type: 'table', headers: parsed.headers, rows: parsed.rows })
        i = tableEndIdx
      } else {

        const paragraphLines: string[] = []
        while (i < lines.length && !lines[i].trim().startsWith('|')) {
          paragraphLines.push(lines[i])
          i++
        }
        if (paragraphLines.length > 0) {
          blocks.push({ type: 'paragraph', content: paragraphLines.join('\n') })
        }
      }
    } else {

      const paragraphLines: string[] = []
      while (i < lines.length && !lines[i].trim().startsWith('|')) {
        paragraphLines.push(lines[i])
        i++
      }
      if (paragraphLines.length > 0) {
        blocks.push({ type: 'paragraph', content: paragraphLines.join('\n') })
      }
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', content }]
}

function buildPathAssistantSummary(
  summary: string,
  pathItems: LearningPathItem[],
  tr: (key: string, fallback: string, options?: Record<string, unknown>) => string,
) {
  const courseLinks = (pathItems || [])
    .slice(0, 6)
    .map((item, idx) => {
      const safeTitle = (item.course_title || `Khoa hoc #${item.course_id}`).replace(/\]/g, ')')
      return `${idx + 1}. [Mo khoa hoc: ${safeTitle}](/course/${item.course_id})`
    })
    .join('\n')

  if ((summary || '').trim()) {
    return `${tr('ai_learning_path.message_path_generated', 'Mình đã phân tích yêu cầu và gợi ý nội dung phù hợp dựa trên hội thoại hiện tại.')}\n\n${summary}\n\n${tr('ai_learning_path.message_course_links', 'Link khóa học đề xuất:')}\n${courseLinks}`
  }

  return `${tr('ai_learning_path.message_path_generated', 'Mình đã phân tích yêu cầu và gợi ý nội dung phù hợp dựa trên hội thoại hiện tại.')}\n\n${tr('ai_learning_path.message_course_links', 'Link khóa học đề xuất:')}\n${courseLinks}`
}

function isPathResponse(value: AdvisorChatResponse | LearningPathDetail): value is Extract<AdvisorChatResponse, { type: 'path' }> {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'path'
}

function isQuestionResponse(value: AdvisorChatResponse | LearningPathDetail): value is Extract<AdvisorChatResponse, { type: 'question' }> {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'question'
}

export function AiLearningPathDialog({
  open,
  onOpenChange,
  initialPathId,
  onSaved,
}: AiLearningPathDialogProps) {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { isAuthenticated, user } = useAuth()
  const { addToCartFromApi, isInCartByCourseId, loadCart } = useCart()
  const { isOwned, getProgress, loading: ownedLoading } = useOwnedCourses()
  const { open: openLogin } = useModal('login')

  const [goalText, setGoalText] = useState('')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<AdvisorMessage[]>([])
  const [advisorState, setAdvisorState] = useState<AdvisorState | null>(null)
  const [savedPathId, setSavedPathId] = useState<number | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSavedPath, setIsLoadingSavedPath] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isAddingMissingToCart, setIsAddingMissingToCart] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [quickReplyActions, setQuickReplyActions] = useState<string[]>([])
  const [historyPaths, setHistoryPaths] = useState<LearningPathSummary[]>([])
  const [activeHistoryPathId, setActiveHistoryPathId] = useState<number | null>(null)
  const [historyQuery, setHistoryQuery] = useState('')
  const [deletingPathId, setDeletingPathId] = useState<number | null>(null)
  const [streamingAssistantText, setStreamingAssistantText] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)
  const [pendingDeletePath, setPendingDeletePath] = useState<LearningPathSummary | null>(null)
  const [isDesktopDialogLayout, setIsDesktopDialogLayout] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const historyListRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)
  const openedAtRef = useRef(0)
  const advisorRequestInFlightRef = useRef(false)

  const tr = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, options as any)
    return typeof value === 'string' && value !== key ? value : fallback
  }

  const applyPathDetail = (detail: LearningPathDetail) => {
    setGoalText(detail.goal_text)
    setMessages(detail.messages || [])
    setAdvisorState({
      path: detail.items,
      estimated_weeks: detail.estimated_weeks,
      summary: detail.summary,
      advisor_meta: detail.advisor_meta,
    })
    setQuickReplyActions((detail.advisor_meta?.suggested_actions || []).slice(0, 2))
    setSavedPathId(detail.id)
    setActiveHistoryPathId(detail.id)
  }

  const loadPathDetail = async (pathId: number) => {
    setIsLoadingSavedPath(true)
    try {
      const detail = await getLearningPathDetail(pathId)
      applyPathDetail(detail)
    } catch (error: any) {
      toast.error(error?.message || tr('ai_learning_path.toast_load_path_failed', 'Không thể tải lộ trình đã lưu.'))
    } finally {
      setIsLoadingSavedPath(false)
    }
  }

  useEffect(() => {
    if (!open || !isAuthenticated) {
      setHistoryPaths([])
      setHistoryPage(1)
      setHistoryTotalPages(1)
      return
    }

    let cancelled = false
    setIsLoadingHistory(true)
    getLearningPaths(1, 10)
      .then((response) => {
        if (cancelled) return
        setHistoryPaths(response.results || [])
        setHistoryPage(response.page || 1)
        setHistoryTotalPages(response.total_pages || 1)
      })
      .catch(() => {
        if (!cancelled) setHistoryPaths([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, isAuthenticated])

  const handleLoadMoreHistory = async () => {
    if (!hasMoreHistory || isLoadingMoreHistory || !isAuthenticated) return
    const listNode = historyListRef.current
    const prevScrollTop = listNode?.scrollTop ?? 0
    try {
      setIsLoadingMoreHistory(true)
      const nextPage = historyPage + 1
      const response = await getLearningPaths(nextPage, 10)
      const incoming = response.results || []
      setHistoryPaths((prev) => {
        const seen = new Set(prev.map((item) => item.id))
        const appendable = incoming.filter((item) => !seen.has(item.id))
        return [...prev, ...appendable]
      })
      setHistoryPage(response.page || nextPage)
      setHistoryTotalPages(response.total_pages || historyTotalPages)
      window.requestAnimationFrame(() => {
        if (!historyListRef.current) return
        historyListRef.current.scrollTop = prevScrollTop
      })
    } finally {
      setIsLoadingMoreHistory(false)
    }
  }

  const handleHistoryScroll = () => {
    const node = historyListRef.current
    if (!node || isLoadingMoreHistory || isLoadingHistory || !hasMoreHistory) return
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    if (distanceToBottom <= 36) {
      void handleLoadMoreHistory()
    }
  }

  useEffect(() => {
    if (!open) return
    if (!initialPathId) {
      setSavedPathId(null)
      return
    }

    void loadPathDetail(initialPathId)
  }, [open, initialPathId])

  const monthsLabel = (weeks: number) => tr('ai_learning_path.months_label', `~${(weeks / 4).toFixed(1)} tháng`, { count: (weeks / 4).toFixed(1) })

  const progressSnapshot = useMemo(
    () =>
      advisorState
        ? buildLearningPathProgressSnapshot(
            { items: advisorState.path },
            { isOwned, getProgress, isInCartByCourseId }
          )
        : null,
    [advisorState, getProgress, isInCartByCourseId, isOwned]
  )

  const missingPathItems = progressSnapshot?.missingItems ?? []
  const missingCostEstimate = progressSnapshot?.missingCostEstimate ?? 0
  const filteredHistoryPaths = useMemo(() => {
    const keyword = historyQuery.trim().toLowerCase()
    if (!keyword) return historyPaths
    return historyPaths.filter((path) => {
      const haystack = `${path.goal_text} ${path.summary}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [historyPaths, historyQuery])
  const hasMoreHistory = historyPage < historyTotalPages

  const resetDraftState = () => {
    setGoalText('')
    setDraft('')
    setMessages([])
    setAdvisorState(null)
    setSavedPathId(null)
    setIsThinking(false)
    setIsSaving(false)
    setIsLoadingSavedPath(false)
    setIsAddingMissingToCart(false)
    setShowQuickReplies(true)
    setQuickReplyActions([])
    setStreamingAssistantText('')
    shouldAutoScrollRef.current = true
  }

  const isNearBottom = (node: HTMLDivElement) => {
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    return distance <= 80
  }

  const scrollChatToBottom = () => {
    if (!chatContainerRef.current) return
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return
    shouldAutoScrollRef.current = isNearBottom(chatContainerRef.current)
  }

  useEffect(() => {
    if (open) {
      openedAtRef.current = Date.now()
    }
  }, [open])

  useEffect(() => {
    const updateLayout = () => {
      setIsDesktopDialogLayout(window.innerWidth >= 960)
    }
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => {
      window.removeEventListener('resize', updateLayout)
    }
  }, [])

  useEffect(() => {
    if (!open || !chatContainerRef.current) return
    if (shouldAutoScrollRef.current) {
      scrollChatToBottom()
    }
  }, [open, messages, advisorState, isThinking, streamingAssistantText])

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen && !initialPathId) {
      resetDraftState()
    }
    if (!nextOpen) {
      setPendingDeletePath(null)
    }
    onOpenChange(nextOpen)
  }

  const normalizeAdvisorResult = (result: AdvisorChatResponse | LearningPathDetail, nextMessages: AdvisorMessage[]) => {
    if (isQuestionResponse(result)) {
      if (typeof result.path_id === 'number') {
        setSavedPathId(result.path_id)
      }
      setMessages([...nextMessages, { role: 'assistant', content: result.message }])
      const suggested = (result.advisor_meta?.suggested_actions || []).slice(0, 2)
      setQuickReplyActions(suggested)
      setShowQuickReplies(suggested.length > 0)
      return
    }

    if (isPathResponse(result)) {
      if (typeof result.path_id === 'number') {
        setSavedPathId(result.path_id)
      }
      const assistantSummary = buildPathAssistantSummary(result.summary, result.path, tr)
      setAdvisorState({
        path: result.path,
        estimated_weeks: result.estimated_weeks,
        summary: result.summary,
        advisor_meta: result.advisor_meta,
      })
      setMessages([...nextMessages, { role: 'assistant', content: assistantSummary }])
      const suggested = (result.advisor_meta?.suggested_actions || []).slice(0, 2)
      setQuickReplyActions(suggested)
      setShowQuickReplies(suggested.length > 0)
      return
    }

    setSavedPathId(result.id)
    setGoalText(result.goal_text)
    const detailMessages = (result.messages || []).slice()
    const lastMessage = detailMessages[detailMessages.length - 1]
    if ((result.items || []).length > 0 && (!lastMessage || lastMessage.role !== 'assistant')) {
      detailMessages.push({
        role: 'assistant',
        content: buildPathAssistantSummary(result.summary, result.items, tr),
      })
    }
    setMessages(detailMessages)
    setAdvisorState({
      path: result.items,
      estimated_weeks: result.estimated_weeks,
      summary: result.summary,
      advisor_meta: result.advisor_meta,
    })
    const suggested = (result.advisor_meta?.suggested_actions || []).slice(0, 2)
    setQuickReplyActions(suggested)
    setShowQuickReplies(suggested.length > 0)
    onSaved?.(result)
  }

  const callAdvisor = async (nextMessages: AdvisorMessage[], goalOverride?: string) => {
    if (advisorRequestInFlightRef.current) return
    const resolvedGoal = (goalOverride ?? goalText).trim()
    if (!resolvedGoal) {
      toast.error(tr('ai_learning_path.toast_goal_required', 'Bạn cần nhập mục tiêu học tập trước.'))
      return
    }

    try {
      advisorRequestInFlightRef.current = true
      setIsThinking(true)
      const response =
        savedPathId && advisorState
          ? await recalculateLearningPath(savedPathId, {
              goal_text: resolvedGoal,
              messages: nextMessages,
              path_id: savedPathId,
              persist_conversation: true,
            })
          : await chatWithLearningAdvisorStream(
              {
                goal_text: resolvedGoal,
                messages: nextMessages,
                path_id: savedPathId || undefined,
                persist_conversation: true,
              },
              {
                onDelta: (delta) => {
                  setStreamingAssistantText((prev) => `${prev}${delta}`)
                },
              }
            )
      normalizeAdvisorResult(response, nextMessages)
    } catch (error: any) {
      toast.error(error?.message || tr('ai_learning_path.toast_advisor_failed', 'Không thể lấy tư vấn lộ trình.'))
    } finally {
      setIsThinking(false)
      setStreamingAssistantText('')
      advisorRequestInFlightRef.current = false
    }
  }

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || isThinking) return

    if (!goalText.trim()) {
      shouldAutoScrollRef.current = true
      setGoalText(trimmed)
      setShowQuickReplies(false)
      setMessages([])
      setDraft('')
      await callAdvisor([], trimmed)
      return
    }

    setShowQuickReplies(false)
    shouldAutoScrollRef.current = true
    const nextMessages: AdvisorMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setDraft('')
    await callAdvisor(nextMessages)
  }

  const handleSave = async () => {
    if (!advisorState) {
      toast.error(tr('ai_learning_path.toast_no_path_to_save', 'Chưa có lộ trình để lưu.'))
      return
    }

    if (savedPathId) {
      toast.success(tr('ai_learning_path.toast_path_already_saved', 'Lộ trình đã được lưu.'))
      return
    }

    if (!isAuthenticated) {
      openLogin({
        onSuccess: () => {
          void handleSave()
        },
      })
      return
    }

    try {
      setIsSaving(true)
      const saved = await createLearningPath({
        goal_text: goalText,
        summary: advisorState.summary,
        estimated_weeks: advisorState.estimated_weeks,
        path: advisorState.path,
        messages,
        advisor_meta: advisorState.advisor_meta,
      })
      setSavedPathId(saved.id)
      setActiveHistoryPathId(saved.id)
      setHistoryPaths((prev) => {
        const nextItem: LearningPathSummary = {
          id: saved.id,
          goal_text: saved.goal_text,
          summary: saved.summary,
          estimated_weeks: saved.estimated_weeks,
          created_at: saved.created_at,
          updated_at: saved.updated_at,
          conversation_count: saved.messages.length,
          advisor_meta: saved.advisor_meta,
          items: saved.items,
        }
        const filtered = prev.filter((item) => item.id !== saved.id)
        return [nextItem, ...filtered]
      })
      onSaved?.(saved)
      toast.success(tr('ai_learning_path.toast_path_saved_success', 'Đã lưu lộ trình học.'))
    } catch (error: any) {
      toast.error(error?.message || tr('ai_learning_path.toast_save_path_failed', 'Không thể lưu lộ trình.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenCourse = (courseId: number, continueLearning = false) => {
    closeDialog(false)
    window.setTimeout(() => {
      if (continueLearning && isAuthenticated) {
        navigate(`/course-player/${courseId}`)
        return
      }
      navigate(`/course/${courseId}`)
    }, 0)
  }

  const handleStartPath = () => {
    if (!progressSnapshot?.nextActionItem) return
    handleOpenCourse(progressSnapshot.nextActionItem.course_id, isOwned(progressSnapshot.nextActionItem.course_id))
  }

  const handleOpenCatalog = () => {
    closeDialog(false)
    window.setTimeout(() => {
      if (user?.roles?.includes('admin')) {
        navigate('/admin/catalog-metadata')
        return
      }
      navigate('/instructor/courses')
    }, 0)
  }

  const addMissingCoursesToCart = async () => {
    if (!advisorState || missingPathItems.length === 0) {
      toast.info(tr('ai_learning_path.toast_no_missing_courses', 'Không còn khóa nào cần thêm vào giỏ.'))
      return
    }

    if (!isAuthenticated || !user?.id) {
      openLogin()
      return
    }

    try {
      setIsAddingMissingToCart(true)
      for (const item of missingPathItems) {
        await addToCartFromApi(Number(user.id), item.course_id, {})
      }
      await loadCart(Number(user.id))
      toast.success(tr('ai_learning_path.toast_added_missing_courses', `Đã thêm ${missingPathItems.length} khóa vào giỏ.`, { count: missingPathItems.length }))
    } finally {
      setIsAddingMissingToCart(false)
    }
  }

  const handleCheckoutMissingCourses = async () => {
    await addMissingCoursesToCart()
    if (isAuthenticated && user?.id) {
      closeDialog(false)
      window.setTimeout(() => {
        navigate('/cart')
      }, 0)
    }
  }

  const handleDeleteHistoryPath = async () => {
    if (!pendingDeletePath) return
    const deletingId = pendingDeletePath.id
    const deletingGoal = pendingDeletePath.goal_text
    const deletingIndex = historyPaths.findIndex((item) => item.id === deletingId)
    const remaining = historyPaths.filter((item) => item.id !== deletingId)
    const fallbackCandidate = deletingIndex >= 0
      ? remaining[deletingIndex] || remaining[deletingIndex - 1] || null
      : null

    try {
      setDeletingPathId(deletingId)
      await deleteLearningPath(deletingId)
      setHistoryPaths(remaining)

      const wasCurrentOpen = activeHistoryPathId === deletingId || savedPathId === deletingId
      if (wasCurrentOpen && fallbackCandidate) {
        setActiveHistoryPathId(fallbackCandidate.id)
        setSavedPathId(fallbackCandidate.id)
        void loadPathDetail(fallbackCandidate.id)
      } else if (wasCurrentOpen && !fallbackCandidate) {
        setActiveHistoryPathId(null)
        setSavedPathId(null)
      }

      toast.success(`Đã xóa lịch sử chat: ${deletingGoal}`)
      setPendingDeletePath(null)
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xóa lịch sử chat.')
    } finally {
      setDeletingPathId(null)
    }
  }

  const stepStatusLabel = (status: string, progress: number) => {
    if (status === 'completed') return tr('ai_learning_path.status_completed', 'Hoàn thành')
    if (status === 'in_progress') return tr('ai_learning_path.status_in_progress', `Đang học ${Math.round(progress)}%`, { progress: Math.round(progress) })
    if (status === 'owned') return tr('ai_learning_path.status_owned', 'Đã sở hữu')
    if (status === 'skippable') return tr('ai_learning_path.status_skippable', 'Có thể bỏ qua')
    return tr('ai_learning_path.status_needs_enrollment', 'Cần đăng ký')
  }

  const handleMessageLinkNavigate = (path: string) => {
    closeDialog(false)
    window.setTimeout(() => {
      navigate(path)
    }, 0)
  }

  const renderMessageContent = (content: string, isOwnedFn?: (courseId: number) => boolean): ReactNode => {
    const blocks = parseMessageBlocks(content)

    return (
      <div className="space-y-3">
        {blocks.map((block, blockIdx) => {
          if (block.type === 'table') {

            const courseIdColIdx = block.headers.findIndex((h) =>
              /course[_\s]*id|^id$/.test(h.toLowerCase())
            )


            const courseNameColIdx = block.headers.findIndex((h) =>
              /khóa\s*học|khoa\s*hoc|course|tên|ten/.test(h.toLowerCase())
            )

            return (
              <div key={`table-${blockIdx}`} className="overflow-x-auto rounded-lg border border-slate-700/50 bg-slate-900/30">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {block.headers.map((header, colIdx) => (
                        <th key={`header-${colIdx}`} className="border-r border-slate-700/50 px-3 py-2 text-left font-medium text-slate-100 last:border-r-0">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIdx) => {

                      let courseId: number | null = null
                      if (courseIdColIdx >= 0 && row[courseIdColIdx]) {

                        const idStr = row[courseIdColIdx].replace(/[^\d]/g, '')
                        courseId = idStr ? parseInt(idStr, 10) : null
                      }
                      const isOwned = courseId && isOwnedFn ? isOwnedFn(courseId) : false

                      return (
                        <tr
                          key={`row-${rowIdx}`}
                          className={`${
                            rowIdx % 2 === 0 ? 'bg-slate-800/20' : ''
                          } border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors ${
                            isOwned ? 'bg-green-900/15' : ''
                          }`}
                        >
                          {row.map((cell, colIdx) => {

                            if (colIdx === courseNameColIdx && courseId) {
                              return (
                                <td key={`cell-${rowIdx}-${colIdx}`} className="border-r border-slate-700/20 px-3 py-2 text-slate-100 last:border-r-0 break-words">
                                  <button
                                    type="button"
                                    onClick={() => handleMessageLinkNavigate(`/course/${courseId}`)}
                                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium"
                                  >
                                    {cell}
                                    {isOwned && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/40 whitespace-nowrap">
                                        Đã có
                                      </span>
                                    )}
                                  </button>
                                </td>
                              )
                            }


                            return (
                              <td
                                key={`cell-${rowIdx}-${colIdx}`}
                                className="border-r border-slate-700/20 px-3 py-2 text-slate-100 last:border-r-0 break-words"
                              >
                                <div className="flex items-center gap-2">
                                  {colIdx === courseIdColIdx && isOwned && (
                                    <span
                                      className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-500/30 text-green-300 flex-shrink-0 text-xs font-bold"
                                      title="Đã sở hữu"
                                    >
                                      ✓
                                    </span>
                                  )}
                                  <span>{cell}</span>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }


          const textContent = block.content
          const markdownLinkRegex = /\[([^\]]+)\]\((\/course-player\/\d+|\/course\/\d+|\/cart)\)/g
          const routeLabelFromPath = (path: string) => {
            const courseMatch = path.match(/^\/course\/(\d+)$/)
            if (courseMatch) return `Mo khoa hoc #${courseMatch[1]}`

            const playerMatch = path.match(/^\/course-player\/(\d+)$/)
            if (playerMatch) return `Tiep tuc hoc #${playerMatch[1]}`

            if (path === '/cart') return 'Mo gio hang'
            return path
          }

          const segments: Array<{ type: 'text' | 'link'; value: string; href?: string }> = []
          let lastIndex = 0
          let match: RegExpExecArray | null
          while ((match = markdownLinkRegex.exec(textContent)) !== null) {
            if (match.index > lastIndex) {
              segments.push({ type: 'text', value: textContent.slice(lastIndex, match.index) })
            }
            segments.push({ type: 'link', value: match[1], href: match[2] })
            lastIndex = match.index + match[0].length
          }
          if (lastIndex < textContent.length) {
            segments.push({ type: 'text', value: textContent.slice(lastIndex) })
          }

          if (segments.some((segment) => segment.type === 'link')) {
            return (
              <div key={`text-${blockIdx}`}>
                {segments.map((segment, index) => {
                  if (segment.type === 'text') {
                    return (
                      <span key={`md-text-${index}`} className="whitespace-pre-wrap break-words">
                        {segment.value}
                      </span>
                    )
                  }
                  return (
                    <button
                      key={`md-link-${index}`}
                      type="button"
                      onClick={() => handleMessageLinkNavigate(segment.href || '')}
                      className="mx-0.5 inline-flex items-center rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-0.5 text-blue-200 hover:bg-blue-500/20"
                    >
                      {segment.value}
                    </button>
                  )
                })}
              </div>
            )
          }

          const routeRegex = /(\/course-player\/\d+|\/course\/\d+|\/cart)/g
          const parts = textContent.split(routeRegex)
          return (
            <div key={`text-${blockIdx}`}>
              {parts.map((part, index) => {
                if (!part) return null
                const isRoute = /^\/course-player\/\d+$/.test(part) || /^\/course\/\d+$/.test(part) || part === '/cart'
                if (isRoute) {
                  return (
                    <button
                      key={`route-${index}`}
                      type="button"
                      onClick={() => handleMessageLinkNavigate(part)}
                      className="mx-0.5 inline-flex items-center rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-0.5 text-blue-200 hover:bg-blue-500/20"
                    >
                      {routeLabelFromPath(part)}
                    </button>
                  )
                }
                return (
                  <span key={`text-${index}`} className="whitespace-pre-wrap break-words">
                    {part}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  const visibleQuickActions = (quickReplyActions.length > 0 ? quickReplyActions : FALLBACK_QUICK_ACTIONS).slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent
        style={{
          zIndex: 280,
          opacity: 1,
          width: 'min(980px, calc(100vw - 1rem))',
          height: 'min(820px, calc(100vh - 1rem))',
          maxWidth: '980px',
          maxHeight: 'calc(100vh - 1rem)',
          backgroundColor: '#020617',
          backgroundImage: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        }}
        onInteractOutside={(event) => {
          if (Date.now() - openedAtRef.current < 120) {
            event.preventDefault()
          }
        }}
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6 sm:data-[state=open]:slide-in-from-top-4 sm:data-[state=closed]:slide-out-to-top-4 overflow-hidden border border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950 p-0 text-slate-100 shadow-2xl duration-300 flex flex-col"
      >
        <DialogTitle className="sr-only">AI Advisor</DialogTitle>
        <DialogDescription className="sr-only">
          Trợ lý AI tư vấn lộ trình học tập, lịch sử hội thoại và các hành động điều hướng khóa học.
        </DialogDescription>

        <div className="border-b border-slate-800/50 px-4 py-4 sm:px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-300">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Advisor</h2>
              <p className="text-xs text-slate-400">{tr('ai_learning_path.description', 'Tìm khóa học và thiết kế lộ trình học tập')}</p>
            </div>
          </div>
        </div>


        <div
          className={isDesktopDialogLayout ? 'flex-1 min-h-0 overflow-hidden grid' : 'flex-1 min-h-0 overflow-hidden flex flex-col'}
          style={isDesktopDialogLayout ? { gridTemplateColumns: '320px minmax(0, 1fr)' } : undefined}
        >
          <aside
            className={
              isDesktopDialogLayout
                ? 'min-h-0 border-r border-slate-800/50 bg-slate-900/50 p-3'
                : 'w-full border-b border-slate-800/50 bg-slate-900/50 p-3'
            }
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lịch sử chat</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
                placeholder="Tìm theo mục tiêu..."
                className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none"
              />
            </div>
            <div
              ref={historyListRef}
              onScroll={handleHistoryScroll}
              className={isDesktopDialogLayout ? 'mt-3 h-full min-h-0 space-y-2 overflow-y-auto pr-1' : 'mt-3 max-h-40 space-y-2 overflow-y-auto pr-1'}
            >
              {!isAuthenticated && (
                <p className="text-xs text-slate-500">Đăng nhập để lưu và xem lịch sử.</p>
              )}
              {isAuthenticated && isLoadingHistory && (
                <p className="text-xs text-slate-500">Đang tải lịch sử...</p>
              )}
              {isAuthenticated && !isLoadingHistory && historyPaths.length === 0 && (
                <p className="text-xs text-slate-500">Chưa có cuộc hội thoại đã lưu.</p>
              )}
              {isAuthenticated && !isLoadingHistory && historyPaths.length > 0 && filteredHistoryPaths.length === 0 && (
                <p className="text-xs text-slate-500">Không có kết quả khớp từ khóa.</p>
              )}
              {filteredHistoryPaths.map((path) => (
                <div
                  key={path.id}
                  className={activeHistoryPathId === path.id ? 'w-full rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2' : 'w-full rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2'}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void loadPathDetail(path.id)}
                      className="flex-1 text-left"
                    >
                      <p className="line-clamp-2 break-words text-xs font-medium text-slate-100">{path.goal_text}</p>
                      <p className="mt-1 line-clamp-2 break-words text-[11px] text-slate-400">{path.summary || 'Không có tóm tắt.'}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {path.conversation_count} tin nhắn • {new Date(path.updated_at).toLocaleString('vi-VN')}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPendingDeletePath(path)
                      }}
                      disabled={deletingPathId === path.id}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-700/50 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Xóa lịch sử"
                      title="Xóa lịch sử"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {isAuthenticated && isLoadingMoreHistory && (
                <p className="py-1 text-center text-xs text-slate-500">Đang tải thêm...</p>
              )}
            </div>
          </aside>

          <div className="flex-1 min-h-0 min-w-0 flex flex-col">

            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 sm:px-5"
            >

            {!goalText && messages.length === 0 && (
              <div className="flex flex-col gap-3 py-4">
                <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-3">
                  <p className="text-sm text-slate-200 leading-relaxed">{tr('ai_learning_path.intro_assistant', introAssistantMessage)}</p>
                </div>
                <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 px-4 py-3">
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">{tr('ai_learning_path.intro_question', introQuestionMessage)}</p>
                </div>
              </div>
            )}


            {goalText && (
              <div className="flex justify-end">
                <div className="bg-blue-600/70 rounded-lg px-4 py-2 max-w-full sm:max-w-[78%] lg:max-w-[70%]">
                  <p className="text-sm text-white whitespace-pre-wrap break-words">{goalText}</p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-full sm:max-w-[78%] lg:max-w-[70%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600/70 text-white'
                    : 'bg-slate-800/60 border border-slate-700/50 text-slate-100'
                }`}>
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{renderMessageContent(message.content)}</p>
                  ) : (
                    <div className="text-sm leading-relaxed break-words">{renderMessageContent(message.content, isOwned)}</div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && streamingAssistantText.trim() && (
              <div className="flex justify-start">
                <div className="max-w-full sm:max-w-[78%] lg:max-w-[70%] rounded-lg px-4 py-2 bg-slate-800/60 border border-slate-700/50 text-slate-100">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {streamingAssistantText}
                    <span className="inline-block ml-1 h-4 w-2 align-middle bg-slate-300/70 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {isThinking && !streamingAssistantText.trim() && (
              <div className="flex items-center gap-2">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <p className="text-sm text-slate-400">{tr('ai_learning_path.thinking', 'Đang xử lý...')}</p>
                </div>
              </div>
            )}

          </div>


            <div className="border-t border-slate-800/50 px-4 py-4 space-y-3 sm:px-5">

            {goalText && showQuickReplies && visibleQuickActions.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleQuickActions.map((action, index) => (
                  <Button
                    key={`${action}-${index}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-700/50 bg-slate-800/30 text-slate-200 hover:bg-slate-700/50 h-8 text-xs"
                    onClick={() => void handleSubmit(action)}
                    disabled={isThinking}
                  >
                    {index === 0 ? <ListChecks className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                    {action}
                  </Button>
                ))}
              </div>
            )}


            <form
              onSubmit={(event) => {
                event.preventDefault()
                void handleSubmit(draft)
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={!goalText ? tr('ai_learning_path.goal_input_placeholder', 'Nhập mục tiêu học tập của bạn...') : tr('ai_learning_path.adjustment_input_placeholder', 'Nhập câu trả lời hoặc yêu cầu điều chỉnh...')}
                className="h-9 text-sm border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500 rounded-lg flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isThinking || isLoadingSavedPath || !draft.trim()}
                className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16366269 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99021575 L3.03521743,10.4310946 C3.03521743,10.5881921 3.34915502,10.7452894 3.50612381,10.7452894 L16.6915026,11.5307763 C16.6915026,11.5307763 17.1624089,11.5307763 17.1624089,12.0020684 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
                </svg>
              </Button>
            </form>

            </div>
          </div>
        </div>

        {pendingDeletePath && (
          <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-slate-700/70 bg-slate-900/95 p-5 shadow-2xl">
              <p className="text-base font-semibold text-white">Xác nhận xóa lịch sử</p>
              <p className="mt-2 text-sm text-slate-300">Bạn có chắc muốn xóa cuộc hội thoại này không?</p>
              <p className="mt-2 rounded-md border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 line-clamp-2">
                {pendingDeletePath.goal_text}
              </p>
              <p className="mt-1 text-xs text-slate-500">Thao tác này không thể hoàn tác.</p>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700/60 bg-transparent text-slate-200 hover:bg-slate-800/70"
                  onClick={() => setPendingDeletePath(null)}
                  disabled={deletingPathId === pendingDeletePath.id}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => void handleDeleteHistoryPath()}
                  disabled={deletingPathId === pendingDeletePath.id}
                >
                  {deletingPathId === pendingDeletePath.id ? 'Đang xóa...' : 'Xóa lịch sử'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
