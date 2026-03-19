import { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Loader2, Plus, Trash2, GripVertical, CheckCircle, Circle, HelpCircle, Edit2, X, Save, Code2 } from 'lucide-react'
import { cn } from './ui/utils'
import { toast } from 'sonner'
import {
  createQuizQuestion,
  createTestCase,
  deleteQuizQuestion,
  deleteTestCase,
  getQuestionsByLesson,
  getTestCases,
  updateQuizQuestion,
  updateTestCase,
  type QuizQuestion as ApiQuizQuestion,
  type QuizQuestionCreateData,
} from '../services/quiz-questions.api'

interface LocalTestCase {
  id?: number
  input_data: string
  expected_output: string
  is_hidden: boolean
  points: number
  order_number: number
}

interface QuizQuestion {
  id?: number
  tempId: string
  question: string
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'code'
  options: string[]
  correctAnswer: string
  points: number
  explanation?: string
  order: number
  codeStarter?: string
  timeLimit?: number
  memoryLimit?: number
  allowedLanguages?: number[]
  testCases: LocalTestCase[]
}

interface QuizData {
  title: string
  description: string
  passingScore: number
  questions: QuizQuestion[]
}

interface Lesson {
  id: number
  title: string
  quizData?: QuizData
  questions?: number
}

interface QuizTabProps {
  lesson: Lesson
  onUpdate: (updates: Partial<Lesson>) => void
}

function questionTypeToApi(type: QuizQuestion['type']): ApiQuizQuestion['question_type'] {
  if (type === 'multiple-choice') return 'multiple'
  if (type === 'true-false') return 'truefalse'
  if (type === 'short-answer') return 'short'
  if (type === 'essay') return 'essay'
  return 'code'
}

function apiTypeToLocal(type: ApiQuizQuestion['question_type']): QuizQuestion['type'] {
  if (type === 'multiple') return 'multiple-choice'
  if (type === 'truefalse') return 'true-false'
  if (type === 'short') return 'short-answer'
  if (type === 'essay') return 'essay'
  return 'code'
}

function parseOptions(raw: ApiQuizQuestion['options']): string[] {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw.map((opt: any) => {
    if (typeof opt === 'string') return opt
    if (opt && typeof opt === 'object') return opt.text || opt.value || ''
    return ''
  })
}

function toOptionsPayload(options: string[]): Record<string, string>[] {
  return options
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text }))
}

export function QuizTab({ lesson, onUpdate }: QuizTabProps) {
  const [quizData, setQuizData] = useState<QuizData>(
    lesson.quizData || {
      title: lesson.title,
      description: '',
      passingScore: 70,
      questions: [],
    }
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  const [existingTestCaseIds, setExistingTestCaseIds] = useState<number[]>([])

  const syncQuizData = (next: QuizData) => {
    setQuizData(next)
    onUpdate({
      quizData: next,
      questions: next.questions.length,
    })
  }

  const loadQuestions = async () => {
    setIsLoading(true)
    try {
      const apiQuestions = await getQuestionsByLesson(lesson.id)
      const withTests = await Promise.all(
        apiQuestions.map(async (q, idx) => {
          let tests: LocalTestCase[] = []
          if (q.question_type === 'code') {
            const testCases = q.test_cases?.length ? q.test_cases : await getTestCases(q.id)
            tests = (testCases || []).map((tc) => ({
              id: tc.id,
              input_data: tc.input_data,
              expected_output: tc.expected_output,
              is_hidden: tc.is_hidden,
              points: tc.points || 0,
              order_number: tc.order_number || 1,
            }))
          }
          return {
            id: q.id,
            tempId: `q-${q.id}`,
            question: q.question_text || '',
            type: apiTypeToLocal(q.question_type),
            options: parseOptions(q.options),
            correctAnswer: q.correct_answer || '',
            points: q.points || 1,
            explanation: q.explanation || '',
            order: q.order_number ?? idx + 1,
            codeStarter: q.starter_code || '',
            timeLimit: q.time_limit || undefined,
            memoryLimit: q.memory_limit || undefined,
            allowedLanguages: q.allowed_languages || [],
            testCases: tests,
          } as QuizQuestion
        })
      )
      withTests.sort((a, b) => a.order - b.order)

      syncQuizData({
        title: lesson.quizData?.title || lesson.title,
        description: lesson.quizData?.description || '',
        passingScore: lesson.quizData?.passingScore || 70,
        questions: withTests,
      })
    } catch (error) {
      console.error(error)
      toast.error('Failed to load quiz questions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadQuestions()
  }, [lesson.id])

  const totalPoints = useMemo(() => quizData.questions.reduce((sum, q) => sum + (q.points || 0), 0), [quizData.questions])

  const handleUpdateQuizMeta = (updates: Partial<QuizData>) => {
    syncQuizData({
      ...quizData,
      ...updates,
    })
  }

  const handleAddQuestion = () => {
    const newQuestion: QuizQuestion = {
      tempId: `temp-${Date.now()}`,
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '0',
      points: 1,
      explanation: '',
      order: quizData.questions.length + 1,
      testCases: [
        {
          input_data: '',
          expected_output: '',
          is_hidden: false,
          points: 0,
          order_number: 1,
        },
      ],
    }
    setExistingTestCaseIds([])
    setEditingQuestion(newQuestion)
    setShowQuestionEditor(true)
  }

  const handleEditQuestion = (question: QuizQuestion) => {
    setExistingTestCaseIds((question.testCases || []).map((tc) => tc.id).filter(Boolean) as number[])
    setEditingQuestion({
      ...question,
      options: [...(question.options || [])],
      testCases: [...(question.testCases || [])],
    })
    setShowQuestionEditor(true)
  }

  const validateQuestion = (q: QuizQuestion): string | null => {
    if (!q.question.trim()) return 'Please enter a question'
    if (q.type === 'multiple-choice') {
      const validOptions = q.options.map((o) => o.trim()).filter(Boolean)
      if (validOptions.length < 2) return 'Please provide at least 2 answer options'
    }
    if (q.type === 'code') {
      const validTests = q.testCases.filter((tc) => tc.input_data.trim() || tc.expected_output.trim())
      if (validTests.length === 0) return 'Code question needs at least one test case'
    }
    return null
  }

  const saveCodeTestCases = async (questionId: number, updated: LocalTestCase[]) => {
    const existingById = new Map<number, LocalTestCase>()
    updated.forEach((tc) => {
      if (tc.id) existingById.set(tc.id, tc)
    })

    const removedIds = existingTestCaseIds.filter((id) => !existingById.has(id))
    await Promise.all(removedIds.map((id) => deleteTestCase(id)))

    for (let index = 0; index < updated.length; index++) {
      const tc = updated[index]
      const payload = {
        input_data: tc.input_data,
        expected_output: tc.expected_output,
        is_hidden: tc.is_hidden,
        points: tc.points || 0,
        order_number: index + 1,
      }
      if (tc.id) {
        await updateTestCase(tc.id, payload)
      } else {
        await createTestCase({
          question: questionId,
          ...payload,
        })
      }
    }
  }

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return
    const validationError = validateQuestion(editingQuestion)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsSavingQuestion(true)
    try {
      const questionPayload: QuizQuestionCreateData = {
        lesson: lesson.id,
        question_text: editingQuestion.question,
        question_type: questionTypeToApi(editingQuestion.type),
        difficulty: 'medium',
        options: editingQuestion.type === 'multiple-choice' ? toOptionsPayload(editingQuestion.options) : null,
        correct_answer: editingQuestion.correctAnswer,
        points: editingQuestion.points,
        explanation: editingQuestion.explanation || '',
        order_number: editingQuestion.order,
        description: editingQuestion.type === 'code' ? (editingQuestion.explanation || '') : undefined,
        time_limit: editingQuestion.type === 'code' ? editingQuestion.timeLimit : undefined,
        memory_limit: editingQuestion.type === 'code' ? editingQuestion.memoryLimit : undefined,
        allowed_languages: editingQuestion.type === 'code' ? (editingQuestion.allowedLanguages || [63]) : undefined,
        starter_code: editingQuestion.type === 'code' ? (editingQuestion.codeStarter || '') : undefined,
      }

      let savedQuestion: ApiQuizQuestion
      if (editingQuestion.id) {
        savedQuestion = await updateQuizQuestion(editingQuestion.id, questionPayload)
      } else {
        savedQuestion = await createQuizQuestion(questionPayload)
      }

      if (editingQuestion.type === 'code') {
        await saveCodeTestCases(savedQuestion.id, editingQuestion.testCases || [])
      }

      await loadQuestions()
      setEditingQuestion(null)
      setShowQuestionEditor(false)
      toast.success('Question saved')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save question')
    } finally {
      setIsSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (id?: number) => {
    if (!id) return
    try {
      await deleteQuizQuestion(id)
      await loadQuestions()
      toast.success('Question deleted')
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete question')
    }
  }

  const handleQuestionUpdate = (updates: Partial<QuizQuestion>) => {
    if (!editingQuestion) return
    setEditingQuestion({ ...editingQuestion, ...updates })
  }

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!showQuestionEditor && (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input id="quiz-title" value={quizData.title} onChange={(e) => handleUpdateQuizMeta({ title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiz-description">Description</Label>
              <Textarea id="quiz-description" value={quizData.description} onChange={(e) => handleUpdateQuizMeta({ description: e.target.value })} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passing-score">Passing Score (%)</Label>
              <Input
                id="passing-score"
                type="number"
                min="0"
                max="100"
                value={quizData.passingScore}
                onChange={(e) => handleUpdateQuizMeta({ passingScore: parseInt(e.target.value) || 70 })}
              />
            </div>
          </div>

          <Card className="p-4 bg-muted/30">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{quizData.questions.length}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPoints}</p>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{quizData.passingScore}%</p>
                <p className="text-xs text-muted-foreground">Passing</p>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Questions</Label>
              <Button size="sm" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {quizData.questions.length === 0 ? (
              <Card className="p-8 bg-muted/30">
                <div className="text-center text-muted-foreground">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No questions yet</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {quizData.questions.map((question, index) => (
                  <Card key={question.id || question.tempId} className="p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                Q{index + 1}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {question.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {question.points} pts
                              </Badge>
                            </div>
                            <p className="font-medium text-sm">{question.question || 'Untitled Question'}</p>
                          </div>
                        </div>

                        {question.type === 'multiple-choice' && question.options.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2 text-sm">
                                {String(optIndex) === question.correctAnswer ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className={cn('text-xs', String(optIndex) === question.correctAnswer && 'font-semibold text-green-600')}>
                                  {option}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === 'code' && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span>{question.testCases.length} test case(s)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(question)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showQuestionEditor && editingQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editingQuestion.id ? 'Edit' : 'Add'} Question</h3>
            <Button variant="ghost" size="sm" onClick={() => { setShowQuestionEditor(false); setEditingQuestion(null) }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={editingQuestion.type} onValueChange={(value: any) => handleQuestionUpdate({ type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="true-false">True/False</SelectItem>
                  <SelectItem value="short-answer">Short Answer</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea value={editingQuestion.question} onChange={(e) => handleQuestionUpdate({ question: e.target.value })} rows={3} />
            </div>

            {editingQuestion.type === 'multiple-choice' && (
              <div className="space-y-2">
                <Label>Answer Options *</Label>
                {editingQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Button
                      variant={editingQuestion.correctAnswer === String(index) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleQuestionUpdate({ correctAnswer: String(index) })}
                      className="w-10 h-10 p-0 flex-shrink-0"
                    >
                      {editingQuestion.correctAnswer === String(index) ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </Button>
                    <Input
                      value={option}
                      onChange={(e) => {
                        const next = [...editingQuestion.options]
                        next[index] = e.target.value
                        handleQuestionUpdate({ options: next })
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuestionUpdate({ options: [...editingQuestion.options, ''] })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            )}

            {editingQuestion.type === 'true-false' && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select value={editingQuestion.correctAnswer || 'true'} onValueChange={(value) => handleQuestionUpdate({ correctAnswer: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(editingQuestion.type === 'short-answer' || editingQuestion.type === 'essay') && (
              <div className="space-y-2">
                <Label>Reference Answer</Label>
                <Textarea value={editingQuestion.correctAnswer || ''} onChange={(e) => handleQuestionUpdate({ correctAnswer: e.target.value })} rows={3} />
              </div>
            )}

            {editingQuestion.type === 'code' && (
              <div className="space-y-4">
                <Card className="p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="h-4 w-4" />
                    <p className="font-medium text-sm">Code Question Settings</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Time Limit (seconds)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={editingQuestion.timeLimit || 2}
                        onChange={(e) => handleQuestionUpdate({ timeLimit: Number(e.target.value) || 2 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Memory Limit (KB)</Label>
                      <Input
                        type="number"
                        min="1024"
                        value={editingQuestion.memoryLimit || 65536}
                        onChange={(e) => handleQuestionUpdate({ memoryLimit: Number(e.target.value) || 65536 })}
                      />
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <Label>Starter Code</Label>
                  <Textarea
                    rows={8}
                    value={editingQuestion.codeStarter || ''}
                    onChange={(e) => handleQuestionUpdate({ codeStarter: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Test Cases</Label>
                  {editingQuestion.testCases.map((tc, idx) => (
                    <Card key={tc.id || idx} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Case #{idx + 1}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              const next = editingQuestion.testCases.filter((_, i) => i !== idx)
                              handleQuestionUpdate({ testCases: next })
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Input"
                          value={tc.input_data}
                          onChange={(e) => {
                            const next = [...editingQuestion.testCases]
                            next[idx] = { ...next[idx], input_data: e.target.value, order_number: idx + 1 }
                            handleQuestionUpdate({ testCases: next })
                          }}
                        />
                        <Input
                          placeholder="Expected Output"
                          value={tc.expected_output}
                          onChange={(e) => {
                            const next = [...editingQuestion.testCases]
                            next[idx] = { ...next[idx], expected_output: e.target.value, order_number: idx + 1 }
                            handleQuestionUpdate({ testCases: next })
                          }}
                        />
                      </div>
                    </Card>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = [
                        ...editingQuestion.testCases,
                        {
                          input_data: '',
                          expected_output: '',
                          is_hidden: false,
                          points: 0,
                          order_number: editingQuestion.testCases.length + 1,
                        },
                      ]
                      handleQuestionUpdate({ testCases: next })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Test Case
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Points</Label>
              <Input type="number" min="1" value={editingQuestion.points} onChange={(e) => handleQuestionUpdate({ points: parseInt(e.target.value) || 1 })} />
            </div>

            <div className="space-y-2">
              <Label>Explanation (Optional)</Label>
              <Textarea value={editingQuestion.explanation || ''} onChange={(e) => handleQuestionUpdate({ explanation: e.target.value })} rows={2} />
            </div>

            <Button onClick={handleSaveQuestion} className="w-full" disabled={isSavingQuestion}>
              {isSavingQuestion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingQuestion.id ? 'Update' : 'Add'} Question
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
