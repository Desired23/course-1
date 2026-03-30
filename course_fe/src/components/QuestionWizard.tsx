import { useState, useEffect } from 'react'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Card, CardContent } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { ScrollArea } from './ui/scroll-area'
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Plus, 
  Image as ImageIcon, 
  Code, 
  FileText, 
  Settings, 
  AlertCircle,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { EnhancedCodeQuizData, TestCase } from './EnhancedCodeQuizCreator'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useTranslation } from 'react-i18next'

// Re-defining QuizQuestion to match InstructorQuizzesPage
export interface QuizQuestion {
  id: string
  question: string
  type: 'single' | 'multiple' | 'text' | 'code'
  options?: string[]
  correctAnswer?: string | string[]
  points: number
  explanation?: string
  order: number
  image?: string
  code?: string
  codeLanguage?: string
  enhancedCodeQuizData?: EnhancedCodeQuizData
}

interface QuestionWizardProps {
  isOpen: boolean
  onClose: () => void
  onSave: (question: QuizQuestion) => void
  initialQuestion?: QuizQuestion | null
  questionOrder: number
}

// Draggable Test Case Component (Internal)
function DraggableTestCase({ 
  testCase, 
  index, 
  onUpdate, 
  onDelete, 
  onMove 
}: { 
  testCase: TestCase
  index: number
  onUpdate: (index: number, updated: TestCase) => void
  onDelete: (index: number) => void
  onMove: (fromIndex: number, toIndex: number) => void
}) {
  const { t } = useTranslation()
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'TEST_CASE_WIZARD',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: 'TEST_CASE_WIZARD',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onMove(item.index, index)
        item.index = index
      }
    },
  })

  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className="mb-3 border-muted-foreground/20">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div ref={drag} className="cursor-move pt-2 text-muted-foreground hover:text-foreground">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold text-sm">{t('question_wizard.test_case.title', { index: index + 1 })}</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('question_wizard.test_case.input')}</Label>
                    <Textarea 
                      value={testCase.input}
                      onChange={(e) => onUpdate(index, { ...testCase, input: e.target.value })}
                      className="font-mono text-xs mt-1 h-16"
                      placeholder={t('question_wizard.test_case.input_placeholder')}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('question_wizard.test_case.output')}</Label>
                    <Textarea 
                      value={testCase.expectedOutput}
                      onChange={(e) => onUpdate(index, { ...testCase, expectedOutput: e.target.value })}
                      className="font-mono text-xs mt-1 h-16"
                      placeholder={t('question_wizard.test_case.output_placeholder')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function QuestionWizard({ isOpen, onClose, onSave, initialQuestion, questionOrder }: QuestionWizardProps) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const steps = [
    { id: 'config', title: t('question_wizard.steps.config'), icon: Settings },
    { id: 'content', title: t('question_wizard.steps.content'), icon: FileText },
    { id: 'media', title: t('question_wizard.steps.media'), icon: ImageIcon },
    { id: 'review', title: t('question_wizard.steps.review'), icon: CheckCircle2 },
  ]
  
  // Base State
  const [questionText, setQuestionText] = useState('')
  const [type, setType] = useState<'single' | 'multiple' | 'text' | 'code'>('single')
  const [points, setPoints] = useState(10)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  
  // Content State (Options)
  const [options, setOptions] = useState<string[]>(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('')
  
  // Enhanced Code Quiz Data State
  const [codeData, setCodeData] = useState<EnhancedCodeQuizData>({
    title: '',
    problemStatement: { description: '', inputFormat: '', outputFormat: '' },
    examples: [],
    constraints: [],
    learningObjectives: { difficulty: 'medium' },
    solution: { approach: '', timeComplexity: '', spaceComplexity: '', code: '', codeLanguage: 63, explanation: '' },
    allowedLanguages: [63],
    testCases: [],
    hints: [],
    points: 10
  })

  // Media State
  const [explanation, setExplanation] = useState('')
  const [image, setImage] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [codeSnippetLang, setCodeSnippetLang] = useState('javascript')

  useEffect(() => {
    if (isOpen && initialQuestion) {
      setQuestionText(initialQuestion.question)
      setType(initialQuestion.type)
      setPoints(initialQuestion.points)
      setOptions(initialQuestion.options || ['', '', '', ''])
      setCorrectAnswer(initialQuestion.correctAnswer || '')
      setExplanation(initialQuestion.explanation || '')
      setImage(initialQuestion.image || '')
      setCodeSnippet(initialQuestion.code || '')
      setCodeSnippetLang(initialQuestion.codeLanguage || 'javascript')
      
      if (initialQuestion.enhancedCodeQuizData) {
        setCodeData(initialQuestion.enhancedCodeQuizData)
        // Sync code title with question text if needed, but keep them separate for flexibility
      }
    } else if (isOpen && !initialQuestion) {
      // Reset
      setCurrentStep(0)
      setQuestionText('')
      setType('single')
      setPoints(10)
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
      setExplanation('')
      setImage('')
      setCodeSnippet('')
      // Reset code data
      setCodeData({
        title: '',
        problemStatement: { description: '', inputFormat: '', outputFormat: '' },
        examples: [],
        constraints: [],
        learningObjectives: { difficulty: 'medium' },
        solution: { approach: '', timeComplexity: '', spaceComplexity: '', code: '', codeLanguage: 63, explanation: '' },
        allowedLanguages: [63],
        testCases: [],
        hints: [],
        points: 10
      })
    }
  }, [isOpen, initialQuestion])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1)
    } else {
      handleSave()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1)
    }
  }

  const handleSave = () => {
    const question: QuizQuestion = {
      id: initialQuestion?.id || Date.now().toString(),
      question: questionText,
      type,
      points,
      order: initialQuestion?.order || questionOrder,
      explanation,
      image: image || undefined,
      code: codeSnippet || undefined,
      codeLanguage: codeSnippet ? codeSnippetLang : undefined,
      options: type !== 'text' && type !== 'code' ? options.filter(o => o.trim()) : undefined,
      correctAnswer: type !== 'code' ? correctAnswer : undefined,
      enhancedCodeQuizData: type === 'code' ? {
        ...codeData,
        title: questionText, // Sync title
        points: points, // Sync points
        learningObjectives: { ...codeData.learningObjectives, difficulty } // Sync difficulty
      } : undefined
    }
    onSave(question)
    onClose()
  }

  // --- Render Steps ---

  const renderConfigStep = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>{t('question_wizard.config.question_text')}</Label>
        <Textarea 
          value={questionText} 
          onChange={e => setQuestionText(e.target.value)} 
          placeholder={t('question_wizard.config.question_text_placeholder')}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('question_wizard.config.question_type')}</Label>
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">{t('question_wizard.types.single')}</SelectItem>
              <SelectItem value="multiple">{t('question_wizard.types.multiple')}</SelectItem>
              <SelectItem value="text">{t('question_wizard.types.text')}</SelectItem>
              <SelectItem value="code">{t('question_wizard.types.code')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>{t('question_wizard.config.difficulty')}</Label>
          <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">{t('question_wizard.difficulty.easy')}</SelectItem>
              <SelectItem value="medium">{t('question_wizard.difficulty.medium')}</SelectItem>
              <SelectItem value="hard">{t('question_wizard.difficulty.hard')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('question_wizard.config.points')}</Label>
          <Input 
            type="number" 
            min={1} 
            value={points} 
            onChange={e => setPoints(parseInt(e.target.value) || 0)} 
          />
        </div>
      </div>
    </div>
  )

  const renderContentStep = () => {
    if (type === 'code') {
      return (
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label>{t('question_wizard.content.problem_description')}</Label>
            <Textarea
              value={codeData.problemStatement.description}
              onChange={e => setCodeData({
                ...codeData,
                problemStatement: { ...codeData.problemStatement, description: e.target.value }
              })}
              placeholder={t('question_wizard.content.problem_description_placeholder')}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('question_wizard.content.test_cases')}</Label>
              <Button size="sm" variant="outline" onClick={() => setCodeData({
                ...codeData,
                testCases: [...codeData.testCases, { id: Date.now(), input: '', expectedOutput: '' }]
              })}>
                <Plus className="h-3 w-3 mr-1" /> {t('question_wizard.content.add_case')}
              </Button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto pr-2">
                {codeData.testCases.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                    {t('question_wizard.content.no_test_cases')}
                  </div>
                ) : (
                  codeData.testCases.map((tc, idx) => (
                    <DraggableTestCase 
                      key={tc.id} 
                      testCase={tc} 
                      index={idx}
                      onUpdate={(i, updated) => {
                        const newCases = [...codeData.testCases]
                        newCases[i] = updated
                        setCodeData({ ...codeData, testCases: newCases })
                      }}
                      onDelete={(i) => {
                        setCodeData({ ...codeData, testCases: codeData.testCases.filter((_, idx) => idx !== i) })
                      }}
                      onMove={(from, to) => {
                        const newCases = [...codeData.testCases]
                        const [moved] = newCases.splice(from, 1)
                        newCases.splice(to, 0, moved)
                        setCodeData({ ...codeData, testCases: newCases })
                      }}
                    />
                  ))
                )}
            </div>
          </div>
        </div>
      )
    }

    // Standard Options Logic
    if (type === 'text') {
      return (
        <div className="py-8 text-center border border-dashed rounded-lg bg-muted/20">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('question_wizard.content.text_answer_description')}
            <br />
            {t('question_wizard.content.text_answer_hint')}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4 py-2">
        <Label>{t('question_wizard.content.answer_options')}</Label>
        <div className="space-y-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8">
                {type === 'single' ? (
                  <RadioGroup value={correctAnswer as string} onValueChange={setCorrectAnswer}>
                    <RadioGroupItem value={opt} id={`opt-${idx}`} disabled={!opt} />
                  </RadioGroup>
                ) : (
                  <Checkbox 
                    checked={(correctAnswer as string[] || []).includes(opt)}
                    onCheckedChange={(checked) => {
                      const current = (correctAnswer as string[]) || []
                      if (checked) setCorrectAnswer([...current, opt])
                      else setCorrectAnswer(current.filter(c => c !== opt))
                    }}
                    disabled={!opt}
                  />
                )}
              </div>
              <Input 
                value={opt} 
                onChange={e => {
                  const newOpts = [...options]
                  newOpts[idx] = e.target.value
                  setOptions(newOpts)
                }}
                placeholder={t('question_wizard.content.option_placeholder', { index: idx + 1 })}
              />
              {options.length > 2 && (
                <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, i) => i !== idx))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setOptions([...options, ''])} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> {t('question_wizard.content.add_option')}
          </Button>
        </div>
      </div>
    )
  }

  const renderResourcesStep = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>{t('question_wizard.resources.explanation')}</Label>
        <Textarea 
          value={explanation} 
          onChange={e => setExplanation(e.target.value)} 
          placeholder={t('question_wizard.resources.explanation_placeholder')}
          rows={4}
        />
      </div>
      
      <div className="space-y-2">
        <Label>{t('question_wizard.resources.image_url')}</Label>
        <Input 
          value={image} 
          onChange={e => setImage(e.target.value)} 
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>{t('question_wizard.resources.code_snippet')}</Label>
        <Textarea 
          value={codeSnippet} 
          onChange={e => setCodeSnippet(e.target.value)} 
          placeholder={t('question_wizard.resources.code_snippet_placeholder')}
          className="font-mono text-sm"
          rows={4}
        />
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="py-2 space-y-6">
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {type === 'code' ? <Code className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{questionText || t('question_wizard.review.untitled')}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Badge variant="outline" className="uppercase text-[10px]">{type}</Badge>
            <span>{points} pts</span>
            <span className="capitalize">{t(`question_wizard.difficulty.${difficulty}`)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-background">
          <h4 className="font-medium text-sm mb-2 text-muted-foreground">{t('question_wizard.review.content')}</h4>
          {type === 'code' ? (
            <div className="text-sm">
              <p>{t('question_wizard.review.test_cases', { count: codeData.testCases.length })}</p>
              <p>{t('question_wizard.review.languages_allowed', { count: codeData.allowedLanguages.length })}</p>
            </div>
          ) : (
            <div className="text-sm">
              <p>{t('question_wizard.review.options', { count: options.length })}</p>
              <p>{t('question_wizard.review.correct_answers', { count: Array.isArray(correctAnswer) ? correctAnswer.length : 1 })}</p>
            </div>
          )}
        </div>
        <div className="p-4 rounded-lg border bg-background">
          <h4 className="font-medium text-sm mb-2 text-muted-foreground">{t('question_wizard.review.resources')}</h4>
          <div className="text-sm space-y-1">
            <p className="flex items-center gap-2">
              <ImageIcon className="h-3 w-3" /> {image ? t('question_wizard.review.image_added') : t('question_wizard.review.no_image')}
            </p>
            <p className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3" /> {explanation ? t('question_wizard.review.explanation_added') : t('question_wizard.review.no_explanation')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col h-[80vh] sm:h-[600px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {initialQuestion ? t('question_wizard.dialog.edit_title') : t('question_wizard.dialog.new_title')}
          </DialogTitle>
          <DialogDescription>
            {t('question_wizard.dialog.step', { current: currentStep + 1, total: steps.length, title: steps[currentStep].title })}
          </DialogDescription>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="px-6 py-2 bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const Icon = step.icon
              const isActive = idx === currentStep
              const isCompleted = idx < currentStep
              return (
                <div key={step.id} className="flex flex-col items-center gap-1 z-10 relative">
                   <div 
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                      ${isActive ? 'bg-primary text-primary-foreground scale-110' : 
                        isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                    `}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
            {/* Progress Bar Background */}
            <div className="absolute left-6 right-6 top-[78px] h-[2px] bg-muted -z-0 hidden md:block" /> 
            {/* Note: positioning absolute for progress bar requires relative parent which isn't easy with flex-between. Skipping bar for simplicity or need custom css */}
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 0 && renderConfigStep()}
              {currentStep === 1 && renderContentStep()}
              {currentStep === 2 && renderResourcesStep()}
              {currentStep === 3 && renderReviewStep()}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" /> {t('question_wizard.actions.back')}
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? (
              <>{t('question_wizard.actions.save')} <CheckCircle2 className="h-4 w-4 ml-2" /></>
            ) : (
              <>{t('question_wizard.actions.next')} <ChevronRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
