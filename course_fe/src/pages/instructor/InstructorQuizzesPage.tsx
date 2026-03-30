import { useState, useCallback, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, FileQuestion, GripVertical } from 'lucide-react'
import { useRouter } from "../../components/Router"
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DraggableQuestionCard } from "../../components/QuizQuestionDragDrop"
import { QuestionWizard, type QuizQuestion } from "../../components/QuestionWizard"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { UserPagination } from "../../components/UserPagination"
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { getMyInstructorProfile } from '../../services/instructor.api'
import { getLessons, createLesson, updateLesson as updateLessonApi, deleteLesson as deleteLessonApi } from '../../services/lessons.api'
import { getQuestionsByLesson, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion } from '../../services/quiz-questions.api'
import { getAllCourseModules } from '../../services/course-modules.api'
import { getAllCourses } from '../../services/course.api'
import { useTranslation } from 'react-i18next'

interface Quiz {
  id: string
  title: string
  description: string
  courseId: string
  sectionId: string
  passingScore: number
  timeLimit?: number
  questions: QuizQuestion[]
  isPublished: boolean
  attempts: number
  totalTakers: number
  avgScore: number
  createdAt: string
}

const ITEMS_PER_PAGE = 8

// Quiz data is now fetched from API — quiz lessons + their questions

// Adapter: map BE lesson + questions → FE Quiz
function lessonToQuiz(lesson: any, questions: QuizQuestion[]): Quiz {
  let meta: any = {}
  if (lesson.content) {
    try { meta = JSON.parse(lesson.content) } catch { /* not JSON */ }
  }
  return {
    id: String(lesson.id),
    title: lesson.title,
    description: lesson.description || '',
    courseId: String(lesson.coursemodule),
    sectionId: String(lesson.coursemodule),
    passingScore: meta.passingScore ?? 70,
    timeLimit: meta.timeLimit ?? 30,
    questions,
    isPublished: lesson.status === 'published',
    attempts: meta.attempts ?? 0,
    totalTakers: meta.totalTakers ?? 0,
    avgScore: meta.avgScore ?? 0,
    createdAt: lesson.created_at || new Date().toISOString(),
  }
}

// Adapter: map BE QuizQuestion → FE QuizQuestion 
function apiQuestionToFE(q: any): QuizQuestion {
  let correctAnswer: string | string[] = q.correct_answer || ''
  try {
    const parsed = JSON.parse(q.correct_answer)
    if (Array.isArray(parsed)) correctAnswer = parsed
  } catch { /* string answer */ }
  
  return {
    id: String(q.id),
    question: q.question_text || '',
    type: q.question_type === 'multiple_choice' ? 'multiple' : 'single',
    options: Array.isArray(q.options) ? q.options.map((o: any) => typeof o === 'string' ? o : (o.text || o.value || JSON.stringify(o))) : [],
    correctAnswer,
    points: q.points || 10,
    explanation: q.explanation || '',
    order: q.order_number ?? q.order ?? 1,
    code: q.starter_code || undefined,
    codeLanguage: undefined,
  }
}

export function InstructorQuizzesPage() {
  const { navigate } = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [instructorId, setInstructorId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Quiz Dialog State
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [timeLimit, setTimeLimit] = useState<number | undefined>(30)

  // Question Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)

  // Cache the first coursemodule id for creating new quizzes
  const [defaultModuleId, setDefaultModuleId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Debounce search to avoid refetching every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, sortBy])

  // Resolve instructor profile + default module for creating quizzes
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function bootstrapInstructorData() {
      try {
        const profile = await getMyInstructorProfile(user!.id)
        if (cancelled) return
        setInstructorId(profile.id)

        const courses = await getAllCourses({ instructor_id: profile.id })
        if (cancelled) return
        if (courses.length > 0) {
          const modules = await getAllCourseModules(courses[0].id)
          if (cancelled) return
          if (modules.length > 0) setDefaultModuleId(modules[0].id)
        }
      } catch (err) {
        console.error('Failed to initialize quiz page:', err)
      }
    }
    bootstrapInstructorData()
    return () => { cancelled = true }
  }, [user?.id])

  // Fetch paginated quizzes using server-side filters
  useEffect(() => {
    if (!instructorId) return
    let cancelled = false

    async function fetchQuizzesPage() {
      try {
        setIsLoading(true)
        const status = statusFilter === 'all' ? undefined : statusFilter
        const ordering = sortBy === 'title' ? 'title' : '-created_at'

        const res = await getLessons({
          content_type: 'quiz',
          instructor_id: instructorId,
          status: status as any,
          search: debouncedSearch || undefined,
          ordering,
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
        })
        if (cancelled) return

        const quizData = await Promise.all(
          res.results.map(async (lesson) => {
            try {
              const apiQuestions = await getQuestionsByLesson(lesson.id)
              return lessonToQuiz(lesson, apiQuestions.map(apiQuestionToFE))
            } catch {
              return lessonToQuiz(lesson, [])
            }
          })
        )
        if (cancelled) return

        const normalized = sortBy === 'questions'
          ? [...quizData].sort((a, b) => b.questions.length - a.questions.length)
          : quizData
        setQuizzes(normalized)
        setTotalCount(res.count || 0)
        setTotalPages(Math.max(1, res.total_pages || Math.ceil((res.count || 0) / ITEMS_PER_PAGE)))
      } catch (err) {
        console.error('Failed to load quizzes:', err)
        if (!cancelled) {
          setQuizzes([])
          setTotalCount(0)
          setTotalPages(1)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchQuizzesPage()
    return () => { cancelled = true }
  }, [instructorId, currentPage, debouncedSearch, statusFilter, sortBy, refreshKey])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleCreateQuiz = async () => {
    if (!defaultModuleId) {
      toast.error(t('instructor_quizzes_page.toasts.no_course_module'))
      return
    }
    try {
      const lesson = await createLesson({
        coursemodule: defaultModuleId,
        title: quizTitle,
        description: quizDescription,
        content_type: 'quiz',
        content: JSON.stringify({ passingScore, timeLimit, attempts: 0, totalTakers: 0, avgScore: 0 }),
        order: (currentPage - 1) * ITEMS_PER_PAGE + quizzes.length + 1,
        status: 'draft',
      })
      if (lesson) {
        setCurrentPage(1)
        setRefreshKey((prev) => prev + 1)
      }
      setIsQuizDialogOpen(false)
      resetQuizForm()
      toast.success(t('instructor_quizzes_page.toasts.quiz_created'))
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_quizzes_page.toasts.create_quiz_failed'))
    }
  }

  const handleUpdateQuiz = (quiz: Quiz) => {
    setQuizzes(quizzes.map(q => q.id === quiz.id ? quiz : q))
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm(t('instructor_quizzes_page.confirms.delete_quiz'))) {
      try {
        await deleteLessonApi(Number(quizId))
        setRefreshKey((prev) => prev + 1)
        if (selectedQuiz?.id === quizId) setSelectedQuiz(null)
        toast.success(t('instructor_quizzes_page.toasts.quiz_deleted'))
      } catch (err) {
        console.error(err)
        toast.error(t('instructor_quizzes_page.toasts.delete_quiz_failed'))
      }
    }
  }

  const handlePublishQuiz = async (quizId: string) => {
    try {
      const quiz = quizzes.find(q => q.id === quizId)
      const newStatus = quiz?.isPublished ? 'draft' : 'published'
      await updateLessonApi(Number(quizId), { status: newStatus as any })
      setRefreshKey((prev) => prev + 1)
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(prev => prev ? { ...prev, isPublished: !prev.isPublished } : null)
      }
      toast.success(
        newStatus === 'published'
          ? t('instructor_quizzes_page.toasts.quiz_published')
          : t('instructor_quizzes_page.toasts.quiz_unpublished')
      )
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_quizzes_page.toasts.update_status_failed'))
    }
  }

  const handleSaveQuestion = async (question: QuizQuestion) => {
    if (!selectedQuiz) return

    try {
      const lessonId = Number(selectedQuiz.id)
      const isExisting = selectedQuiz.questions.some(q => q.id === question.id)

      // Map FE question → BE data
      const apiData = {
        lesson: lessonId,
        question_text: question.question,
        question_type: question.type === 'multiple' ? 'multiple' as const : 'multiple' as const, // BE uses 'multiple' for both
        options: question.options.map(o => ({ text: o })),
        correct_answer: Array.isArray(question.correctAnswer) ? JSON.stringify(question.correctAnswer) : question.correctAnswer,
        points: question.points,
        explanation: question.explanation,
        order_number: question.order,
        starter_code: question.code || undefined,
      }

      let savedQuestion: any
      if (isExisting && question.id) {
        savedQuestion = await updateQuizQuestion(Number(question.id), apiData)
      } else {
        savedQuestion = await createQuizQuestion(apiData)
      }

      const feQuestion = apiQuestionToFE(savedQuestion)

      let updatedQuestions = [...selectedQuiz.questions]
      const existingIndex = updatedQuestions.findIndex(q => q.id === question.id)

      if (existingIndex >= 0) {
        updatedQuestions[existingIndex] = feQuestion
      } else {
        updatedQuestions.push(feQuestion)
      }

      updatedQuestions.sort((a, b) => a.order - b.order)

      const updatedQuiz = { ...selectedQuiz, questions: updatedQuestions }
      handleUpdateQuiz(updatedQuiz)
      setSelectedQuiz(updatedQuiz)
      setEditingQuestion(null)
      toast.success(t('instructor_quizzes_page.toasts.question_saved'))
    } catch (err) {
      console.error(err)
      toast.error(t('instructor_quizzes_page.toasts.save_question_failed'))
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedQuiz) return
    if (confirm(t('instructor_quizzes_page.confirms.delete_question'))) {
      try {
        await deleteQuizQuestion(Number(questionId))
        const updatedQuiz = {
          ...selectedQuiz,
          questions: selectedQuiz.questions.filter(q => q.id !== questionId).map((q, index) => ({
            ...q,
            order: index + 1
          }))
        }
        handleUpdateQuiz(updatedQuiz)
        setSelectedQuiz(updatedQuiz)
        toast.success(t('instructor_quizzes_page.toasts.question_deleted'))
      } catch (err) {
        console.error(err)
        toast.error(t('instructor_quizzes_page.toasts.delete_question_failed'))
      }
    }
  }

  const moveQuestion = useCallback((dragIndex: number, hoverIndex: number) => {
    if (!selectedQuiz) return
    
    const dragQuestion = selectedQuiz.questions[dragIndex]
    const newQuestions = [...selectedQuiz.questions]
    newQuestions.splice(dragIndex, 1)
    newQuestions.splice(hoverIndex, 0, dragQuestion)
    
    // Update order
    const reorderedQuestions = newQuestions.map((q, index) => ({
      ...q,
      order: index + 1
    }))
    
    const updatedQuiz = {
      ...selectedQuiz,
      questions: reorderedQuestions
    }
    
    // Update in quizzes state
    setQuizzes(prev => prev.map(q => q.id === updatedQuiz.id ? updatedQuiz : q))
    setSelectedQuiz(updatedQuiz)
  }, [selectedQuiz])

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question)
    setIsWizardOpen(true)
  }

  const handleAddNewQuestion = () => {
    setEditingQuestion(null)
    setIsWizardOpen(true)
  }

  const resetQuizForm = () => {
    setQuizTitle('')
    setQuizDescription('')
    setPassingScore(70)
    setTimeLimit(30)
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2">{t('instructor_quizzes_page.title')}</h1>
              <p className="text-muted-foreground">{t('instructor_quizzes_page.subtitle')}</p>
            </div>
            <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetQuizForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('instructor_quizzes_page.actions.create_quiz')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('instructor_quizzes_page.dialogs.create_title')}</DialogTitle>
                  <DialogDescription>{t('instructor_quizzes_page.dialogs.create_description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quiz-title">{t('instructor_quizzes_page.form.quiz_title')}</Label>
                    <Input
                      id="quiz-title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder={t('instructor_quizzes_page.form.quiz_title_placeholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiz-description">{t('instructor_quizzes_page.form.description')}</Label>
                    <Textarea
                      id="quiz-description"
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                      placeholder={t('instructor_quizzes_page.form.description_placeholder')}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passing-score">{t('instructor_quizzes_page.form.passing_score')}</Label>
                      <Input
                        id="passing-score"
                        type="number"
                        min="0"
                        max="100"
                        value={passingScore}
                        onChange={(e) => setPassingScore(parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="time-limit">{t('instructor_quizzes_page.form.time_limit')}</Label>
                      <Input
                        id="time-limit"
                        type="number"
                        min="0"
                        value={timeLimit || ''}
                        onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder={t('instructor_quizzes_page.form.no_limit')}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsQuizDialogOpen(false)}>{t('instructor_quizzes_page.actions.cancel')}</Button>
                  <Button onClick={handleCreateQuiz} disabled={!quizTitle}>{t('instructor_quizzes_page.actions.create_quiz')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quizzes List */}
        {selectedQuiz ? (
          // Quiz Detail View
          <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedQuiz.title}</CardTitle>
                    <CardDescription>{selectedQuiz.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedQuiz(null)}>
                      {t('instructor_quizzes_page.actions.back_to_list')}
                    </Button>
                    <Button
                      variant={selectedQuiz.isPublished ? "destructive" : "default"}
                      onClick={() => handlePublishQuiz(selectedQuiz.id)}
                    >
                      {selectedQuiz.isPublished ? t('instructor_quizzes_page.actions.unpublish') : t('instructor_quizzes_page.actions.publish')}
                    </Button>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quiz Settings */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('instructor_quizzes_page.metrics.passing_score')}</p>
                    <p className="font-semibold">{selectedQuiz.passingScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('instructor_quizzes_page.metrics.time_limit')}</p>
                    <p className="font-semibold">{selectedQuiz.timeLimit ? t('instructor_quizzes_page.metrics.time_limit_value', { count: selectedQuiz.timeLimit }) : t('instructor_quizzes_page.form.no_limit')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('instructor_quizzes_page.metrics.total_questions')}</p>
                    <p className="font-semibold">{selectedQuiz.questions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('instructor_quizzes_page.metrics.total_points')}</p>
                    <p className="font-semibold">{selectedQuiz.questions.reduce((sum, q) => sum + q.points, 0)}</p>
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t('instructor_quizzes_page.questions.title')}</h3>
                    <Button onClick={handleAddNewQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('instructor_quizzes_page.questions.add_question')}
                    </Button>
                  </div>

                  {selectedQuiz.questions.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg border-dashed">
                      <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t('instructor_quizzes_page.questions.empty')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-sm">
                        <GripVertical className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 dark:text-blue-300">{t('instructor_quizzes_page.questions.reorder_hint')}</span>
                      </div>
                      {selectedQuiz.questions.map((question, index) => (
                        <DraggableQuestionCard
                          key={question.id}
                          question={question}
                          index={index}
                          moveQuestion={moveQuestion}
                          onEdit={handleEditQuestion}
                          onDelete={handleDeleteQuestion}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Quizzes List
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('instructor_quizzes_page.filters.search_placeholder')}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('instructor_quizzes_page.filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('instructor_quizzes_page.filters.all_status')}</SelectItem>
                  <SelectItem value="published">{t('instructor_quizzes_page.status.published')}</SelectItem>
                  <SelectItem value="draft">{t('instructor_quizzes_page.status.draft')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder={t('instructor_quizzes_page.filters.sort_by')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('instructor_quizzes_page.sort.newest')}</SelectItem>
                  <SelectItem value="questions">{t('instructor_quizzes_page.sort.most_questions')}</SelectItem>
                  <SelectItem value="title">{t('instructor_quizzes_page.sort.title_az')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  {t('instructor_quizzes_page.loading')}
                </CardContent>
              </Card>
            ) : quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => setSelectedQuiz(quiz)}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{quiz.title}</h3>
                        <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                          {quiz.isPublished ? t('instructor_quizzes_page.status.published') : t('instructor_quizzes_page.status.draft')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{quiz.description}</p>
                      
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t('instructor_quizzes_page.metrics.questions')}</p>
                          <p className="font-medium">{quiz.questions.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('instructor_quizzes_page.metrics.passing_score')}</p>
                          <p className="font-medium">{quiz.passingScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('instructor_quizzes_page.metrics.attempts')}</p>
                          <p className="font-medium">{quiz.attempts}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('instructor_quizzes_page.metrics.avg_score')}</p>
                          <p className="font-medium">{quiz.avgScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('instructor_quizzes_page.metrics.created')}</p>
                          <p className="font-medium">{quiz.createdAt}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="icon" onClick={() => setSelectedQuiz(quiz)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteQuiz(quiz.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!isLoading && totalCount === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">{t('instructor_quizzes_page.empty.title')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {debouncedSearch ? t('instructor_quizzes_page.empty.search_description') : t('instructor_quizzes_page.empty.default_description')}
                  </p>
                  <Button onClick={() => setIsQuizDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('instructor_quizzes_page.empty.create_first_quiz')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {totalCount > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-3">
                  {t('instructor_quizzes_page.pagination.showing', {
                    from: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount),
                    to: Math.min((currentPage - 1) * ITEMS_PER_PAGE + quizzes.length, totalCount),
                    total: totalCount,
                  })}
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

        {/* Question Wizard Dialog */}
        <QuestionWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSave={handleSaveQuestion}
          initialQuestion={editingQuestion}
          questionOrder={selectedQuiz ? selectedQuiz.questions.length + 1 : 1}
        />
      </div>
    </DndProvider>
  )
}
