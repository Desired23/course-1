import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  Circle,
  Image as ImageIcon,
  Code,
  HelpCircle,
  Edit2,
  X,
  Save
} from 'lucide-react'
import { cn } from './ui/utils'
import { toast } from 'sonner@2.0.3'

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'true-false' | 'short-answer'
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  points: number
  hasImage?: boolean
  hasCode?: boolean
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

export function QuizTab({ lesson, onUpdate }: QuizTabProps) {
  const [quizData, setQuizData] = useState<QuizData>(
    lesson.quizData || {
      title: lesson.title,
      description: '',
      passingScore: 70,
      questions: []
    }
  )

  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)

  const handleUpdateQuizData = (updates: Partial<QuizData>) => {
    const updated = { ...quizData, ...updates }
    setQuizData(updated)
    onUpdate({ 
      quizData: updated,
      questions: updated.questions.length
    })
  }

  const handleAddQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1
    }
    setEditingQuestion(newQuestion)
    setShowQuestionEditor(true)
  }

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion({ ...question })
    setShowQuestionEditor(true)
  }

  const handleSaveQuestion = () => {
    if (!editingQuestion) return

    if (!editingQuestion.question.trim()) {
      toast.error('Please enter a question')
      return
    }

    if (editingQuestion.type === 'multiple-choice') {
      const validOptions = editingQuestion.options?.filter(o => o.trim())
      if (!validOptions || validOptions.length < 2) {
        toast.error('Please provide at least 2 answer options')
        return
      }
    }

    const existingIndex = quizData.questions.findIndex(q => q.id === editingQuestion.id)
    let updatedQuestions

    if (existingIndex >= 0) {
      updatedQuestions = [...quizData.questions]
      updatedQuestions[existingIndex] = editingQuestion
      toast.success('Question updated')
    } else {
      updatedQuestions = [...quizData.questions, editingQuestion]
      toast.success('Question added')
    }

    handleUpdateQuizData({ questions: updatedQuestions })
    setEditingQuestion(null)
    setShowQuestionEditor(false)
  }

  const handleDeleteQuestion = (id: string) => {
    const updatedQuestions = quizData.questions.filter(q => q.id !== id)
    handleUpdateQuizData({ questions: updatedQuestions })
    toast.success('Question deleted')
  }

  const handleQuestionUpdate = (updates: Partial<QuizQuestion>) => {
    if (!editingQuestion) return
    setEditingQuestion({ ...editingQuestion, ...updates })
  }

  const totalPoints = quizData.questions.reduce((sum, q) => sum + q.points, 0)

  return (
    <div className="space-y-6">
      {/* Quiz Settings */}
      {!showQuestionEditor && (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input
                id="quiz-title"
                value={quizData.title}
                onChange={(e) => handleUpdateQuizData({ title: e.target.value })}
                placeholder="Enter quiz title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiz-description">Description</Label>
              <Textarea
                id="quiz-description"
                value={quizData.description}
                onChange={(e) => handleUpdateQuizData({ description: e.target.value })}
                placeholder="Brief description of this quiz..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passing-score">Passing Score (%)</Label>
              <Input
                id="passing-score"
                type="number"
                min="0"
                max="100"
                value={quizData.passingScore}
                onChange={(e) => handleUpdateQuizData({ passingScore: parseInt(e.target.value) || 70 })}
              />
            </div>
          </div>

          {/* Quiz Stats */}
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

          {/* Questions List */}
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
                  <p className="text-xs">Click "Add Question" to get started</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {quizData.questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1 cursor-move" />
                      
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
                                {question.points} {question.points === 1 ? 'pt' : 'pts'}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm">
                              {question.question || 'Untitled Question'}
                            </p>
                          </div>
                        </div>

                        {question.type === 'multiple-choice' && question.options && (
                          <div className="space-y-1 mt-2">
                            {question.options.filter(o => o.trim()).map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2 text-sm">
                                {optIndex === question.correctAnswer ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className={cn(
                                  "text-xs",
                                  optIndex === question.correctAnswer && "font-semibold text-green-600"
                                )}>
                                  {option}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                        >
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

      {/* Question Editor */}
      {showQuestionEditor && editingQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {quizData.questions.find(q => q.id === editingQuestion.id) ? 'Edit' : 'Add'} Question
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowQuestionEditor(false)
                setEditingQuestion(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Question Type */}
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={editingQuestion.type}
                onValueChange={(value: any) => handleQuestionUpdate({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="true-false">True/False</SelectItem>
                  <SelectItem value="short-answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea
                value={editingQuestion.question}
                onChange={(e) => handleQuestionUpdate({ question: e.target.value })}
                placeholder="Enter your question..."
                rows={3}
              />
            </div>

            {/* Multiple Choice Options */}
            {editingQuestion.type === 'multiple-choice' && (
              <div className="space-y-2">
                <Label>Answer Options *</Label>
                {editingQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Button
                      variant={editingQuestion.correctAnswer === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuestionUpdate({ correctAnswer: index })}
                      className="w-10 h-10 p-0 flex-shrink-0"
                    >
                      {editingQuestion.correctAnswer === index ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </Button>
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(editingQuestion.options || [])]
                        newOptions[index] = e.target.value
                        handleQuestionUpdate({ options: newOptions })
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Click the circle to mark the correct answer
                </p>
              </div>
            )}

            {/* Points */}
            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min="1"
                value={editingQuestion.points}
                onChange={(e) => handleQuestionUpdate({ points: parseInt(e.target.value) || 1 })}
              />
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <Label>Explanation (Optional)</Label>
              <Textarea
                value={editingQuestion.explanation || ''}
                onChange={(e) => handleQuestionUpdate({ explanation: e.target.value })}
                placeholder="Explain the correct answer..."
                rows={2}
              />
            </div>

            {/* Save Button */}
            <Button onClick={handleSaveQuestion} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {quizData.questions.find(q => q.id === editingQuestion.id) ? 'Update' : 'Add'} Question
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
