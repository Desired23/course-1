import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Code2, 
  Play,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  Target,
  Lightbulb,
  FileText,
  TestTube,
  Settings,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { CodeExecutionDebugPanel, type DebugExecutionResult } from './CodeExecutionDebugPanel'
import { SUPPORTED_LANGUAGES, extractDebugLogs, runTestCases, submitAndWait, wrapUserCode, shouldWrapUserCode, type TestResult } from '../utils/judge0'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { toast } from 'sonner'

// ==================== INTERFACES ====================

export interface TestCase {
  id: number
  input: string
  expectedOutput: string
  isHidden?: boolean
  points?: number
}

export interface ProblemExample {
  id: number
  input: string
  output: string
  explanation?: string
}

export interface ProblemConstraint {
  id: number
  description: string
}

export interface LearningObjective {
  algorithm?: string[] // e.g., ["Two Pointers", "Binary Search"]
  dataStructure?: string[] // e.g., ["Array", "Hash Map"]
  skills?: string[] // e.g., ["Edge Case Handling", "Optimization"]
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime?: number // minutes
}

export interface SolutionData {
  approach: string
  timeComplexity: string
  spaceComplexity: string
  code: string
  codeLanguage: number
  explanation: string
}

export interface EnhancedCodeQuizData {
  // Basic Info
  id?: number
  title: string
  
  // Problem Statement (Markdown supported)
  problemStatement: {
    description: string // Main problem description
    inputFormat: string // How input is provided
    outputFormat: string // What to return
    notes?: string // Additional notes/assumptions
  }
  
  // Examples (with explanation)
  examples: ProblemExample[]
  
  // Constraints
  constraints: ProblemConstraint[]
  
  // Learning Objectives
  learningObjectives: LearningObjective
  
  // Solution (for instructors only)
  solution?: SolutionData
  
  // Code Execution
  allowedLanguages: number[]
  starterCode?: Record<number, string> // Per-language starter code
  functionSignature?: Record<number, string> // Function signature per language
  
  // Test Cases
  testCases: TestCase[]
  
  // Settings
  timeLimit?: number
  memoryLimit?: number
  points: number
  
  // Hints
  hints: Array<{
    level: number
    content: string
    type: 'idea' | 'data-structure' | 'algorithm' | 'pseudocode'
  }>
  
  // Metadata
  lessonId?: number
  tags?: string[]
}

interface EnhancedCodeQuizCreatorProps {
  initialData?: EnhancedCodeQuizData
  onSave: (data: EnhancedCodeQuizData) => void
  onChange?: (data: EnhancedCodeQuizData) => void
  onCancel?: () => void
}

function createDefaultEnhancedCodeQuizData(): EnhancedCodeQuizData {
  return {
    title: '',
    problemStatement: {
      description: '',
      inputFormat: '',
      outputFormat: '',
      notes: ''
    },
    examples: [],
    constraints: [],
    learningObjectives: {
      algorithm: [],
      dataStructure: [],
      skills: [],
      difficulty: 'medium',
      estimatedTime: 30
    },
    solution: {
      approach: '',
      timeComplexity: '',
      spaceComplexity: '',
      code: '',
      codeLanguage: 63,
      explanation: ''
    },
    allowedLanguages: [63],
    starterCode: {},
    functionSignature: {},
    testCases: [],
    timeLimit: 2,
    memoryLimit: 128000,
    points: 100,
    hints: [],
    tags: []
  }
}

// ==================== SUB-COMPONENTS ====================

// Draggable Test Case Card
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
    type: 'TEST_CASE',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: 'TEST_CASE',
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
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div
              ref={drag}
              className="cursor-move pt-2 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">{t('enhanced_code_quiz_creator.test_case_number', { number: index + 1 })}</Label>
                  {testCase.points && (
                    <Badge variant="secondary">{t('enhanced_code_quiz_creator.points_badge', { points: testCase.points })}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <>
                  {/* Input */}
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('enhanced_code_quiz_creator.input_stdin')}</Label>
                    <Textarea
                      value={testCase.input}
                      onChange={(e) => onUpdate(index, { ...testCase, input: e.target.value })}
                      placeholder={t('enhanced_code_quiz_creator.input_placeholder')}
                      className="mt-1 font-mono text-sm"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('enhanced_code_quiz_creator.input_help')}
                    </p>
                  </div>

                  {/* Expected Output */}
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('enhanced_code_quiz_creator.expected_output')}</Label>
                    <Textarea
                      value={testCase.expectedOutput}
                      onChange={(e) => onUpdate(index, { ...testCase, expectedOutput: e.target.value })}
                      placeholder={t('enhanced_code_quiz_creator.expected_output_placeholder')}
                      className="mt-1 font-mono text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">{t('enhanced_code_quiz_creator.points_optional')}</Label>
                      <Input
                        type="number"
                        value={testCase.points || ''}
                        onChange={(e) => onUpdate(index, { 
                          ...testCase, 
                          points: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder={t('enhanced_code_quiz_creator.auto')}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function EnhancedCodeQuizCreator({ initialData, onSave, onChange, onCancel }: EnhancedCodeQuizCreatorProps) {
  const { t } = useTranslation()
  const RUN_ACTION_DEBOUNCE_MS = 1000
  const [formData, setFormData] = useState<EnhancedCodeQuizData>(initialData || createDefaultEnhancedCodeQuizData())

  const [currentTag, setCurrentTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isRunningSolutionTests, setIsRunningSolutionTests] = useState(false)
  const [solutionTestResults, setSolutionTestResults] = useState<TestResult[]>([])
  const [solutionRunError, setSolutionRunError] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState({ current: 0, total: 0 })
  const [customInput, setCustomInput] = useState('[2,7,11,15]\n9')
  const [isRunningCustomInput, setIsRunningCustomInput] = useState(false)
  const [customRunResult, setCustomRunResult] = useState<DebugExecutionResult | null>(null)
  const [customRunError, setCustomRunError] = useState<string | null>(null)
  const isSyncingFromPropsRef = useRef(false)
  const lastEmittedRef = useRef<EnhancedCodeQuizData | null>(null)
  const lastSolutionRunAtRef = useRef(0)
  const lastCustomRunAtRef = useRef(0)

  useEffect(() => {
    if (initialData && initialData !== formData) {
      isSyncingFromPropsRef.current = true
      setFormData(initialData)
    }
  }, [initialData])

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false
      return
    }

    if (lastEmittedRef.current === formData) {
      return
    }

    lastEmittedRef.current = formData
    onChange?.(formData)
  }, [formData, onChange])

  const updateFormData = (
    updater: EnhancedCodeQuizData | ((prev: EnhancedCodeQuizData) => EnhancedCodeQuizData)
  ) => {
    setFormData((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }

  // ==================== VALIDATION ====================
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('enhanced_code_quiz_creator.errors.title_required')
    }

    if (!formData.problemStatement.description.trim()) {
      newErrors.description = t('enhanced_code_quiz_creator.errors.description_required')
    }

    if (formData.allowedLanguages.length === 0) {
      newErrors.languages = t('enhanced_code_quiz_creator.errors.languages_required')
    }

    if (formData.testCases.length === 0) {
      newErrors.testCases = t('enhanced_code_quiz_creator.errors.test_cases_required')
    }

    if (formData.examples.length === 0) {
      newErrors.examples = t('enhanced_code_quiz_creator.errors.examples_required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validate()) {
      onSave(formData)
    }
  }

  // ==================== EXAMPLES MANAGEMENT ====================
  
  const addExample = () => {
    updateFormData((prev) => ({
      ...prev,
      examples: [
        ...prev.examples,
        {
          id: Date.now(),
          input: '',
          output: '',
          explanation: ''
        }
      ]
    }))
  }

  const updateExample = (index: number, updated: Partial<ProblemExample>) => {
    updateFormData((prev) => {
      const newExamples = [...prev.examples]
      newExamples[index] = { ...newExamples[index], ...updated }
      return { ...prev, examples: newExamples }
    })
  }

  const deleteExample = (index: number) => {
    updateFormData((prev) => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }))
  }

  // ==================== CONSTRAINTS MANAGEMENT ====================
  
  const addConstraint = () => {
    updateFormData((prev) => ({
      ...prev,
      constraints: [
        ...prev.constraints,
        {
          id: Date.now(),
          description: ''
        }
      ]
    }))
  }

  const updateConstraint = (index: number, description: string) => {
    updateFormData((prev) => {
      const newConstraints = [...prev.constraints]
      newConstraints[index] = { ...newConstraints[index], description }
      return { ...prev, constraints: newConstraints }
    })
  }

  const deleteConstraint = (index: number) => {
    updateFormData((prev) => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== index)
    }))
  }

  // ==================== TEST CASES MANAGEMENT ====================
  
  const addTestCase = () => {
    updateFormData((prev) => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        {
          id: Date.now(),
          input: '',
          expectedOutput: '',
          isHidden: false
        }
      ]
    }))
  }

  const updateTestCase = (index: number, updated: TestCase) => {
    updateFormData((prev) => {
      const newTestCases = [...prev.testCases]
      newTestCases[index] = updated
      return { ...prev, testCases: newTestCases }
    })
  }

  const deleteTestCase = (index: number) => {
    updateFormData((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }))
  }

  const moveTestCase = (fromIndex: number, toIndex: number) => {
    updateFormData((prev) => {
      const newTestCases = [...prev.testCases]
      const [moved] = newTestCases.splice(fromIndex, 1)
      newTestCases.splice(toIndex, 0, moved)
      return { ...prev, testCases: newTestCases }
    })
  }

  // ==================== HINTS MANAGEMENT ====================
  
  const addHint = (type: 'idea' | 'data-structure' | 'algorithm' | 'pseudocode', content: string) => {
    if (content.trim()) {
      updateFormData((prev) => ({
        ...prev,
        hints: [
          ...prev.hints,
          {
            level: prev.hints.length + 1,
            content: content.trim(),
            type
          }
        ]
      }))
    }
  }

  const deleteHint = (index: number) => {
    updateFormData((prev) => {
      const newHints = prev.hints.filter((_, i) => i !== index)
      const renumberedHints = newHints.map((hint, idx) => ({
        ...hint,
        level: idx + 1
      }))
      return { ...prev, hints: renumberedHints }
    })
  }

  // ==================== TAGS MANAGEMENT ====================
  
  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      updateFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const deleteTag = (tag: string) => {
    updateFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag)
    }))
  }

  // ==================== LANGUAGE MANAGEMENT ====================
  
  const toggleLanguage = (languageId: number) => {
    if (formData.allowedLanguages.includes(languageId)) {
      if (formData.allowedLanguages.length > 1) {
        updateFormData((prev) => ({
          ...prev,
          allowedLanguages: prev.allowedLanguages.filter(id => id !== languageId)
        }))
      }
    } else {
      updateFormData((prev) => ({
        ...prev,
        allowedLanguages: [...prev.allowedLanguages, languageId]
      }))
    }
  }

  const handleRunSolutionTests = async () => {
    if (isRunningSolutionTests) return

    const now = Date.now()
    if (now - lastSolutionRunAtRef.current < RUN_ACTION_DEBOUNCE_MS) {
      toast.warning(t('enhanced_code_quiz_creator.toasts.wait_before_rerun_tests'))
      return
    }
    lastSolutionRunAtRef.current = now

    const code = formData.solution?.code?.trim() || ''
    if (!code) {
      setSolutionRunError(t('enhanced_code_quiz_creator.errors.solution_code_required'))
      return
    }

    if (formData.testCases.length === 0) {
      setSolutionRunError(t('enhanced_code_quiz_creator.errors.test_cases_before_run'))
      return
    }

    setIsRunningSolutionTests(true)
    setSolutionRunError(null)
    setSolutionTestResults([])
    setRunProgress({ current: 0, total: formData.testCases.length })

    try {
      const languageId = formData.solution?.codeLanguage || formData.allowedLanguages[0] || 63
      const languageValue = SUPPORTED_LANGUAGES.find((lang) => lang.id === languageId)?.value || 'javascript'
      const executableCode = shouldWrapUserCode(code, languageValue)
        ? wrapUserCode(code, languageValue, '')
        : code

      const results = await runTestCases(
        executableCode,
        languageId,
        formData.testCases,
        {
          timeLimit: formData.timeLimit,
          memoryLimit: formData.memoryLimit,
        },
        (current, total) => setRunProgress({ current, total })
      )
      setSolutionTestResults(results)
    } catch (error) {
      setSolutionRunError(error instanceof Error ? error.message : t('enhanced_code_quiz_creator.toasts.run_tests_failed'))
    } finally {
      setIsRunningSolutionTests(false)
      setRunProgress({ current: 0, total: 0 })
    }
  }

  const handleRunCustomInput = async () => {
    if (isRunningCustomInput) return

    const now = Date.now()
    if (now - lastCustomRunAtRef.current < RUN_ACTION_DEBOUNCE_MS) {
      toast.warning(t('enhanced_code_quiz_creator.toasts.wait_before_rerun_custom'))
      return
    }
    lastCustomRunAtRef.current = now

    const code = formData.solution?.code?.trim() || ''
    if (!code) {
      setCustomRunError(t('enhanced_code_quiz_creator.errors.solution_code_before_custom'))
      return
    }

    const trimmedInput = customInput.trim()
    if (!trimmedInput) {
      setCustomRunError(t('enhanced_code_quiz_creator.errors.custom_input_required'))
      return
    }

    setIsRunningCustomInput(true)
    setCustomRunError(null)
    setCustomRunResult(null)

    try {
      const languageId = formData.solution?.codeLanguage || formData.allowedLanguages[0] || 63
      const languageValue = SUPPORTED_LANGUAGES.find((lang) => lang.id === languageId)?.value || 'javascript'
      const executableCode = shouldWrapUserCode(code, languageValue)
        ? wrapUserCode(code, languageValue, '')
        : code

      const result = await submitAndWait({
        source_code: executableCode,
        language_id: languageId,
        stdin: customInput,
        cpu_time_limit: formData.timeLimit || 3,
        memory_limit: formData.memoryLimit || 256000,
      })

      const { cleanStderr, debugLogs } = extractDebugLogs(result.stderr)
      setCustomRunResult({
        stdout: result.stdout,
        stderr: cleanStderr,
        compileOutput: result.compile_output,
        message: result.message,
        statusId: result.status?.id,
        statusDescription: result.status?.description,
        time: result.time,
        memory: result.memory,
        debugLogs,
      })
    } catch (error) {
      setCustomRunError(error instanceof Error ? error.message : t('enhanced_code_quiz_creator.toasts.run_custom_failed'))
    } finally {
      setIsRunningCustomInput(false)
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  {initialData ? t('enhanced_code_quiz_creator.edit_title') : t('enhanced_code_quiz_creator.create_title')}
                </CardTitle>
                <CardDescription>
                  {t('enhanced_code_quiz_creator.description')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel}>
                    {t('enhanced_code_quiz_creator.cancel')}
                  </Button>
                )}
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('enhanced_code_quiz_creator.save_quiz')}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Validation Errors */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {Object.values(errors).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-7 w-full p-1 bg-muted/50 h-auto">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Target className="h-4 w-4 mr-2" />
              {t('enhanced_code_quiz_creator.overview')}
            </TabsTrigger>
            <TabsTrigger 
              value="problem"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {t('enhanced_code_quiz_creator.problem')}
            </TabsTrigger>
            <TabsTrigger 
              value="examples"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('enhanced_code_quiz_creator.examples')}
            </TabsTrigger>
            <TabsTrigger 
              value="testcases"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {t('enhanced_code_quiz_creator.tests_tab', { count: formData.testCases.length })}
            </TabsTrigger>
            <TabsTrigger 
              value="hints"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              {t('enhanced_code_quiz_creator.hints_tab', { count: formData.hints.length })}
            </TabsTrigger>
            <TabsTrigger 
              value="solution"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('enhanced_code_quiz_creator.solution')}
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('enhanced_code_quiz_creator.settings')}
            </TabsTrigger>
          </TabsList>

          {/* ==================== TAB 1: OVERVIEW & LEARNING OBJECTIVES ==================== */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.learning_objectives')}</CardTitle>
                <CardDescription>
                  🎯 Define what students will learn from this problem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.problem_title')}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateFormData({ ...formData, title: e.target.value })}
                    placeholder={t('enhanced_code_quiz_creator.problem_title_placeholder')}
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                  )}
                </div>

                <Separator />

                {/* Difficulty & Time */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>{t('enhanced_code_quiz_creator.difficulty_level')}</Label>
                    <Select
                      value={formData.learningObjectives.difficulty}
                      onValueChange={(value: any) => updateFormData({ 
                        ...formData, 
                        learningObjectives: { ...formData.learningObjectives, difficulty: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">{`🟢 ${t('enhanced_code_quiz_creator.difficulty_easy')}`}</SelectItem>
                        <SelectItem value="medium">{`🟡 ${t('enhanced_code_quiz_creator.difficulty_medium')}`}</SelectItem>
                        <SelectItem value="hard">{`🔴 ${t('enhanced_code_quiz_creator.difficulty_hard')}`}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('enhanced_code_quiz_creator.estimated_time')}</Label>
                    <Input
                      type="number"
                      value={formData.learningObjectives.estimatedTime || ''}
                      onChange={(e) => updateFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          estimatedTime: parseInt(e.target.value) || undefined 
                        }
                      })}
                      placeholder={t('enhanced_code_quiz_creator.estimated_time_placeholder')}
                    />
                  </div>

                  <div>
                    <Label>{t('enhanced_code_quiz_creator.points')}</Label>
                    <Input
                      type="number"
                      value={formData.points}
                      onChange={(e) => updateFormData({ ...formData, points: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>

                <Separator />

                {/* Tags */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.tags')}</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      placeholder={t('enhanced_code_quiz_creator.tags_placeholder')}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag} disabled={!currentTag.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button onClick={() => deleteTag(tag)} className="ml-1">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Learning Categories */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>{`🧮 ${t('enhanced_code_quiz_creator.algorithms_taught')}`}</Label>
                    <Textarea
                      value={formData.learningObjectives.algorithm?.join('\n') || ''}
                      onChange={(e) => updateFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          algorithm: e.target.value.split('\n').filter(s => s.trim())
                        }
                      })}
                      placeholder={t('enhanced_code_quiz_creator.algorithms_placeholder')}
                      rows={5}
                    />
                  </div>

                  <div>
                    <Label>{`📊 ${t('enhanced_code_quiz_creator.data_structures_used')}`}</Label>
                    <Textarea
                      value={formData.learningObjectives.dataStructure?.join('\n') || ''}
                      onChange={(e) => updateFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          dataStructure: e.target.value.split('\n').filter(s => s.trim())
                        }
                      })}
                      placeholder={t('enhanced_code_quiz_creator.data_structures_placeholder')}
                      rows={5}
                    />
                  </div>

                  <div>
                    <Label>{`💡 ${t('enhanced_code_quiz_creator.skills_developed')}`}</Label>
                    <Textarea
                      value={formData.learningObjectives.skills?.join('\n') || ''}
                      onChange={(e) => updateFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          skills: e.target.value.split('\n').filter(s => s.trim())
                        }
                      })}
                      placeholder={t('enhanced_code_quiz_creator.skills_placeholder')}
                      rows={5}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 2: PROBLEM STATEMENT ==================== */}
          <TabsContent value="problem" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.problem_statement')}</CardTitle>
                <CardDescription>
                  {t('enhanced_code_quiz_creator.problem_statement_help')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Description */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.problem_description')}</Label>
                  <Textarea
                    value={formData.problemStatement.description}
                    onChange={(e) => updateFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, description: e.target.value }
                    })}
                    placeholder={t('enhanced_code_quiz_creator.problem_description_placeholder')}
                    rows={10}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('enhanced_code_quiz_creator.problem_description_tip')}
                  </p>
                </div>

                <Separator />

                {/* Input Format */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.input_format')}</Label>
                  <Textarea
                    value={formData.problemStatement.inputFormat}
                    onChange={(e) => updateFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, inputFormat: e.target.value }
                    })}
                    placeholder={t('enhanced_code_quiz_creator.input_format_placeholder')}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('enhanced_code_quiz_creator.input_format_help')}
                  </p>
                </div>

                {/* Output Format */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.output_format')}</Label>
                  <Textarea
                    value={formData.problemStatement.outputFormat}
                    onChange={(e) => updateFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, outputFormat: e.target.value }
                    })}
                    placeholder={t('enhanced_code_quiz_creator.output_format_placeholder')}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('enhanced_code_quiz_creator.output_format_help')}
                  </p>
                </div>

                <Separator />

                {/* Notes / Assumptions */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.notes_assumptions')}</Label>
                  <Textarea
                    value={formData.problemStatement.notes}
                    onChange={(e) => updateFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, notes: e.target.value }
                    })}
                    placeholder={t('enhanced_code_quiz_creator.notes_assumptions_placeholder')}
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Constraints Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.constraints')}</CardTitle>
                    <CardDescription>
                      {t('enhanced_code_quiz_creator.constraints_help')}
                    </CardDescription>
                  </div>
                  <Button onClick={addConstraint} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('enhanced_code_quiz_creator.add_constraint')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.constraints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('enhanced_code_quiz_creator.no_constraints')}</p>
                    <p className="text-sm">{t('enhanced_code_quiz_creator.add_constraint_prompt')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.constraints.map((constraint, index) => (
                      <div key={constraint.id} className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <Input
                          value={constraint.description}
                          onChange={(e) => updateConstraint(index, e.target.value)}
                          placeholder={t('enhanced_code_quiz_creator.constraint_placeholder')}
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConstraint(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">{t('enhanced_code_quiz_creator.constraint_examples_title')}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>{t('enhanced_code_quiz_creator.constraint_examples.array_size')}</li>
                      <li>{t('enhanced_code_quiz_creator.constraint_examples.value_range')}</li>
                      <li>{t('enhanced_code_quiz_creator.constraint_examples.target_range')}</li>
                      <li>{t('enhanced_code_quiz_creator.constraint_examples.assumptions')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 3: EXAMPLES ==================== */}
          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.examples_title')}</CardTitle>
                    <CardDescription>
                      {t('enhanced_code_quiz_creator.examples_help')}
                    </CardDescription>
                  </div>
                  <Button onClick={addExample}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('enhanced_code_quiz_creator.add_example')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.examples.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('enhanced_code_quiz_creator.no_examples')}</p>
                    <p className="text-sm">{t('enhanced_code_quiz_creator.add_example_prompt')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.examples.map((example, index) => (
                      <Card key={example.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">{t('enhanced_code_quiz_creator.example_number', { number: index + 1 })}</Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteExample(index)}
                                className="text-destructive h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">{t('enhanced_code_quiz_creator.input')}</Label>
                                <Textarea
                                  value={example.input}
                                  onChange={(e) => updateExample(index, { input: e.target.value })}
                                  placeholder={t('enhanced_code_quiz_creator.example_input_placeholder')}
                                  className="mt-1 font-mono text-sm"
                                  rows={3}
                                />
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">{t('enhanced_code_quiz_creator.output')}</Label>
                                <Textarea
                                  value={example.output}
                                  onChange={(e) => updateExample(index, { output: e.target.value })}
                                  placeholder={t('enhanced_code_quiz_creator.example_output_placeholder')}
                                  className="mt-1 font-mono text-sm"
                                  rows={3}
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground">{t('enhanced_code_quiz_creator.explanation_optional')}</Label>
                              <Textarea
                                value={example.explanation}
                                onChange={(e) => updateExample(index, { explanation: e.target.value })}
                                placeholder={t('enhanced_code_quiz_creator.explanation_placeholder')}
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {errors.examples && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.examples}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 4: TEST CASES ==================== */}
          <TabsContent value="testcases" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.test_cases')}</CardTitle>
                    <CardDescription>
                      {t('enhanced_code_quiz_creator.test_cases_help')}
                    </CardDescription>
                  </div>
                  <Button onClick={addTestCase}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('enhanced_code_quiz_creator.add_test_case')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.testCases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('enhanced_code_quiz_creator.no_test_cases')}</p>
                    <p className="text-sm">{t('enhanced_code_quiz_creator.add_test_case_prompt')}</p>
                  </div>
                ) : (
                  <div>
                    {formData.testCases.map((testCase, index) => (
                      <DraggableTestCase
                        key={testCase.id}
                        testCase={testCase}
                        index={index}
                        onUpdate={updateTestCase}
                        onDelete={deleteTestCase}
                        onMove={moveTestCase}
                      />
                    ))}
                  </div>
                )}
                {errors.testCases && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.testCases}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Test Case Guidelines */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">{t('enhanced_code_quiz_creator.test_case_guidelines_title')}</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>{t('enhanced_code_quiz_creator.test_case_guidelines.input_format_label')}</strong> {t('enhanced_code_quiz_creator.test_case_guidelines.input_format')}</li>
                    <li><strong>{t('enhanced_code_quiz_creator.test_case_guidelines.basic_tests_label')}</strong> {t('enhanced_code_quiz_creator.test_case_guidelines.basic_tests')}</li>
                  <li><strong>{t('enhanced_code_quiz_creator.test_case_guidelines.edge_cases_label')}</strong> {t('enhanced_code_quiz_creator.test_case_guidelines.edge_cases')}</li>
                  <li><strong>{t('enhanced_code_quiz_creator.test_case_guidelines.corner_cases_label')}</strong> {t('enhanced_code_quiz_creator.test_case_guidelines.corner_cases')}</li>
                  <li><strong>{t('enhanced_code_quiz_creator.test_case_guidelines.stress_tests_label')}</strong> {t('enhanced_code_quiz_creator.test_case_guidelines.stress_tests')}</li>
                  <li><strong>{t('enhanced_code_quiz_creator.test_case_guidelines.all_visible_label')}</strong> {t('enhanced_code_quiz_creator.test_case_guidelines.all_visible')}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* ==================== TAB 5: HINTS ==================== */}
          <TabsContent value="hints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.progressive_hints')}</CardTitle>
                <CardDescription>
                  {t('enhanced_code_quiz_creator.progressive_hints_help')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Hint Section */}
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => addHint('idea', 'Think about...')}
                    className="w-full"
                  >
                    {t('enhanced_code_quiz_creator.hint_buttons.idea')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addHint('data-structure', 'Consider using...')}
                    className="w-full"
                  >
                    {t('enhanced_code_quiz_creator.hint_buttons.data_structure')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addHint('algorithm', 'Try using...')}
                    className="w-full"
                  >
                    {t('enhanced_code_quiz_creator.hint_buttons.algorithm')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addHint('pseudocode', '1. First step...')}
                    className="w-full"
                  >
                    {t('enhanced_code_quiz_creator.hint_buttons.pseudocode')}
                  </Button>
                </div>

                <Separator />

                {/* Hints List */}
                {formData.hints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('enhanced_code_quiz_creator.no_hints')}</p>
                    <p className="text-sm">{t('enhanced_code_quiz_creator.add_hint_prompt')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.hints.map((hint, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <Badge variant="secondary">
                                {t('enhanced_code_quiz_creator.hint_badge', { level: hint.level })}
                              </Badge>
                              <Badge variant="outline">
                                {hint.type === 'idea' && t('enhanced_code_quiz_creator.hint_types.idea')}
                                {hint.type === 'data-structure' && t('enhanced_code_quiz_creator.hint_types.data_structure')}
                                {hint.type === 'algorithm' && t('enhanced_code_quiz_creator.hint_types.algorithm')}
                                {hint.type === 'pseudocode' && t('enhanced_code_quiz_creator.hint_types.pseudocode')}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHint(index)}
                                className="ml-auto text-destructive h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Textarea
                              value={hint.content}
                              onChange={(e) => {
                                const newHints = [...formData.hints]
                                newHints[index] = { ...hint, content: e.target.value }
                                updateFormData({ ...formData, hints: newHints })
                              }}
                              rows={3}
                              placeholder={t('enhanced_code_quiz_creator.hint_content_placeholder')}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">{t('enhanced_code_quiz_creator.hint_strategy_title')}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>{t('enhanced_code_quiz_creator.hint_strategy.hint_1_label')}</strong> {t('enhanced_code_quiz_creator.hint_strategy.hint_1')}</li>
                      <li><strong>{t('enhanced_code_quiz_creator.hint_strategy.hint_2_label')}</strong> {t('enhanced_code_quiz_creator.hint_strategy.hint_2')}</li>
                      <li><strong>{t('enhanced_code_quiz_creator.hint_strategy.hint_3_label')}</strong> {t('enhanced_code_quiz_creator.hint_strategy.hint_3')}</li>
                      <li>{t('enhanced_code_quiz_creator.hint_strategy.progressive_reveal')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 6: SOLUTION (INSTRUCTOR ONLY) ==================== */}
          <TabsContent value="solution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {t('enhanced_code_quiz_creator.solution_explanation')}
                </CardTitle>
                <CardDescription>
                  {t('enhanced_code_quiz_creator.solution_explanation_help')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Approach */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.approach_strategy')}</Label>
                  <Textarea
                    value={formData.solution?.approach}
                    onChange={(e) => updateFormData({ 
                      ...formData, 
                      solution: { ...formData.solution!, approach: e.target.value }
                    })}
                    placeholder={t('enhanced_code_quiz_creator.approach_placeholder')}
                    rows={6}
                  />
                </div>

                {/* Complexity */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('enhanced_code_quiz_creator.time_complexity')}</Label>
                    <Input
                      value={formData.solution?.timeComplexity}
                      onChange={(e) => updateFormData({ 
                        ...formData, 
                        solution: { ...formData.solution!, timeComplexity: e.target.value }
                      })}
                      placeholder={t('enhanced_code_quiz_creator.time_complexity_placeholder')}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label>{t('enhanced_code_quiz_creator.space_complexity')}</Label>
                    <Input
                      value={formData.solution?.spaceComplexity}
                      onChange={(e) => updateFormData({ 
                        ...formData, 
                        solution: { ...formData.solution!, spaceComplexity: e.target.value }
                      })}
                      placeholder={t('enhanced_code_quiz_creator.space_complexity_placeholder')}
                      className="font-mono"
                    />
                  </div>
                </div>

                <Separator />

                {/* Solution Code */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{t('enhanced_code_quiz_creator.solution_code')}</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={formData.solution?.codeLanguage.toString()}
                        onValueChange={(value) => updateFormData({ 
                          ...formData, 
                          solution: { ...formData.solution!, codeLanguage: parseInt(value) }
                        })}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.id} value={lang.id.toString()}>
                              {lang.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="secondary"
                        onClick={handleRunSolutionTests}
                        disabled={isRunningSolutionTests}
                      >
                        {isRunningSolutionTests ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('enhanced_code_quiz_creator.running')}
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            {t('enhanced_code_quiz_creator.run_test')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={formData.solution?.code}
                    onChange={(e) => updateFormData({ 
                      ...formData, 
                      solution: { ...formData.solution!, code: e.target.value }
                    })}
                    placeholder={t('enhanced_code_quiz_creator.solution_code_placeholder')}
                    className="font-mono text-sm"
                    rows={15}
                  />
                  {isRunningSolutionTests && runProgress.total > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('enhanced_code_quiz_creator.running_test_cases', { current: runProgress.current, total: runProgress.total })}
                    </p>
                  )}
                  {solutionRunError && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{solutionRunError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

                <CodeExecutionDebugPanel
                  results={solutionTestResults}
                  isRunningTests={isRunningSolutionTests}
                  runProgress={runProgress}
                  runError={solutionRunError}
                  customInput={customInput}
                  onCustomInputChange={setCustomInput}
                  onRunCustom={handleRunCustomInput}
                  isRunningCustom={isRunningCustomInput}
                  customResult={customRunResult}
                  customError={customRunError}
                />

                <Separator />

                {/* Detailed Explanation */}
                <div>
                  <Label>{t('enhanced_code_quiz_creator.detailed_explanation')}</Label>
                  <Textarea
                    value={formData.solution?.explanation}
                    onChange={(e) => updateFormData({ 
                      ...formData, 
                      solution: { ...formData.solution!, explanation: e.target.value }
                    })}
                    placeholder={t('enhanced_code_quiz_creator.detailed_explanation_placeholder')}
                    rows={8}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 7: SETTINGS ==================== */}
          <TabsContent value="settings" className="space-y-4">
            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.allowed_languages')}</CardTitle>
                <CardDescription>{t('enhanced_code_quiz_creator.allowed_languages_help')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div
                      key={lang.id}
                      onClick={() => toggleLanguage(lang.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        formData.allowedLanguages.includes(lang.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{lang.value}</span>
                        {formData.allowedLanguages.includes(lang.id) && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.languages && (
                  <p className="text-xs text-red-500 mt-2">{errors.languages}</p>
                )}
              </CardContent>
            </Card>

            {/* Execution Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.execution_settings')}</CardTitle>
                <CardDescription>
                  {t('enhanced_code_quiz_creator.execution_settings_help')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('enhanced_code_quiz_creator.time_limit')}</Label>
                    <Input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => updateFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                      min={1}
                      max={10}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('enhanced_code_quiz_creator.time_limit_help')}
                    </p>
                  </div>

                  <div>
                    <Label>{t('enhanced_code_quiz_creator.memory_limit')}</Label>
                    <Input
                      type="number"
                      value={formData.memoryLimit}
                      onChange={(e) => updateFormData({ ...formData, memoryLimit: parseInt(e.target.value) })}
                      min={64000}
                      max={512000}
                      step={64000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('enhanced_code_quiz_creator.memory_limit_help')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Function Signature (Advanced) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('enhanced_code_quiz_creator.function_signature')}</CardTitle>
                <CardDescription>
                  {t('enhanced_code_quiz_creator.function_signature_help')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.allowedLanguages.map((langId) => {
                  const lang = SUPPORTED_LANGUAGES.find(l => l.id === langId)
                  if (!lang) return null
                  
                  return (
                    <div key={langId}>
                      <Label>{lang.value}</Label>
                      <Textarea
                        value={formData.functionSignature?.[langId] || ''}
                        onChange={(e) => updateFormData({ 
                          ...formData, 
                          functionSignature: { 
                            ...formData.functionSignature, 
                            [langId]: e.target.value 
                          }
                        })}
                        placeholder={
                          lang.value === 'javascript' ? 'function twoSum(nums, target) { }' :
                          lang.value === 'python' ? 'def two_sum(nums: List[int], target: int) -> List[int]:' :
                          lang.value === 'java' ? 'public int[] twoSum(int[] nums, int target) { }' :
                          t('enhanced_code_quiz_creator.function_signature_placeholder')
                        }
                        className="mt-1 font-mono text-sm"
                        rows={2}
                      />
                    </div>
                  )
                })}
                <p className="text-xs text-muted-foreground">
                  {t('enhanced_code_quiz_creator.function_signature_note')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DndProvider>
  )
}
