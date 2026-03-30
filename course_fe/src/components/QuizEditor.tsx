import { useState, useRef } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Label } from "./ui/label"
import { Switch } from "./ui/switch"
import { Plus, Trash2, GripVertical, Code, Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { useDrag, useDrop } from 'react-dnd'
import { useTranslation } from 'react-i18next'

interface QuizQuestion {
  id: number
  question: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  options: string[]
  correctAnswer: string | number
  explanation?: string
  points: number
  codeSnippet?: string
  imageUrl?: string
}

interface QuizEditorProps {
  quizData?: {
    title: string
    description: string
    passingScore: number
    timeLimit?: number
    questions: QuizQuestion[]
  }
  onSave: (data: any) => void
  onCancel: () => void
}

const QUESTION_TYPE = 'question'

interface DraggableQuestionProps {
  question: QuizQuestion
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<QuizQuestion>) => void
  onDelete: () => void
  onAddOption: () => void
  onUpdateOption: (optionIndex: number, value: string) => void
  onRemoveOption: (optionIndex: number) => void
  moveQuestion: (dragIndex: number, hoverIndex: number) => void
}

function DraggableQuestion({
  question,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  moveQuestion
}: DraggableQuestionProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: QUESTION_TYPE,
    item: { index, type: QUESTION_TYPE },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const [{ isOver }, drop] = useDrop({
    accept: QUESTION_TYPE,
    hover(item: { index: number, type: string }, monitor) {
      if (!ref.current) return

      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      const hoverBoundingRect = ref.current.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      
      if (!clientOffset) return

      const hoverClientY = clientOffset.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      moveQuestion(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  drag(drop(ref))

  return (
    <Card 
      ref={ref}
      className={`overflow-hidden transition-all ${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div 
        className="p-4 bg-muted/50 cursor-pointer hover:bg-muted flex items-center justify-between"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Q{index + 1}</Badge>
            <span className="font-medium">
              {question.question || t('quiz_editor.question_card.untitled')}
            </span>
          </div>
          <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
          {question.codeSnippet && <Code className="h-4 w-4 text-primary" />}
          {question.imageUrl && <ImageIcon className="h-4 w-4 text-primary" />}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      {isExpanded && (
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>{t('quiz_editor.question_card.type')}</Label>
            <Select
              value={question.type}
              onValueChange={(value: any) => onUpdate({ type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">{t('quiz_editor.types.multiple_choice')}</SelectItem>
                <SelectItem value="true_false">{t('quiz_editor.types.true_false')}</SelectItem>
                <SelectItem value="short_answer">{t('quiz_editor.types.short_answer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('quiz_editor.question_card.text')}</Label>
            <Textarea
              placeholder={t('quiz_editor.question_card.text_placeholder')}
              value={question.question}
              onChange={(e) => onUpdate({ question: e.target.value })}
              rows={3}
            />
          </div>

          {/* Code Snippet */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={!!question.codeSnippet}
                onCheckedChange={(checked) => {
                  onUpdate({
                    codeSnippet: checked ? '' : undefined
                  })
                }}
              />
              <Label>{t('quiz_editor.question_card.include_code_snippet')}</Label>
            </div>
            {question.codeSnippet !== undefined && (
              <Textarea
                placeholder={t('quiz_editor.question_card.code_snippet_placeholder')}
                value={question.codeSnippet}
                onChange={(e) => onUpdate({ codeSnippet: e.target.value })}
                className="font-mono text-sm"
                rows={4}
              />
            )}
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={!!question.imageUrl}
                onCheckedChange={(checked) => {
                  onUpdate({
                    imageUrl: checked ? '' : undefined
                  })
                }}
              />
              <Label>{t('quiz_editor.question_card.include_image')}</Label>
            </div>
            {question.imageUrl !== undefined && (
              <Input
                placeholder={t('quiz_editor.question_card.image_url_placeholder')}
                value={question.imageUrl}
                onChange={(e) => onUpdate({ imageUrl: e.target.value })}
              />
            )}
          </div>

          {/* Answer Options */}
          {(question.type === 'multiple_choice' || question.type === 'true_false') && (
            <div className="space-y-2">
              <Label>{t('quiz_editor.question_card.answer_options')}</Label>
              <div className="space-y-2">
                {question.type === 'true_false' ? (
                  <>
                    {[t('quiz_editor.question_card.true_value'), t('quiz_editor.question_card.false_value')].map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correctAnswer === idx}
                          onChange={() => onUpdate({ correctAnswer: idx })}
                          className="h-4 w-4"
                        />
                        <Input value={option} readOnly />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {question.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correctAnswer === idx}
                          onChange={() => onUpdate({ correctAnswer: idx })}
                          className="h-4 w-4"
                        />
                        <Input
                          placeholder={t('quiz_editor.question_card.option_placeholder', { index: idx + 1 })}
                          value={option}
                          onChange={(e) => onUpdateOption(idx, e.target.value)}
                        />
                        {question.options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveOption(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddOption}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('quiz_editor.question_card.add_option')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {question.type === 'short_answer' && (
            <div className="space-y-2">
              <Label>{t('quiz_editor.question_card.correct_answer')}</Label>
              <Input
                placeholder={t('quiz_editor.question_card.correct_answer_placeholder')}
                value={question.correctAnswer as string}
                onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('quiz_editor.question_card.explanation')}</Label>
            <Textarea
              placeholder={t('quiz_editor.question_card.explanation_placeholder')}
              value={question.explanation || ''}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('quiz_editor.question_card.points')}</Label>
            <Input
              type="number"
              min="1"
              value={question.points}
              onChange={(e) => onUpdate({ points: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export function QuizEditor({ quizData, onSave, onCancel }: QuizEditorProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(quizData?.title || '')
  const [description, setDescription] = useState(quizData?.description || '')
  const [passingScore, setPassingScore] = useState(quizData?.passingScore || 70)
  const [timeLimit, setTimeLimit] = useState(quizData?.timeLimit || 0)
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    quizData?.questions || []
  )
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now(),
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1
    }
    setQuestions([...questions, newQuestion])
    setExpandedQuestion(newQuestion.id)
  }

  const updateQuestion = (id: number, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ))
  }

  const deleteQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id))
    toast.success(t('quiz_editor.toasts.question_deleted'))
  }

  const moveQuestion = (dragIndex: number, hoverIndex: number) => {
    const newQuestions = [...questions]
    const dragQuestion = newQuestions[dragIndex]
    newQuestions.splice(dragIndex, 1)
    newQuestions.splice(hoverIndex, 0, dragQuestion)
    setQuestions(newQuestions)
  }

  const addOption = (questionId: number) => {
    const question = questions.find(q => q.id === questionId)
    if (question) {
      updateQuestion(questionId, {
        options: [...question.options, '']
      })
    }
  }

  const updateOption = (questionId: number, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId)
    if (question) {
      const newOptions = [...question.options]
      newOptions[optionIndex] = value
      updateQuestion(questionId, { options: newOptions })
    }
  }

  const removeOption = (questionId: number, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId)
    if (question && question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== optionIndex)
      updateQuestion(questionId, { options: newOptions })
    }
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error(t('quiz_editor.toasts.enter_title'))
      return
    }

    if (questions.length === 0) {
      toast.error(t('quiz_editor.toasts.add_question'))
      return
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question.trim()) {
        toast.error(t('quiz_editor.toasts.question_text_required'))
        return
      }
      if (q.type === 'multiple_choice' && q.options.some(o => !o.trim())) {
        toast.error(t('quiz_editor.toasts.answer_options_required'))
        return
      }
    }

    onSave({
      title,
      description,
      passingScore,
      timeLimit: timeLimit > 0 ? timeLimit : undefined,
      questions
    })
  }

  return (
    <div className="space-y-6">
      {/* Quiz Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('quiz_editor.settings.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('quiz_editor.settings.quiz_title')}</Label>
            <Input
              placeholder={t('quiz_editor.settings.quiz_title_placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('quiz_editor.settings.description')}</Label>
            <Textarea
              placeholder={t('quiz_editor.settings.description_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('quiz_editor.settings.passing_score')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('quiz_editor.settings.time_limit')}</Label>
              <Input
                type="number"
                min="0"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('quiz_editor.questions.title', { count: questions.length })}</h3>
          <Button onClick={addQuestion} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('quiz_editor.questions.add')}
          </Button>
        </div>

        {questions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">{t('quiz_editor.questions.empty')}</p>
              <Button onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                {t('quiz_editor.questions.add_first')}
              </Button>
            </CardContent>
          </Card>
        )}

        {questions.map((question, index) => (
          <DraggableQuestion
            key={question.id}
            question={question}
            index={index}
            isExpanded={expandedQuestion === question.id}
            onToggleExpand={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
            onUpdate={(updates) => updateQuestion(question.id, updates)}
            onDelete={() => deleteQuestion(question.id)}
            onAddOption={() => addOption(question.id)}
            onUpdateOption={(optionIndex, value) => updateOption(question.id, optionIndex, value)}
            onRemoveOption={(optionIndex) => removeOption(question.id, optionIndex)}
            moveQuestion={moveQuestion}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          {t('quiz_editor.actions.cancel')}
        </Button>
        <Button onClick={handleSave}>
          {t('quiz_editor.actions.save')}
        </Button>
      </div>
    </div>
  )
}
