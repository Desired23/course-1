import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from "../../components/Router"
import { QuizPlayer } from "../../components/QuizPlayer"
import { VideoPlayer, type VideoProgressPayload } from "../../components/VideoPlayer"
import { Button } from "../../components/ui/button"
import { Progress } from "../../components/ui/progress"
import { Separator } from "../../components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Textarea } from "../../components/ui/textarea"
import { Avatar, AvatarFallback } from "../../components/ui/avatar"
import { Badge } from "../../components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet"
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  List,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  HelpCircle,
  PlayCircle,
  Clock,
  Lock,
  Trash2,
  MessageSquare,
  FileText,
  Download,
  PanelRightOpen,
  PanelRightClose,
  Loader2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { CommentItem } from "../../components/CommentItem"
import { getCourseById, type CourseDetail, type ModuleSummary, formatDuration } from "../../services/course.api"
import { getCourseProgress, updateLessonProgress, type CourseProgress, type LessonProgress } from "../../services/enrollment.api"
import {
  getAllLessonComments, getAllReplies, createLessonComment,
  updateLessonComment, deleteLessonComment,
  formatCommentDate, type LessonComment,
} from "../../services/lesson-comments.api"
import { getUserById, type UserProfile } from "../../services/auth.api"
import { useAuth } from "../../contexts/AuthContext"
import { useTranslation } from "react-i18next"

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CurriculumSection {
  id: number
  title: string
  description: string | null
  order: number
  lectures: number
  duration: string
  lessons: CurriculumLesson[]
}

interface CurriculumLesson {
  id: number
  title: string
  videoUrl: string | null
  duration: string
  type: 'video' | 'quiz' | 'text'
  isFree: boolean
  isCompleted: boolean
  order: number
}

const LESSON_COMPLETION_THRESHOLD_PERCENT = 85
const LESSON_PROGRESS_SYNC_STEP = 10

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildCurriculum(
  modules: ModuleSummary[],
  lessonProgressMap: Map<number, LessonProgress>
): CurriculumSection[] {
  return modules
    .sort((a, b) => a.order_number - b.order_number)
    .map(mod => ({
      id: mod.module_id,
      title: mod.title,
      description: mod.description,
      order: mod.order_number,
      lectures: mod.lessons.length,
      duration: mod.duration ? formatDuration(mod.duration) : `${mod.lessons.length} lessons`,
      lessons: mod.lessons
        .sort((a, b) => a.order - b.order)
        .map(lesson => {
          const lp = lessonProgressMap.get(lesson.lesson_id)
          return {
            id: lesson.lesson_id,
            title: lesson.title,
            videoUrl: lesson.signed_video_url || lesson.video_url || null,
            duration: lesson.duration ? formatDuration(lesson.duration) : '',
            type: lesson.has_quiz ? 'quiz' as const : lesson.content_type === 'text' ? 'text' as const : 'video' as const,
            isFree: lesson.is_free,
            isCompleted: lp?.is_completed || false,
            order: lesson.order,
          }
        })
    }))
}

function findNextLesson(curriculum: CurriculumSection[], currentId: number): CurriculumLesson | null {
  const flat = curriculum.flatMap(s => s.lessons)
  const idx = flat.findIndex(l => l.id === currentId)
  return idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null
}

function findPrevLesson(curriculum: CurriculumSection[], currentId: number): CurriculumLesson | null {
  const flat = curriculum.flatMap(s => s.lessons)
  const idx = flat.findIndex(l => l.id === currentId)
  return idx > 0 ? flat[idx - 1] : null
}

function findLesson(curriculum: CurriculumSection[], lessonId: number): CurriculumLesson | null {
  for (const s of curriculum) {
    const l = s.lessons.find(l => l.id === lessonId)
    if (l) return l
  }
  return null
}

function flattenLessons(curriculum: CurriculumSection[]): CurriculumLesson[] {
  return curriculum.flatMap(section => section.lessons)
}

export function CoursePlayerPage() {
  const { t } = useTranslation()
  const { navigate, params } = useRouter()
  const courseId = Number(params.courseId)

  // â”€â”€ Core State â”€â”€
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentLessonId, setCurrentLessonId] = useState<number | null>(null)
  const [progress, setProgress] = useState([0])
  const [currentPlaybackTimeSec, setCurrentPlaybackTimeSec] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCurriculumCollapsed, setIsCurriculumCollapsed] = useState(() => {
    try { const s = localStorage.getItem('curriculumSidebarCollapsed'); return s ? JSON.parse(s) : false }
    catch { return false }
  })

  // Notes (localStorage per course)
  const notesKey = `courseNotes_${courseId}`
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState<Array<{
    id: number; lessonId: number; timestamp: string; note: string; created: string
  }>>(() => {
    try { const s = localStorage.getItem(notesKey); return s ? JSON.parse(s) : [] }
    catch { return [] }
  })

  // Comments (real API via lesson-comments service)
  const { user } = useAuth()
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [comments, setComments] = useState<Array<{
    id: number; lessonId: number; user: string; avatar: string;
    date: string; content: string; likes: number; parentId: number | null;
    replies: any[]; status?: string
  }>>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const commentUserCache = useRef(new Map<number, UserProfile>())

  // Quiz progress (localStorage)
  const [quizProgress, setQuizProgress] = useState<Record<number, any>>(() => {
    try { const s = localStorage.getItem('quizProgress'); return s ? JSON.parse(s) : {} }
    catch { return {} }
  })
  const [locallyCompletedLessons, setLocallyCompletedLessons] = useState<Record<number, boolean>>({})
  const completionInFlightRef = useRef(new Set<number>())
  const lastProgressSyncRef = useRef(new Map<number, number>())

  // â”€â”€ Build curriculum from API data â”€â”€
  const lessonProgressMap = useMemo(() => {
    const map = new Map<number, LessonProgress>()
    if (courseProgress?.lessons) {
      courseProgress.lessons.forEach(lp => map.set(lp.lesson_id, lp))
    }
    return map
  }, [courseProgress])

  const curriculum = useMemo(() => {
    if (!course?.modules) return []
    return buildCurriculum(course.modules, lessonProgressMap)
  }, [course, lessonProgressMap])
  const orderedLessons = useMemo(() => flattenLessons(curriculum), [curriculum])

  const completedLessonIds = useMemo(() => {
    const done = new Set<number>()
    lessonProgressMap.forEach((lp, lessonId) => {
      if (lp.is_completed) done.add(lessonId)
    })
    Object.entries(locallyCompletedLessons).forEach(([lessonId, completed]) => {
      if (completed) done.add(Number(lessonId))
    })
    return done
  }, [lessonProgressMap, locallyCompletedLessons])

  const furthestUnlockedIndex = useMemo(() => {
    if (orderedLessons.length === 0) return -1
    let furthest = 0
    for (let i = 0; i < orderedLessons.length - 1; i++) {
      if (completedLessonIds.has(orderedLessons[i].id)) {
        furthest = i + 1
      } else {
        break
      }
    }
    return furthest
  }, [orderedLessons, completedLessonIds])

  const isLessonUnlocked = (lessonId: number): boolean => {
    const lessonIndex = orderedLessons.findIndex(l => l.id === lessonId)
    if (lessonIndex === -1) return false
    if (completedLessonIds.has(lessonId)) return true
    return lessonIndex <= furthestUnlockedIndex
  }

  const currentLesson = useMemo(() => {
    if (!currentLessonId || curriculum.length === 0) return null
    return findLesson(curriculum, currentLessonId)
  }, [curriculum, currentLessonId])
  const currentLessonCompleted = currentLessonId ? completedLessonIds.has(currentLessonId) : false

  const overallProgress = courseProgress?.overall_progress ?? 0
  const completedLessons = courseProgress?.completed_lessons ?? 0
  const totalLessons = courseProgress?.total_lessons ?? course?.total_lessons ?? 0

  // â”€â”€ Fetch course & progress â”€â”€
  useEffect(() => {
    if (!courseId || isNaN(courseId)) {
      setError('Invalid course ID')
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [courseData, progressData] = await Promise.allSettled([
          getCourseById(courseId),
          getCourseProgress(courseId),
        ])
        if (cancelled) return
        if (courseData.status === 'fulfilled') {
          setCourse(courseData.value)
        } else {
          setError(t('course_player.load_failed'))
          return
        }
        if (progressData.status === 'fulfilled') {
          setCourseProgress(progressData.value)
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || t('course_player.load_failed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId])

  // Set initial lesson once curriculum is built
  useEffect(() => {
    if (curriculum.length > 0 && currentLessonId === null) {
      setExpandedSections({ [curriculum[0].id]: true })
      const firstUnlocked = orderedLessons.find((lesson, index) =>
        completedLessonIds.has(lesson.id) || index <= furthestUnlockedIndex
      )
      setCurrentLessonId(firstUnlocked?.id ?? orderedLessons[0]?.id ?? null)
    }
  }, [curriculum, currentLessonId, orderedLessons, furthestUnlockedIndex, completedLessonIds])

  // Save states to localStorage
  useEffect(() => {
    try { localStorage.setItem('curriculumSidebarCollapsed', JSON.stringify(isCurriculumCollapsed)) } catch {}
  }, [isCurriculumCollapsed])
  useEffect(() => {
    try { localStorage.setItem(notesKey, JSON.stringify(notes)) } catch {}
  }, [notes, notesKey])
  useEffect(() => {
    try { localStorage.setItem('quizProgress', JSON.stringify(quizProgress)) } catch {}
  }, [quizProgress])

  // â”€â”€ Load comments from API when lesson changes â”€â”€
  const resolveCommentUser = async (userId: number): Promise<{ name: string; initials: string }> => {
    if (commentUserCache.current.has(userId)) {
      const u = commentUserCache.current.get(userId)!
      const name = u.full_name || u.username
      return { name, initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
    }
    try {
      const u = await getUserById(userId)
      commentUserCache.current.set(userId, u)
      const name = u.full_name || u.username
      return { name, initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }
    } catch {
      return { name: `User #${userId}`, initials: 'U' }
    }
  }

  const transformComment = async (c: LessonComment, replies: LessonComment[]): Promise<any> => {
    const { name, initials } = await resolveCommentUser(c.user)
    const transformedReplies = await Promise.all(
      replies.map(async (r) => transformComment(r, []))
    )
    return {
      id: c.id,
      lessonId: c.lesson,
      user: name,
      avatar: initials,
      date: formatCommentDate(c.created_at),
      content: c.content,
      likes: c.votes,
      parentId: c.parent_comment,
      replies: transformedReplies,
    }
  }

  const loadComments = async (lessonId: number) => {
    setCommentsLoading(true)
    try {
      const rootComments = await getAllLessonComments(lessonId)
      const transformed = await Promise.all(
        rootComments.map(async (rc) => {
          let replies: LessonComment[] = []
          try { replies = await getAllReplies(rc.id) } catch {}
          return transformComment(rc, replies)
        })
      )
      setComments(transformed)
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    if (currentLessonId) loadComments(currentLessonId)
  }, [currentLessonId])

  // â”€â”€ Handlers â”€â”€
  const handleAddNote = () => {
    if (!newNote.trim()) { toast.error('Please write a note'); return }
    const currentTime = Math.floor(currentPlaybackTimeSec)
    const minutes = Math.floor(currentTime / 60)
    const seconds = currentTime % 60
    const timestamp = `${minutes}:${String(seconds).padStart(2, '0')}`
    setNotes(prev => [{ id: Date.now(), lessonId: currentLessonId!, timestamp, note: newNote, created: 'Just now' }, ...prev])
    setNewNote('')
    toast.success('Note saved successfully!')
  }

  const handleDeleteNote = (noteId: number) => {
    setNotes(prev => prev.filter(n => n.id !== noteId))
    toast.success('Note deleted')
  }

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentLessonId) return
    try {
      await createLessonComment({ lesson: currentLessonId, content: newComment.trim() })
      setNewComment('')
      toast.success(t('course_player.comment_posted'))
      loadComments(currentLessonId)
    } catch (err: any) {
      toast.error(err?.message || t('course_player.comment_post_failed'))
    }
  }

  const handlePostReply = async (parentId: number, content: string) => {
    if (!content.trim() || !currentLessonId) return
    try {
      await createLessonComment({ lesson: currentLessonId, content: content.trim(), parent_comment: parentId })
      setReplyingTo(null)
      toast.success(t('course_player.reply_posted'))
      loadComments(currentLessonId)
    } catch (err: any) {
      toast.error(err?.message || t('course_player.reply_post_failed'))
    }
  }

  const handleEditComment = async (commentId: number, newContent: string) => {
    try {
      await updateLessonComment(commentId, { content: newContent })
      toast.success(t('course_player.comment_updated'))
      if (currentLessonId) loadComments(currentLessonId)
    } catch (err: any) {
      toast.error(err?.message || t('course_player.update_failed'))
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteLessonComment(commentId)
      toast.success(t('course_player.comment_deleted'))
      if (currentLessonId) loadComments(currentLessonId)
    } catch (err: any) {
      toast.error(err?.message || t('course_player.comment_delete_failed'))
    }
  }

  const handleDownloadResource = (resourceName: string) => {
    toast.success(`Downloading ${resourceName}...`)
  }

  const getSavedProgressForLesson = (lessonId: number): number => {
    const apiProgressRaw = lessonProgressMap.get(lessonId)?.progress_percentage
    const apiProgress = apiProgressRaw ? parseFloat(apiProgressRaw) : 0
    let localProgress = 0
    try {
      const saved = localStorage.getItem(`video_progress_${lessonId}`)
      localProgress = saved ? parseFloat(saved) : 0
    } catch {
      localProgress = 0
    }
    return Math.min(100, Math.max(apiProgress || 0, localProgress || 0))
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const handleLessonChange = (lessonId: number) => {
    if (!isLessonUnlocked(lessonId)) {
      toast.error(t('course_player.unlock_previous_required', { percent: LESSON_COMPLETION_THRESHOLD_PERCENT }))
      return
    }
    setCurrentLessonId(lessonId)
    setProgress([getSavedProgressForLesson(lessonId)])
    setCurrentPlaybackTimeSec(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setIsSidebarOpen(false)
  }

  const goToNextLesson = () => {
    if (!currentLessonId) return
    if (!currentLessonCompleted) {
      toast.error(t('course_player.complete_current_required', { percent: LESSON_COMPLETION_THRESHOLD_PERCENT }))
      return
    }
    const next = findNextLesson(curriculum, currentLessonId)
    if (next && isLessonUnlocked(next.id)) { handleLessonChange(next.id); toast.success(`Playing: ${next.title}`) }
    else toast.info(t('course_player.end_of_course'))
  }

  const goToPreviousLesson = () => {
    if (!currentLessonId) return
    const prev = findPrevLesson(curriculum, currentLessonId)
    if (prev) { handleLessonChange(prev.id); toast.success(t('course_player.playing_lesson', { title: prev.title })) }
    else toast.info(t('course_player.first_lesson'))
  }

  const handleLessonComplete = async (lessonId: number = currentLessonId || 0) => {
    if (!lessonId || completedLessonIds.has(lessonId) || completionInFlightRef.current.has(lessonId)) return
    completionInFlightRef.current.add(lessonId)
    setLocallyCompletedLessons(prev => ({ ...prev, [lessonId]: true }))
    toast.success(t('course_player.lesson_completed'))
    try {
      await updateLessonProgress({ lesson_id: lessonId, progress_percentage: 100, is_completed: true })
      try { const updated = await getCourseProgress(courseId); setCourseProgress(updated) } catch {}
    } catch (err) {
      console.error('Failed to update lesson progress:', err)
      setLocallyCompletedLessons(prev => {
        const next = { ...prev }
        delete next[lessonId]
        return next
      })
    } finally {
      completionInFlightRef.current.delete(lessonId)
    }
    setTimeout(() => {
      const next = findNextLesson(curriculum, lessonId)
      if (next) { toast.info(t('course_player.auto_playing_next', { title: next.title })); handleLessonChange(next.id) }
    }, 3000)
  }

  const handleVideoProgress = async (payload: VideoProgressPayload) => {
    if (!currentLessonId) return
    const normalized = Math.min(payload.percentage, 100)
    setCurrentPlaybackTimeSec(payload.currentTime)
    setProgress(prev => [Math.max(prev[0] || 0, normalized)])
    try {
      const existing = localStorage.getItem(`video_progress_${currentLessonId}`)
      const existingValue = existing ? parseFloat(existing) : 0
      localStorage.setItem(`video_progress_${currentLessonId}`, String(Math.max(existingValue || 0, normalized)))
    } catch {}

    const milestone = Math.floor(normalized / LESSON_PROGRESS_SYNC_STEP) * LESSON_PROGRESS_SYNC_STEP
    const lastSyncedMilestone = lastProgressSyncRef.current.get(currentLessonId) || 0
    if (milestone >= LESSON_PROGRESS_SYNC_STEP && milestone > lastSyncedMilestone) {
      lastProgressSyncRef.current.set(currentLessonId, milestone)
      try {
        await updateLessonProgress({
          lesson_id: currentLessonId,
          progress_percentage: normalized,
          last_position: Math.floor(payload.maxWatchedTime),
          is_completed: normalized >= LESSON_COMPLETION_THRESHOLD_PERCENT,
        })
      } catch {}
    }

    if (normalized >= LESSON_COMPLETION_THRESHOLD_PERCENT) {
      handleLessonComplete(currentLessonId)
    }
  }

  // â”€â”€ Loading / Error â”€â”€
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('course_player.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">{t('course_player.load_failed')}</h2>
          <p className="text-muted-foreground mb-4">{error || t('course_player.not_found')}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/my-learning')}>{t('course_player.back_to_my_learning')}</Button>
            <Button onClick={() => window.location.reload()}>{t('course_player.retry')}</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">{t('course_player.no_lessons')}</p>
          <Button className="mt-4" onClick={() => navigate('/my-learning')}>{t('course_player.back_to_my_learning')}</Button>
        </div>
      </div>
    )
  }

  // â”€â”€ Curriculum Sidebar Component â”€â”€
  const CurriculumSidebar = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-card/50">
        <h3 className="font-semibold">{t('course_player.course_content')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {curriculum.length} sections â€¢ {curriculum.reduce((acc, s) => acc + s.lectures, 0)} lectures
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {curriculum.map((section) => (
          <div key={section.id} className="border-b">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 text-left">
                {expandedSections[section.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div>
                  <p className="font-medium text-sm">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.lectures} lectures â€¢ {section.duration}</p>
                </div>
              </div>
            </button>
            {expandedSections[section.id] && (
              <div className="bg-muted/30">
                {section.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonChange(lesson.id)}
                    disabled={!isLessonUnlocked(lesson.id)}
                    className={`w-full px-4 py-3 pl-12 flex items-center justify-between transition-colors ${
                      lesson.id === currentLessonId ? 'bg-accent' : ''
                    } ${isLessonUnlocked(lesson.id) ? 'hover:bg-accent/50' : 'opacity-50 cursor-not-allowed'}`}
                    title={!isLessonUnlocked(lesson.id) ? `Cáº§n hoÃ n thÃ nh bÃ i trÆ°á»›c (>=${LESSON_COMPLETION_THRESHOLD_PERCENT}%)` : undefined}
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      {!isLessonUnlocked(lesson.id) ? (
                        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : lesson.isCompleted || completedLessonIds.has(lesson.id) ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : lesson.type === 'quiz' ? (
                        <HelpCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm ${lesson.id === currentLessonId ? 'font-medium' : ''}`}>{lesson.title}</span>
                      {lesson.type === 'quiz' && (
                        <Badge variant="secondary" className="text-xs ml-auto">{t('course_player.quiz_badge')}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">{lesson.duration}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Course Player Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/my-learning')}>
              <X className="h-5 w-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <h1 className="font-semibold truncate max-w-[300px] hidden sm:block">{course.title}</h1>
              <h1 className="font-semibold truncate max-w-[150px] sm:hidden">{t('course_player.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <List className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('course_player.curriculum_title')}</SheetTitle>
                  <SheetDescription>{t('course_player.curriculum_description')}</SheetDescription>
                </SheetHeader>
                <CurriculumSidebar />
              </SheetContent>
            </Sheet>
            <Progress value={overallProgress} className="w-24 hidden sm:block" />
            <span className="text-sm text-muted-foreground hidden sm:inline">{t('course_player.progress_complete', { percent: Math.round(overallProgress) })}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Player + Content Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Player or Quiz */}
          {currentLesson.type === 'quiz' ? (
            <div className="bg-muted/50 p-6 overflow-y-auto flex-shrink-0">
              <QuizPlayer
                quiz={{ id: currentLessonId!, title: currentLesson.title, questions: [] }}
                lessonId={currentLessonId!}
                enrollmentId={course.user_enrollment?.enrollment_id}
                savedProgress={quizProgress[currentLessonId!]?.answers}
                onProgressChange={(answers) => {
                  setQuizProgress(prev => ({
                    ...prev,
                    [currentLessonId!]: { ...prev[currentLessonId!], answers, lastSaved: new Date().toISOString() }
                  }))
                }}
                onComplete={(score, passed) => {
                  setQuizProgress(prev => ({
                    ...prev,
                    [currentLessonId!]: { ...prev[currentLessonId!], score, passed, completedAt: new Date().toISOString(), lessonId: currentLessonId }
                  }))
                  if (passed) { toast.success(t('course_player.quiz_passed')); handleLessonComplete() }
                }}
                onNext={() => goToNextLesson()}
              />
            </div>
          ) : (
            <div className="flex-shrink-0">
              <VideoPlayer
                key={currentLessonId}
                url={currentLesson.videoUrl || 'https://www.youtube.com/watch?v=qz0aGYrrlhU'}
                title={currentLesson.title}
                lessonId={currentLessonId!}
                onProgress={handleVideoProgress}
                onComplete={() => handleLessonComplete(currentLessonId!)}
                savedProgress={getSavedProgressForLesson(currentLessonId!)}
                completionThresholdPercent={LESSON_COMPLETION_THRESHOLD_PERCENT}
                restrictForwardSeeking={true}
              />
            </div>
          )}

          {/* Course Info Bar */}
          <div className="border-b bg-card p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-medium">{course.title}</h2>
                <p className="text-sm text-muted-foreground">{t('course_player.by_instructor', { name: course.instructor?.full_name || t('course_detail.by_instructor') })}</p>
              </div>
              <Button variant="outline" onClick={() => navigate(`/course/${courseId}`)}>
                {t('course_player.course_overview')}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              <Button variant="outline" onClick={goToPreviousLesson} disabled={!findPrevLesson(curriculum, currentLessonId!)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('course_player.previous_lesson')}
              </Button>
              <div className="text-center min-w-0">
                <p className="text-sm font-medium truncate">{currentLesson.title}</p>
                <p className="text-xs text-muted-foreground">{currentLesson.duration}</p>
              </div>
              <Button
                variant="default"
                onClick={goToNextLesson}
                disabled={!findNextLesson(curriculum, currentLessonId!) || !currentLessonCompleted}
                className="flex-1"
                title={!currentLessonCompleted ? `Cáº§n hoÃ n thÃ nh ${LESSON_COMPLETION_THRESHOLD_PERCENT}% bÃ i hiá»‡n táº¡i` : undefined}
              >
                {t('course_player.next_lesson')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <div className="border-b flex-shrink-0">
                <TabsList className="w-full justify-start h-12 rounded-none bg-transparent">
                  <TabsTrigger value="overview" className="rounded-none">{t('course_player.tab_overview')}</TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-none">{t('course_player.tab_notes')}</TabsTrigger>
                  <TabsTrigger value="comments" className="rounded-none">{t('course_player.tab_comments')}</TabsTrigger>
                  <TabsTrigger value="resources" className="rounded-none">{t('course_player.tab_resources')}</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <TabsContent value="overview" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium mb-2">{t('course_player.about_lesson')}</h3>
                      <p className="text-muted-foreground">{currentLesson.title}</p>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="font-medium mb-4">{t('course_player.course_progress')}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t('course_player.overall_progress')}</span>
                          <span className="text-sm font-medium">{Math.round(overallProgress)}%</span>
                        </div>
                        <Progress value={overallProgress} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{t('course_player.lessons_completed', { completed: completedLessons, total: totalLessons })}</span>
                        </div>
                      </div>
                    </div>
                    {course.description && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-medium mb-2">{t('course_player.about_course')}</h3>
                          <p className="text-muted-foreground text-sm">{course.description}</p>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">{t('course_player.add_note')}</h3>
                      <Textarea placeholder={t('course_player.note_placeholder')} value={newNote} onChange={(e) => setNewNote(e.target.value)} className="mb-2" />
                      <Button size="sm" onClick={handleAddNote}>{t('course_player.save_note')}</Button>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium">{t('course_player.notes_for_lesson')}</h4>
                      {notes.filter(n => n.lessonId === currentLessonId).length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('course_player.no_notes')}</p>
                      ) : (
                        notes.filter(n => n.lessonId === currentLessonId).map((note) => (
                          <div key={note.id} className="p-3 border rounded space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{note.timestamp}</span>
                                <span>â€¢</span>
                                <span>{note.created}</span>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteNote(note.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm">{note.note}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="mt-0">
                   <div className="flex flex-col h-full">
                      <div className="mb-6">
                         <h3 className="font-medium mb-2">{t('course_player.add_comment')}</h3>
                         <div className="flex gap-3">
                           <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                             <Avatar><AvatarFallback>{user?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
                           </div>
                           <div className="flex-1">
                             <Textarea
                               value={newComment}
                               onChange={(e) => setNewComment(e.target.value)}
                               placeholder={t('course_player.comment_placeholder')}
                               className="w-full bg-muted/30 border rounded-md p-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary resize-none mb-2"
                             />
                             <div className="flex justify-end">
                               <Button size="sm" disabled={!newComment.trim()} onClick={handlePostComment}>
                                 {t('course_player.post_comment')}
                               </Button>
                             </div>
                           </div>
                         </div>
                      </div>
                      <Separator className="mb-6" />
                      <div className="space-y-6">
                        <h4 className="font-medium">{t('course_player.recent_comments')}</h4>
                        {commentsLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">{t('course_player.loading_comments')}</span>
                          </div>
                        ) : comments.length > 0 ? (
                          comments.map((comment) => (
                            <CommentItem
                              key={comment.id}
                              comment={comment}
                              replyingTo={replyingTo}
                              setReplyingTo={setReplyingTo}
                              onPostReply={handlePostReply}
                              onEditComment={handleEditComment}
                              onDeleteComment={handleDeleteComment}
                              currentUser={user?.username || t('course_player.you')}
                            />
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-10 border rounded-lg border-dashed">
                            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>{t('course_player.no_comments')}</p>
                          </div>
                        )}
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="resources" className="mt-0">
                  <div className="space-y-4">
                    <h3 className="font-medium">{t('course_player.lesson_resources')}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 cursor-pointer transition-colors">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{t('course_player.course_slides')}</p>
                          <p className="text-xs text-muted-foreground">PDF â€¢ Available soon</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadResource('Course Slides')}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Right: Desktop Sidebar - Course Content (Collapsible) */}
        <motion.div
          initial={false}
          animate={{ width: isCurriculumCollapsed ? '3rem' : '24rem' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="hidden lg:block relative border-l bg-card flex-shrink-0"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCurriculumCollapsed(!isCurriculumCollapsed)}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border bg-background p-0 shadow-md hover:shadow-lg transition-all"
          >
            {isCurriculumCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
          </Button>

          <AnimatePresence mode="wait">
            {isCurriculumCollapsed ? (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsCurriculumCollapsed(false)}
                className="flex flex-col items-center justify-start h-full pt-6 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="text-center space-y-4">
                  <div className="text-2xl font-bold">{curriculum.reduce((acc, s) => acc + s.lectures, 0)}</div>
                  <div className="h-32" />
                  <p className="rotate-90 text-xl font-bold tracking-wider whitespace-nowrap mt-16">{t('course_player.lessons_label')}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <CurriculumSidebar />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

