import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './AntdCompat'
import {
  Monitor,
  Smartphone,
  Tablet,
  X,
  Lock,
  BookOpen,
  Loader2,
  MessageSquare,
  User,
} from 'lucide-react'
import { VideoPlayerPreview } from './VideoPlayerPreview'
import { QuizPlayer, type Quiz, type QuizQuestion } from './QuizPlayer'
import { cn } from './AntdCompat'
import { useState, useEffect } from 'react'
import { CommentItem } from './CommentItem'
import { useTranslation } from 'react-i18next'
import { getLessonComments, getAllReplies, createLessonComment, formatCommentDate } from '../services/lesson-comments.api'
import { useAuthStore } from '../stores/auth.store'
import { getLessonQuiz } from '../services/quiz-questions.api'
import { mapLessonQuizQuestion } from '../lib/quizMapping'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
  is_free?: boolean
  description?: string
  videoUrl?: string
  content?: string
}

interface LessonPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: Lesson
  // When true the modal is shown to public visitors (course landing page):
  // hide instructor-only preview controls and disable comment posting.
  isPublic?: boolean
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'
type ViewMode = 'free' | 'enrolled'

function stringifyStarterCode(starterCode: unknown): string | undefined {
  if (!starterCode) return undefined
  if (typeof starterCode === 'string') return starterCode
  try {
    return JSON.stringify(starterCode)
  } catch {
    return undefined
  }
}

function buildCodePreviewQuiz(lesson: Lesson, quizData: any): Quiz | null {
  if (!quizData) return null

  const description = quizData.problemStatement?.description || quizData.description || lesson.description || ''
  const questionTitle = quizData.title || lesson.title
  const allowedLanguages = Array.isArray(quizData.allowedLanguages) && quizData.allowedLanguages.length > 0
    ? quizData.allowedLanguages
    : [63]

  return {
    id: lesson.id,
    title: questionTitle,
    description,
    passingScore: quizData.passingScore || 70,
    timeLimit: quizData.timeLimit ? Math.ceil(Number(quizData.timeLimit) / 60) : undefined,
    questions: [{
      id: lesson.id,
      question: questionTitle,
      type: 'code',
      points: quizData.points || 100,
      requireCompletion: false,
      codeQuestion: {
        id: lesson.id,
        question: questionTitle,
        description,
        type: 'code',
        allowedLanguages,
        starterCode: stringifyStarterCode(quizData.starterCode),
        functionName: quizData.functionName || undefined,
        executionMode: quizData.executionMode || (quizData.functionName ? 'function' : 'stdin'),
        timeLimit: quizData.timeLimit || undefined,
        memoryLimit: quizData.memoryLimit || undefined,
        difficulty: quizData.learningObjectives?.difficulty || 'medium',
        points: quizData.points || 100,
        hints: Array.isArray(quizData.hints)
          ? quizData.hints.map((hint: any) => typeof hint === 'string' ? hint : hint?.content).filter(Boolean)
          : undefined,
        testCases: (quizData.testCases || []).map((testCase: any, index: number) => ({
          id: testCase.id || index + 1,
          input: testCase.input ?? testCase.input_data ?? '',
          expectedOutput: testCase.expectedOutput ?? testCase.expected_output ?? '',
          isHidden: Boolean(testCase.isHidden ?? testCase.is_hidden),
          points: testCase.points,
        })),
      },
    }],
  }
}

function buildLocalQuizPreview(lesson: Lesson, contentType: string): Quiz | null {
  const quizData = (lesson as any).quizData
  if (!quizData) return null
  if (contentType === 'code') return buildCodePreviewQuiz(lesson, quizData)

  const questions: QuizQuestion[] = Array.isArray(quizData.questions)
    ? quizData.questions.map((question: any, index: number): QuizQuestion => {
        if (question.type === 'code') {
          const codeQuiz = buildCodePreviewQuiz(lesson, {
            title: question.question || quizData.title || lesson.title,
            description: question.explanation || quizData.description,
            starterCode: question.codeStarter,
            functionName: question.functionName,
            allowedLanguages: question.allowedLanguages,
            timeLimit: question.timeLimit,
            memoryLimit: question.memoryLimit,
            points: question.points,
            testCases: question.testCases,
          })
          return codeQuiz?.questions[0] || {
            id: question.id || index + 1,
            question: question.question || '',
            type: 'single',
            options: [],
            correctAnswer: 0,
          }
        }

        if (question.type === 'true-false') {
          return {
            id: question.id || index + 1,
            question: question.question || '',
            type: 'single',
            options: ['True', 'False'],
            correctAnswer: String(question.correctAnswer).toLowerCase() === 'false' ? 1 : 0,
            explanation: question.explanation || undefined,
            points: question.points,
          }
        }

        return {
          id: question.id || index + 1,
          question: question.question || '',
          type: 'single',
          options: Array.isArray(question.options) ? question.options : [],
          correctAnswer: Number(question.correctAnswer) || 0,
          explanation: question.explanation || undefined,
          points: question.points,
        }
      })
    : []

  return {
    id: lesson.id,
    title: quizData.title || lesson.title,
    description: quizData.description || lesson.description || undefined,
    passingScore: quizData.passingScore || 70,
    timeLimit: quizData.timeLimit || undefined,
    questions,
  }
}

export function LessonPreviewModal({
  open,
  onOpenChange,
  lesson,
  isPublic = false
}: LessonPreviewModalProps) {
  const { t } = useTranslation()
  const currentUser = useAuthStore(s => s.user)
  const [device, setDevice] = useState<DeviceType>('desktop')
  const [viewMode, setViewMode] = useState<ViewMode>('enrolled')
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null)
  const [previewQuizLoading, setPreviewQuizLoading] = useState(false)

  const [comments, setComments] = useState<any[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !lesson?.id) return
    const fetchComments = async () => {
      setIsLoadingComments(true)
      try {
        const rootData = await getLessonComments(lesson.id, { page_size: 50 })
        const roots = rootData.results
        const rootsWithReplies = await Promise.all(
          roots.map(async (root) => {
            const replies = await getAllReplies(root.id)
            return { ...root, fetchedReplies: replies }
          })
        )
        const mapComment = (c: any, replyList: any[] = []) => ({
          id: c.id,
          user: c.user_full_name || `User ${c.user}`,
          avatar: c.user_avatar || (c.user_full_name || 'U')[0].toUpperCase(),
          date: formatCommentDate(c.created_at),
          content: c.content,
          likes: c.votes,
          parentId: c.parent_comment,
          replies: replyList.map((r: any) => mapComment(r))
        })
        setComments(rootsWithReplies.map(root => mapComment(root, root.fetchedReplies)))
      } catch {
        // fail silently
      } finally {
        setIsLoadingComments(false)
      }
    }
    fetchComments()
  }, [open, lesson?.id, commentsRefreshKey])


  const contentType = lesson.content_type || lesson.type

  useEffect(() => {
    if (!open || !lesson?.id || !['quiz', 'code'].includes(contentType)) {
      setPreviewQuiz(null)
      setPreviewQuizLoading(false)
      return
    }

    const localPreview = buildLocalQuizPreview(lesson, contentType)
    if (localPreview?.questions.length) {
      setPreviewQuiz(localPreview)
      setPreviewQuizLoading(false)
      return
    }

    let cancelled = false
    setPreviewQuiz(null)
    setPreviewQuizLoading(true)

    getLessonQuiz(lesson.id)
      .then((quiz) => {
        if (cancelled) return
        setPreviewQuiz({
          id: quiz.quiz_id,
          title: quiz.title || lesson.title,
          description: quiz.description,
          passingScore: quiz.passing_score,
          timeLimit: quiz.time_limit ? Math.ceil(quiz.time_limit / 60) : undefined,
          questions: quiz.questions.map(mapLessonQuizQuestion),
        })
      })
      .catch(() => {
        if (!cancelled) setPreviewQuiz(localPreview)
      })
      .finally(() => {
        if (!cancelled) setPreviewQuizLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, lesson, lesson?.id, lesson?.title, contentType])

  const deviceSizes = {
    desktop: 'sm:max-w-[95vw] w-[95vw]',
    tablet: 'sm:max-w-3xl',
    mobile: 'sm:max-w-md'
  }

  const handlePostComment = async () => {
     if (!newComment.trim()) return
     try {
       await createLessonComment({ lesson: lesson.id, content: newComment })
       setNewComment('')
       setCommentsRefreshKey(k => k + 1)
     } catch {
       // fail silently
     }
  }

  const handlePostReply = async (parentId: number, content: string) => {
     if (!content.trim()) return
     try {
       await createLessonComment({ lesson: lesson.id, content, parent_comment: parentId })
       setReplyingTo(null)
       setCommentsRefreshKey(k => k + 1)
     } catch {
       // fail silently
     }
  }

  const renderPreview = () => {
    if (viewMode === 'free' && !lesson.is_free) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="bg-muted rounded-full p-6 mb-6">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('lesson_preview_modal.locked_title')}</h3>
          <p className="text-muted-foreground mb-6">
            {t('lesson_preview_modal.locked_description')}
          </p>
          <Button>{t('lesson_preview_modal.enroll_now')}</Button>
        </div>
      )
    }

    switch (contentType) {
      case 'video':
        return (
          <div className={cn(
            "flex h-[600px] border rounded-lg overflow-hidden bg-background shadow-sm",
            device === 'desktop' ? "flex-row" : "flex-col h-auto min-h-[600px]"
          )}>

             <div className={cn(
               "bg-black flex items-center justify-center relative",
               device === 'desktop' ? "w-2/3 h-full" : "w-full aspect-video"
             )}>
               <VideoPlayerPreview
                 videoUrl={lesson.videoUrl}
                 title={lesson.title}
                 duration={lesson.duration}
                 className="w-full h-full border-0 rounded-none"
               />
             </div>


             <div className={cn(
               "flex flex-col border-l bg-background",
               device === 'desktop' ? "w-1/3 h-full" : "w-full flex-1 h-[400px]"
             )}>
                <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full">
                   <div className="border-b px-4 bg-muted/5">
                     <TabsList className="w-full justify-start bg-transparent p-0 h-11">
                       <TabsTrigger
                         value="overview"
                         className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-11"
                       >
                         {t('lesson_preview_modal.tabs.overview')}
                       </TabsTrigger>
                       <TabsTrigger
                         value="comments"
                         className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-11"
                       >
                         {t('lesson_preview_modal.tabs.comments')}
                       </TabsTrigger>
                       <TabsTrigger
                         value="notes"
                         className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-11"
                       >
                         {t('lesson_preview_modal.tabs.notes')}
                       </TabsTrigger>
                     </TabsList>
                   </div>

                   <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 m-0">
                      <h3 className="font-bold text-xl mb-3">{lesson.title}</h3>
                      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="rounded-sm">{t('lesson_preview_modal.video_badge')}</Badge>
                        <span>{lesson.duration}</span>
                        <span>•</span>
                        <span>{t('lesson_preview_modal.last_updated')}</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                        <p>{lesson.description || t('lesson_preview_modal.no_description')}</p>
                        {lesson.content && (
                          <p className="whitespace-pre-line">{lesson.content}</p>
                        )}
                      </div>
                   </TabsContent>

                   <TabsContent value="comments" className="flex-1 overflow-hidden m-0 h-full">
                      <div className="flex flex-col h-full bg-background">

                        {!isPublic && (
                        <div className="p-4 border-b">
                           <div className="flex gap-3">
                             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                               <User className="h-4 w-4" />
                             </div>
                             <div className="flex-1">
                               <textarea
                                 value={newComment}
                                 onChange={(e) => setNewComment(e.target.value)}
                                 placeholder={t('lesson_preview_modal.comment_placeholder')}
                                 className="w-full bg-muted/30 border rounded-md p-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                               />
                               <div className="flex justify-end mt-2">
                                 <Button
                                   size="sm"
                                   disabled={!newComment.trim()}
                                   onClick={handlePostComment}
                                 >
                                   {t('lesson_preview_modal.post_comment')}
                                 </Button>
                               </div>
                             </div>
                           </div>
                        </div>
                        )}


                        <div className="flex-1 overflow-y-auto p-4">
                          {isLoadingComments ? (
                            <div className="flex justify-center py-10">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : comments.length > 0 ? (
                            comments.map((comment) => (
                              <CommentItem
                                key={comment.id}
                                comment={comment}
                                replyingTo={replyingTo}
                                setReplyingTo={setReplyingTo}
                                onPostReply={handlePostReply}
                                currentUser={currentUser?.name}
                                readOnly={isPublic}
                              />
                            ))
                          ) : (
                            <div className="text-center text-muted-foreground py-10">
                              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                              <p>{t('lesson_preview_modal.no_comments')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="notes" className="flex-1 overflow-y-auto p-6 m-0 flex flex-col items-center justify-center text-center text-muted-foreground">
                      <div className="bg-muted p-4 rounded-full mb-3">
                         <BookOpen className="h-6 w-6" />
                      </div>
                      <p>{t('lesson_preview_modal.notes_description')}</p>
                      <Button variant="outline" size="sm" className="mt-4">{t('lesson_preview_modal.start_taking_notes')}</Button>
                   </TabsContent>
                </Tabs>
             </div>
          </div>
        )

      case 'quiz':
      case 'code':
        if (previewQuizLoading) {
          return (
            <div className="min-h-[360px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )
        }

        return previewQuiz ? (
          <QuizPlayer
            key={`${contentType}-${lesson.id}`}
            quiz={previewQuiz}
            lessonId={lesson.id}
          />
        ) : (
          <div className="min-h-[240px] flex items-center justify-center rounded-lg border bg-card p-6 text-center text-muted-foreground">
            {t('quiz_preview.no_questions')}
          </div>
        )

      default:
        return <div>{t('lesson_preview_modal.unsupported_content_type')}</div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} closable={false} className={cn("p-0 gap-0 overflow-hidden", deviceSizes[device])}>
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/50">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm font-medium">{t('lesson_preview_modal.title')}</DialogTitle>
          </div>

          {!isPublic && (
          <div className="flex items-center gap-2 bg-background border rounded-md p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={cn("p-1.5 rounded-sm transition-colors", device === 'desktop' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title={t('lesson_preview_modal.desktop_view')}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={cn("p-1.5 rounded-sm transition-colors", device === 'tablet' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title={t('lesson_preview_modal.tablet_view')}
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={cn("p-1.5 rounded-sm transition-colors", device === 'mobile' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title={t('lesson_preview_modal.mobile_view')}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
          )}

          <div className="flex items-center gap-2">
             {!isPublic && (
             <div className="flex items-center bg-background border rounded-md px-1 h-8">
               <button
                 onClick={() => setViewMode('enrolled')}
                 className={cn("text-xs px-2 py-1 rounded-sm transition-colors", viewMode === 'enrolled' ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
               >
                 {t('lesson_preview_modal.enrolled')}
               </button>
               <div className="w-[1px] h-4 bg-border mx-1" />
               <button
                 onClick={() => setViewMode('free')}
                 className={cn("text-xs px-2 py-1 rounded-sm transition-colors", viewMode === 'free' ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
               >
                 {t('lesson_preview_modal.visitor')}
               </button>
             </div>
             )}
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
               <X className="h-4 w-4" />
             </Button>
          </div>
        </div>

        <div className="bg-muted/10 p-6 max-h-[85vh] overflow-y-auto">
           {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
