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
import { toast } from 'sonner@2.0.3'
import { useAuth } from '../../contexts/AuthContext'
import { getMyInstructorProfile } from '../../services/instructor.api'
import { getLessons, createLesson, updateLesson as updateLessonApi, deleteLesson as deleteLessonApi } from '../../services/lessons.api'
import { getQuestionsByLesson, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion } from '../../services/quiz-questions.api'
import { getAllCourseModules } from '../../services/course-modules.api'
import { getAllCourses } from '../../services/course.api'

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
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  
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

  // Fetch quiz-type lessons from API
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function fetchQuizzes() {
      try {
        const profile = await getMyInstructorProfile(user!.id)
        if (cancelled) return

        // Get quiz-type lessons for this instructor
        const res = await getLessons({ content_type: 'quiz', instructor_id: profile.id })
        if (cancelled) return

        // Also get a default module id for creating new quizzes
        const courses = await getAllCourses({ instructor_id: profile.id })
        if (cancelled) return
        if (courses.length > 0) {
          const modules = await getAllCourseModules(courses[0].id)
          if (cancelled) return
          if (modules.length > 0) setDefaultModuleId(modules[0].id)
        }

        // Fetch questions for each quiz lesson
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
        setQuizzes(quizData)
      } catch (err) {
        console.error('Failed to load quizzes:', err)
      }
    }
    fetchQuizzes()
    return () => { cancelled = true }
  }, [user?.id])

  const handleCreateQuiz = async () => {
    if (!defaultModuleId) {
      toast.error('No course module found. Please create a course and section first.')
      return
    }
    try {
      const lesson = await createLesson({
        coursemodule: defaultModuleId,
        title: quizTitle,
        description: quizDescription,
        content_type: 'quiz',
        content: JSON.stringify({ passingScore, timeLimit, attempts: 0, totalTakers: 0, avgScore: 0 }),
        order: quizzes.length + 1,
        status: 'draft',
      })
      const newQuiz = lessonToQuiz(lesson, [])
      setQuizzes([...quizzes, newQuiz])
      setIsQuizDialogOpen(false)
      resetQuizForm()
      toast.success('Quiz created successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to create quiz')
    }
  }

  const handleUpdateQuiz = (quiz: Quiz) => {
    setQuizzes(quizzes.map(q => q.id === quiz.id ? quiz : q))
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      try {
        await deleteLessonApi(Number(quizId))
        setQuizzes(quizzes.filter(q => q.id !== quizId))
        if (selectedQuiz?.id === quizId) setSelectedQuiz(null)
        toast.success('Quiz deleted')
      } catch (err) {
        console.error(err)
        toast.error('Failed to delete quiz')
      }
    }
  }

  const handlePublishQuiz = async (quizId: string) => {
    try {
      const quiz = quizzes.find(q => q.id === quizId)
      const newStatus = quiz?.isPublished ? 'draft' : 'published'
      await updateLessonApi(Number(quizId), { status: newStatus as any })
      setQuizzes(quizzes.map(q => 
        q.id === quizId ? { ...q, isPublished: !q.isPublished } : q
      ))
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(prev => prev ? { ...prev, isPublished: !prev.isPublished } : null)
      }
      toast.success(newStatus === 'published' ? 'Quiz published' : 'Quiz unpublished')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update quiz status')
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
      toast.success('Question saved')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save question')
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedQuiz) return
    if (confirm('Delete this question?')) {
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
        toast.success('Question deleted')
      } catch (err) {
        console.error(err)
        toast.error('Failed to delete question')
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
              <h1 className="mb-2">Quizzes & Assessments</h1>
              <p className="text-muted-foreground">Create and manage quizzes for your courses</p>
            </div>
            <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetQuizForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Quiz</DialogTitle>
                  <DialogDescription>Set up a new quiz for your course</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quiz-title">Quiz Title</Label>
                    <Input
                      id="quiz-title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder="e.g., JavaScript Fundamentals Quiz"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiz-description">Description</Label>
                    <Textarea
                      id="quiz-description"
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                      placeholder="Briefly describe what this quiz covers..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="passing-score">Passing Score (%)</Label>
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
                      <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                      <Input
                        id="time-limit"
                        type="number"
                        min="0"
                        value={timeLimit || ''}
                        onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="No limit"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsQuizDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateQuiz} disabled={!quizTitle}>Create Quiz</Button>
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
                    Back to List
                  </Button>
                  <Button
                    variant={selectedQuiz.isPublished ? "destructive" : "default"}
                    onClick={() => handlePublishQuiz(selectedQuiz.id)}
                  >
                    {selectedQuiz.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quiz Settings */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Passing Score</p>
                    <p className="font-semibold">{selectedQuiz.passingScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Limit</p>
                    <p className="font-semibold">{selectedQuiz.timeLimit ? `${selectedQuiz.timeLimit} min` : 'No limit'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Questions</p>
                    <p className="font-semibold">{selectedQuiz.questions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                    <p className="font-semibold">{selectedQuiz.questions.reduce((sum, q) => sum + q.points, 0)}</p>
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Questions</h3>
                    <Button onClick={handleAddNewQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {selectedQuiz.questions.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg border-dashed">
                      <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No questions yet. Add your first question to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-sm">
                        <GripVertical className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 dark:text-blue-300">Drag and drop questions to reorder them</span>
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
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => setSelectedQuiz(quiz)}>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{quiz.title}</h3>
                        <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                          {quiz.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{quiz.description}</p>
                      
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Questions</p>
                          <p className="font-medium">{quiz.questions.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Passing Score</p>
                          <p className="font-medium">{quiz.passingScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Attempts</p>
                          <p className="font-medium">{quiz.attempts}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Score</p>
                          <p className="font-medium">{quiz.avgScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
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

            {quizzes.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Quizzes Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first quiz to assess student learning</p>
                  <Button onClick={() => setIsQuizDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Quiz
                  </Button>
                </CardContent>
              </Card>
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
