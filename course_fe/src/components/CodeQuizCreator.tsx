import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Code2, 
  Play,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Save
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { SUPPORTED_LANGUAGES, type TestCase } from '../utils/judge0'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

export interface CodeQuizData {
  id?: number
  question: string
  description?: string
  language?: string
  allowedLanguages: number[]
  starterCode?: string
  testCases: TestCase[]
  timeLimit?: number
  memoryLimit?: number
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  hints: string[]
}

interface CodeQuizCreatorProps {
  initialData?: CodeQuizData
  onSave: (data: CodeQuizData) => void
  onCancel?: () => void
}

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
                <Label className="font-semibold">Test Case {index + 1}</Label>
                <div className="flex items-center gap-2">
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

              {/* Input */}
              <div>
                <Label className="text-xs text-muted-foreground">Input (stdin)</Label>
                <Textarea
                  value={testCase.input}
                  onChange={(e) => onUpdate(index, { ...testCase, input: e.target.value })}
                  placeholder="e.g., 2,7,11,15\n9"
                  className="mt-1 font-mono text-sm"
                  rows={3}
                />
              </div>

              {/* Expected Output */}
              <div>
                <Label className="text-xs text-muted-foreground">Expected Output</Label>
                <Input
                  value={testCase.expectedOutput}
                  onChange={(e) => onUpdate(index, { ...testCase, expectedOutput: e.target.value })}
                  placeholder="e.g., 2,7"
                  className="mt-1 font-mono text-sm"
                />
              </div>

              {/* Points (Optional) */}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function CodeQuizCreator({ initialData, onSave, onCancel }: CodeQuizCreatorProps) {
  const [formData, setFormData] = useState<CodeQuizData>(initialData || {
    question: '',
    description: '',
    allowedLanguages: [63], // JavaScript default
    starterCode: '',
    testCases: [],
    timeLimit: 2,
    memoryLimit: 128000,
    difficulty: 'medium',
    points: 100,
    hints: []
  })

  const [currentHint, setCurrentHint] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.question.trim()) {
      newErrors.question = 'Question title is required'
    }

    if (formData.allowedLanguages.length === 0) {
      newErrors.languages = 'At least one language must be selected'
    }

    if (formData.testCases.length === 0) {
      newErrors.testCases = 'At least one test case is required'
    }

    formData.testCases.forEach((tc, idx) => {
      if (!tc.input.trim() && !tc.expectedOutput.trim()) {
        newErrors[`testCase_${idx}`] = 'Test case must have input or expected output'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle Save
  const handleSave = () => {
    if (validate()) {
      onSave(formData)
    }
  }

  // Test Cases Management
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

  // Hints Management
  const addHint = () => {
    if (currentHint.trim()) {
      setFormData({
        ...formData,
        hints: [...formData.hints, currentHint.trim()]
      })
      setCurrentHint('')
    }
  }

  const deleteHint = (index: number) => {
    setFormData({
      ...formData,
      hints: formData.hints.filter((_, i) => i !== index)
    })
  }

  // Language Selection
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  {initialData ? 'Edit Code Quiz' : 'Create Code Quiz'}
                </CardTitle>
                <CardDescription>
                  Design coding challenges with test cases and auto-grading
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

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="testcases">
              Test Cases ({formData.testCases.length})
            </TabsTrigger>
            <TabsTrigger value="hints">Hints ({formData.hints.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Info */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Question Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Title */}
                <div>
                  <Label>Question Title *</Label>
                  <Input
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="e.g., Two Sum Problem"
                    className={errors.question ? 'border-red-500' : ''}
                  />
                  {errors.question && (
                    <p className="text-xs text-red-500 mt-1">{errors.question}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed problem description..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Explain the problem, constraints, and examples
                  </p>
                </div>

                {/* Difficulty & Points */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
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

                {/* Starter Code */}
                <div>
                  <Label>Starter Code (Optional)</Label>
                  <Textarea
                    value={formData.starterCode}
                    onChange={(e) => setFormData({ ...formData, starterCode: e.target.value })}
                    placeholder="// Write your solution here\nfunction twoSum(nums, target) {\n  // Your code here\n}"
                    className="font-mono text-sm"
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Provide initial code template for students (leave empty for auto-generated)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Allowed Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Allowed Programming Languages *</CardTitle>
                <CardDescription>Select languages students can use</CardDescription>
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
          </TabsContent>

          {/* Tab 2: Test Cases */}
          <TabsContent value="testcases" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Test Cases *</CardTitle>
                    <CardDescription>
                      Define inputs and expected outputs for auto-grading
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
                    <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
                <p className="font-medium mb-2">Test Case Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Create comprehensive test cases covering edge cases and corner scenarios</li>
                  <li>First 1-2 test cases should serve as <strong>examples</strong> in the problem description</li>
                  <li>Input format: each line = one parameter (e.g., line 1: array, line 2: target)</li>
                  <li>Expected output should match exactly what the function returns</li>
                  <li>All test cases are visible to help students debug their solutions</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Tab 3: Hints */}
          <TabsContent value="hints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hints (Optional)</CardTitle>
                <CardDescription>
                  Provide progressive hints to help students solve the problem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Hint */}
                <div className="flex gap-2">
                  <Input
                    value={currentHint}
                    onChange={(e) => setCurrentHint(e.target.value)}
                    placeholder="Enter a hint..."
                    onKeyPress={(e) => e.key === 'Enter' && addHint()}
                  />
                  <Button onClick={addHint} disabled={!currentHint.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Hints List */}
                {formData.hints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No hints added yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.hints.map((hint, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <Badge variant="outline" className="mt-0.5">
                          {index + 1}
                        </Badge>
                        <p className="flex-1 text-sm">{hint}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHint(index)}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Settings */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Execution Settings</CardTitle>
                <CardDescription>
                  Configure time and memory limits for code execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DndProvider>
  )
}