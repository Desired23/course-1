import { useState } from 'react'
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
import { SUPPORTED_LANGUAGES, runTestCases, wrapUserCode, shouldWrapUserCode, type TestResult } from '../utils/judge0'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

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
  onCancel?: () => void
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
                  <Label className="font-semibold">Test Case {index + 1}</Label>
                  {testCase.points && (
                    <Badge variant="secondary">{testCase.points} pts</Badge>
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
                    <Label className="text-xs text-muted-foreground">Input (stdin)</Label>
                    <Textarea
                      value={testCase.input}
                      onChange={(e) => onUpdate(index, { ...testCase, input: e.target.value })}
                      placeholder="e.g., [2,7,11,15]&#10;9"
                      className="mt-1 font-mono text-sm"
                      rows={3}
                    />
                  </div>

                  {/* Expected Output */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Expected Output</Label>
                    <Textarea
                      value={testCase.expectedOutput}
                      onChange={(e) => onUpdate(index, { ...testCase, expectedOutput: e.target.value })}
                      placeholder="e.g., [0,1] or 0,1"
                      className="mt-1 font-mono text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Points (Optional)</Label>
                      <Input
                        type="number"
                        value={testCase.points || ''}
                        onChange={(e) => onUpdate(index, { 
                          ...testCase, 
                          points: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Auto"
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

export function EnhancedCodeQuizCreator({ initialData, onSave, onCancel }: EnhancedCodeQuizCreatorProps) {
  const [formData, setFormData] = useState<EnhancedCodeQuizData>(initialData || {
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
    allowedLanguages: [63], // JavaScript default
    starterCode: {},
    functionSignature: {},
    testCases: [],
    timeLimit: 2,
    memoryLimit: 128000,
    points: 100,
    hints: [],
    tags: []
  })

  const [currentTag, setCurrentTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isRunningSolutionTests, setIsRunningSolutionTests] = useState(false)
  const [solutionTestResults, setSolutionTestResults] = useState<TestResult[]>([])
  const [solutionRunError, setSolutionRunError] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState({ current: 0, total: 0 })

  // ==================== VALIDATION ====================
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Question title is required'
    }

    if (!formData.problemStatement.description.trim()) {
      newErrors.description = 'Problem description is required'
    }

    if (formData.allowedLanguages.length === 0) {
      newErrors.languages = 'At least one language must be selected'
    }

    if (formData.testCases.length === 0) {
      newErrors.testCases = 'At least one test case is required'
    }

    if (formData.examples.length === 0) {
      newErrors.examples = 'At least one example is required'
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
    setFormData({
      ...formData,
      examples: [
        ...formData.examples,
        {
          id: Date.now(),
          input: '',
          output: '',
          explanation: ''
        }
      ]
    })
  }

  const updateExample = (index: number, updated: Partial<ProblemExample>) => {
    const newExamples = [...formData.examples]
    newExamples[index] = { ...newExamples[index], ...updated }
    setFormData({ ...formData, examples: newExamples })
  }

  const deleteExample = (index: number) => {
    setFormData({
      ...formData,
      examples: formData.examples.filter((_, i) => i !== index)
    })
  }

  // ==================== CONSTRAINTS MANAGEMENT ====================
  
  const addConstraint = () => {
    setFormData({
      ...formData,
      constraints: [
        ...formData.constraints,
        {
          id: Date.now(),
          description: ''
        }
      ]
    })
  }

  const updateConstraint = (index: number, description: string) => {
    const newConstraints = [...formData.constraints]
    newConstraints[index] = { ...newConstraints[index], description }
    setFormData({ ...formData, constraints: newConstraints })
  }

  const deleteConstraint = (index: number) => {
    setFormData({
      ...formData,
      constraints: formData.constraints.filter((_, i) => i !== index)
    })
  }

  // ==================== TEST CASES MANAGEMENT ====================
  
  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [
        ...formData.testCases,
        {
          id: Date.now(),
          input: '',
          expectedOutput: '',
          isHidden: false
        }
      ]
    })
  }

  const updateTestCase = (index: number, updated: TestCase) => {
    const newTestCases = [...formData.testCases]
    newTestCases[index] = updated
    setFormData({ ...formData, testCases: newTestCases })
  }

  const deleteTestCase = (index: number) => {
    setFormData({
      ...formData,
      testCases: formData.testCases.filter((_, i) => i !== index)
    })
  }

  const moveTestCase = (fromIndex: number, toIndex: number) => {
    const newTestCases = [...formData.testCases]
    const [moved] = newTestCases.splice(fromIndex, 1)
    newTestCases.splice(toIndex, 0, moved)
    setFormData({ ...formData, testCases: newTestCases })
  }

  // ==================== HINTS MANAGEMENT ====================
  
  const addHint = (type: 'idea' | 'data-structure' | 'algorithm' | 'pseudocode', content: string) => {
    if (content.trim()) {
      setFormData({
        ...formData,
        hints: [
          ...formData.hints,
          {
            level: formData.hints.length + 1,
            content: content.trim(),
            type
          }
        ]
      })
    }
  }

  const deleteHint = (index: number) => {
    const newHints = formData.hints.filter((_, i) => i !== index)
    // Re-number levels
    const renumberedHints = newHints.map((hint, idx) => ({
      ...hint,
      level: idx + 1
    }))
    setFormData({ ...formData, hints: renumberedHints })
  }

  // ==================== TAGS MANAGEMENT ====================
  
  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), currentTag.trim()]
      })
      setCurrentTag('')
    }
  }

  const deleteTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag)
    })
  }

  // ==================== LANGUAGE MANAGEMENT ====================
  
  const toggleLanguage = (languageId: number) => {
    if (formData.allowedLanguages.includes(languageId)) {
      if (formData.allowedLanguages.length > 1) {
        setFormData({
          ...formData,
          allowedLanguages: formData.allowedLanguages.filter(id => id !== languageId)
        })
      }
    } else {
      setFormData({
        ...formData,
        allowedLanguages: [...formData.allowedLanguages, languageId]
      })
    }
  }

  const handleRunSolutionTests = async () => {
    const code = formData.solution?.code?.trim() || ''
    if (!code) {
      setSolutionRunError('Please provide solution code before running tests.')
      return
    }

    if (formData.testCases.length === 0) {
      setSolutionRunError('Please add at least one test case before running tests.')
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
      setSolutionRunError(error instanceof Error ? error.message : 'Failed to run tests')
    } finally {
      setIsRunningSolutionTests(false)
      setRunProgress({ current: 0, total: 0 })
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
                  {initialData ? 'Edit Code Quiz' : 'Create Professional Code Quiz'}
                </CardTitle>
                <CardDescription>
                  Build LeetCode-style coding challenges with comprehensive problem statements
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Quiz
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
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="problem"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Problem
            </TabsTrigger>
            <TabsTrigger 
              value="examples"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Examples
            </TabsTrigger>
            <TabsTrigger 
              value="testcases"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Tests ({formData.testCases.length})
            </TabsTrigger>
            <TabsTrigger 
              value="hints"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Hints ({formData.hints.length})
            </TabsTrigger>
            <TabsTrigger 
              value="solution"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Eye className="h-4 w-4 mr-2" />
              Solution
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all py-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ==================== TAB 1: OVERVIEW & LEARNING OBJECTIVES ==================== */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Learning Objectives</CardTitle>
                <CardDescription>
                  🎯 Define what students will learn from this problem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title */}
                <div>
                  <Label>Problem Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Two Sum"
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
                    <Label>Difficulty Level *</Label>
                    <Select
                      value={formData.learningObjectives.difficulty}
                      onValueChange={(value: any) => setFormData({ 
                        ...formData, 
                        learningObjectives: { ...formData.learningObjectives, difficulty: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">🟢 Easy</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="hard">🔴 Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Estimated Time (min)</Label>
                    <Input
                      type="number"
                      value={formData.learningObjectives.estimatedTime || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          estimatedTime: parseInt(e.target.value) || undefined 
                        }
                      })}
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>

                <Separator />

                {/* Tags */}
                <div>
                  <Label>Tags (for search & categorization)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      placeholder="e.g., hash-map, two-pointers"
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
                    <Label>🧮 Algorithms Taught</Label>
                    <Textarea
                      value={formData.learningObjectives.algorithm?.join('\n') || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          algorithm: e.target.value.split('\n').filter(s => s.trim())
                        }
                      })}
                      placeholder="Two Pointers&#10;Binary Search&#10;Sliding Window"
                      rows={5}
                    />
                  </div>

                  <div>
                    <Label>📊 Data Structures Used</Label>
                    <Textarea
                      value={formData.learningObjectives.dataStructure?.join('\n') || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          dataStructure: e.target.value.split('\n').filter(s => s.trim())
                        }
                      })}
                      placeholder="Array&#10;Hash Map&#10;Stack"
                      rows={5}
                    />
                  </div>

                  <div>
                    <Label>💡 Skills Developed</Label>
                    <Textarea
                      value={formData.learningObjectives.skills?.join('\n') || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        learningObjectives: { 
                          ...formData.learningObjectives, 
                          skills: e.target.value.split('\n').filter(s => s.trim())
                        }
                      })}
                      placeholder="Edge Case Handling&#10;Optimization&#10;Time Complexity Analysis"
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
                <CardTitle className="text-lg">Problem Statement</CardTitle>
                <CardDescription>
                  Write a clear, unambiguous problem description (Markdown supported)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Description */}
                <div>
                  <Label>Problem Description *</Label>
                  <Textarea
                    value={formData.problemStatement.description}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, description: e.target.value }
                    })}
                    placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.&#10;&#10;You may assume that each input would have exactly one solution, and you may not use the same element twice.&#10;&#10;You can return the answer in any order."
                    rows={10}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Tip: Clearly state what the problem is asking, without revealing the solution approach
                  </p>
                </div>

                <Separator />

                {/* Input Format */}
                <div>
                  <Label>Input Format</Label>
                  <Textarea
                    value={formData.problemStatement.inputFormat}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, inputFormat: e.target.value }
                    })}
                    placeholder="Line 1: A comma-separated list of integers representing nums&#10;Line 2: An integer target"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Explain how input is provided to the function
                  </p>
                </div>

                {/* Output Format */}
                <div>
                  <Label>Output Format</Label>
                  <Textarea
                    value={formData.problemStatement.outputFormat}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, outputFormat: e.target.value }
                    })}
                    placeholder="A comma-separated list of two integers representing the indices"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe what the function should return
                  </p>
                </div>

                <Separator />

                {/* Notes / Assumptions */}
                <div>
                  <Label>Notes / Assumptions (Optional)</Label>
                  <Textarea
                    value={formData.problemStatement.notes}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      problemStatement: { ...formData.problemStatement, notes: e.target.value }
                    })}
                    placeholder="• You may assume that each input would have exactly one solution&#10;• You may not use the same element twice&#10;• The answer can be returned in any order"
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
                    <CardTitle className="text-lg">Constraints</CardTitle>
                    <CardDescription>
                      Define input limits and edge cases students should consider
                    </CardDescription>
                  </div>
                  <Button onClick={addConstraint} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Constraint
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.constraints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No constraints defined yet</p>
                    <p className="text-sm">Click "Add Constraint" to define limits</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.constraints.map((constraint, index) => (
                      <div key={constraint.id} className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <Input
                          value={constraint.description}
                          onChange={(e) => updateConstraint(index, e.target.value)}
                          placeholder="e.g., 2 ≤ nums.length ≤ 10^4"
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
                    <p className="font-medium mb-2">Constraint Examples:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><code>2 ≤ nums.length ≤ 10^4</code> - Array size limits</li>
                      <li><code>-10^9 ≤ nums[i] ≤ 10^9</code> - Value range</li>
                      <li><code>-10^9 ≤ target ≤ 10^9</code> - Target range</li>
                      <li><code>Only one valid answer exists</code> - Assumptions</li>
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
                    <CardTitle className="text-lg">Examples *</CardTitle>
                    <CardDescription>
                      Provide 2-3 examples with explanations to help students understand the problem
                    </CardDescription>
                  </div>
                  <Button onClick={addExample}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Example
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.examples.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No examples yet</p>
                    <p className="text-sm">Click "Add Example" to create problem examples</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.examples.map((example, index) => (
                      <Card key={example.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">Example {index + 1}</Label>
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
                                <Label className="text-xs text-muted-foreground">Input</Label>
                                <Textarea
                                  value={example.input}
                                  onChange={(e) => updateExample(index, { input: e.target.value })}
                                  placeholder="nums = [2,7,11,15], target = 9"
                                  className="mt-1 font-mono text-sm"
                                  rows={3}
                                />
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">Output</Label>
                                <Textarea
                                  value={example.output}
                                  onChange={(e) => updateExample(index, { output: e.target.value })}
                                  placeholder="[0,1]"
                                  className="mt-1 font-mono text-sm"
                                  rows={3}
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground">Explanation (Optional)</Label>
                              <Textarea
                                value={example.explanation}
                                onChange={(e) => updateExample(index, { explanation: e.target.value })}
                                placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
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
                    <CardTitle className="text-lg">Test Cases *</CardTitle>
                    <CardDescription>
                      Define comprehensive test cases for auto-grading (all visible to students)
                    </CardDescription>
                  </div>
                  <Button onClick={addTestCase}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Test Case
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.testCases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No test cases yet</p>
                    <p className="text-sm">Click "Add Test Case" to get started</p>
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
                <p className="font-medium mb-2">📝 Test Case Best Practices:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Basic Tests:</strong> Cover example cases from the problem statement</li>
                  <li><strong>Edge Cases:</strong> Minimum input, maximum input, empty/null cases</li>
                  <li><strong>Corner Cases:</strong> Negative numbers, duplicates, special values</li>
                  <li><strong>Stress Tests:</strong> Large inputs to test performance (optional stress test marker)</li>
                  <li><strong>All tests visible:</strong> Students can see all test cases to help with debugging</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* ==================== TAB 5: HINTS ==================== */}
          <TabsContent value="hints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progressive Hints</CardTitle>
                <CardDescription>
                  Provide hints at different levels to guide students without giving away the solution
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
                    💡 Idea Hint
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addHint('data-structure', 'Consider using...')}
                    className="w-full"
                  >
                    📊 Data Structure
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addHint('algorithm', 'Try using...')}
                    className="w-full"
                  >
                    🧮 Algorithm
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addHint('pseudocode', '1. First step...')}
                    className="w-full"
                  >
                    📝 Pseudocode
                  </Button>
                </div>

                <Separator />

                {/* Hints List */}
                {formData.hints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hints added yet</p>
                    <p className="text-sm">Click a hint type button above to add hints</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.hints.map((hint, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <Badge variant="secondary">
                                Hint {hint.level}
                              </Badge>
                              <Badge variant="outline">
                                {hint.type === 'idea' && '💡 Idea'}
                                {hint.type === 'data-structure' && '📊 Data Structure'}
                                {hint.type === 'algorithm' && '🧮 Algorithm'}
                                {hint.type === 'pseudocode' && '📝 Pseudocode'}
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
                                setFormData({ ...formData, hints: newHints })
                              }}
                              rows={3}
                              placeholder="Enter hint content..."
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
                    <p className="font-medium mb-2">💡 Hint Strategy:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>Hint 1:</strong> General approach or thought direction</li>
                      <li><strong>Hint 2:</strong> Suggest specific data structure or algorithm</li>
                      <li><strong>Hint 3:</strong> Provide pseudocode or step-by-step outline</li>
                      <li>Students reveal hints progressively - don't give away the full solution!</li>
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
                  Solution & Explanation (Instructor Only)
                </CardTitle>
                <CardDescription>
                  Provide the optimal solution with detailed explanation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Approach */}
                <div>
                  <Label>Approach / Strategy</Label>
                  <Textarea
                    value={formData.solution?.approach}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      solution: { ...formData.solution!, approach: e.target.value }
                    })}
                    placeholder="Explain the high-level approach: We can use a hash map to store numbers we've seen..."
                    rows={6}
                  />
                </div>

                {/* Complexity */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Time Complexity</Label>
                    <Input
                      value={formData.solution?.timeComplexity}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        solution: { ...formData.solution!, timeComplexity: e.target.value }
                      })}
                      placeholder="e.g., O(n)"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label>Space Complexity</Label>
                    <Input
                      value={formData.solution?.spaceComplexity}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        solution: { ...formData.solution!, spaceComplexity: e.target.value }
                      })}
                      placeholder="e.g., O(n)"
                      className="font-mono"
                    />
                  </div>
                </div>

                <Separator />

                {/* Solution Code */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Solution Code</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={formData.solution?.codeLanguage.toString()}
                        onValueChange={(value) => setFormData({ 
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
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run Test
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={formData.solution?.code}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      solution: { ...formData.solution!, code: e.target.value }
                    })}
                    placeholder="function twoSum(nums, target) {&#10;  const map = new Map();&#10;  for (let i = 0; i < nums.length; i++) {&#10;    const complement = target - nums[i];&#10;    if (map.has(complement)) {&#10;      return [map.get(complement), i];&#10;    }&#10;    map.set(nums[i], i);&#10;  }&#10;}"
                    className="font-mono text-sm"
                    rows={15}
                  />
                  {isRunningSolutionTests && runProgress.total > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Running {runProgress.current}/{runProgress.total} test cases...
                    </p>
                  )}
                  {solutionRunError && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{solutionRunError}</AlertDescription>
                    </Alert>
                  )}
                  {solutionTestResults.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Passed {solutionTestResults.filter((result) => result.passed).length}/{solutionTestResults.length}
                        </Badge>
                      </div>
                      {solutionTestResults.map((result, index) => (
                        <Card key={result.id ?? index}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Test Case {index + 1}</span>
                              <Badge variant={result.passed ? 'default' : 'destructive'} className="flex items-center gap-1">
                                {result.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                {result.passed ? 'Passed' : 'Failed'}
                              </Badge>
                            </div>
                            <div className="text-xs space-y-1 font-mono">
                              <p><span className="font-semibold">Input:</span> {result.input || '(empty)'}</p>
                              <p><span className="font-semibold">Expected:</span> {result.expectedOutput || '(empty)'}</p>
                              <p><span className="font-semibold">Actual:</span> {result.actualOutput?.trim() || '(empty)'}</p>
                              {result.error && (
                                <p className="text-destructive"><span className="font-semibold">Error:</span> {result.error}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Detailed Explanation */}
                <div>
                  <Label>Detailed Explanation</Label>
                  <Textarea
                    value={formData.solution?.explanation}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      solution: { ...formData.solution!, explanation: e.target.value }
                    })}
                    placeholder="Step-by-step explanation:&#10;1. Create a hash map to store numbers and their indices&#10;2. Iterate through the array once&#10;3. For each number, calculate the complement (target - current)&#10;4. If complement exists in map, return the indices&#10;5. Otherwise, add current number to map"
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
                <CardTitle className="text-lg">Allowed Programming Languages *</CardTitle>
                <CardDescription>Select languages students can use to solve this problem</CardDescription>
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
                <CardTitle className="text-lg">Execution Settings</CardTitle>
                <CardDescription>
                  Configure time and memory limits for code execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Time Limit (seconds)</Label>
                    <Input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                      min={1}
                      max={10}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum execution time per test case (1-10 seconds)
                    </p>
                  </div>

                  <div>
                    <Label>Memory Limit (KB)</Label>
                    <Input
                      type="number"
                      value={formData.memoryLimit}
                      onChange={(e) => setFormData({ ...formData, memoryLimit: parseInt(e.target.value) })}
                      min={64000}
                      max={512000}
                      step={64000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum memory usage (64MB - 512MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Function Signature (Advanced) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Function Signature (Advanced)</CardTitle>
                <CardDescription>
                  Define the exact function signature students must implement
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
                        onChange={(e) => setFormData({ 
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
                          'Function signature...'
                        }
                        className="mt-1 font-mono text-sm"
                        rows={2}
                      />
                    </div>
                  )
                })}
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated signatures. Students must follow this exact signature.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DndProvider>
  )
}
