import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">

            <div
              ref={drag}
              className="cursor-move pt-2 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>


            <div className="flex-1 space-y-3">

              <div className="flex items-center justify-between">
                <Label className="font-semibold">{t('code_quiz_creator.test_case_number', { number: index + 1 })}</Label>
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


              <div>
                <Label className="text-xs text-muted-foreground">{t('code_quiz_creator.input_stdin')}</Label>
                <Textarea
                  value={testCase.input}
                  onChange={(e) => onUpdate(index, { ...testCase, input: e.target.value })}
                  placeholder={t('code_quiz_creator.input_placeholder')}
                  className="mt-1 font-mono text-sm"
                  rows={3}
                />
              </div>


              <div>
                <Label className="text-xs text-muted-foreground">{t('code_quiz_creator.expected_output')}</Label>
                <Textarea
                  value={testCase.expectedOutput}
                  onChange={(e) => onUpdate(index, { ...testCase, expectedOutput: e.target.value })}
                  placeholder={t('code_quiz_creator.expected_output_placeholder')}
                  className="mt-1 font-mono text-sm"
                  rows={2}
                />
              </div>


              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{t('code_quiz_creator.points_optional')}</Label>
                  <Input
                    type="number"
                    value={testCase.points || ''}
                    onChange={(e) => onUpdate(index, {
                      ...testCase,
                      points: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    placeholder={t('code_quiz_creator.auto')}
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
  const { t } = useTranslation()
  const [formData, setFormData] = useState<CodeQuizData>(initialData || {
    question: '',
    description: '',
    allowedLanguages: [63],
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


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.question.trim()) {
      newErrors.question = t('code_quiz_creator.errors.question_required')
    }

    if (formData.allowedLanguages.length === 0) {
      newErrors.languages = t('code_quiz_creator.errors.languages_required')
    }

    if (formData.testCases.length === 0) {
      newErrors.testCases = t('code_quiz_creator.errors.test_cases_required')
    }

    formData.testCases.forEach((tc, idx) => {
      if (!tc.input.trim() && !tc.expectedOutput.trim()) {
        newErrors[`testCase_${idx}`] = t('code_quiz_creator.errors.test_case_content_required')
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }


  const handleSave = () => {
    if (validate()) {
      onSave(formData)
    }
  }


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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  {initialData ? t('code_quiz_creator.edit_title') : t('code_quiz_creator.create_title')}
                </CardTitle>
                <CardDescription>
                  {t('code_quiz_creator.description')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel}>
                    {t('code_quiz_creator.cancel')}
                  </Button>
                )}
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('code_quiz_creator.save_quiz')}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>


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
            <TabsTrigger value="basic">{t('code_quiz_creator.basic_info')}</TabsTrigger>
            <TabsTrigger value="testcases">
              {t('code_quiz_creator.test_cases_tab', { count: formData.testCases.length })}
            </TabsTrigger>
            <TabsTrigger value="hints">{t('code_quiz_creator.hints_tab', { count: formData.hints.length })}</TabsTrigger>
            <TabsTrigger value="settings">{t('code_quiz_creator.settings')}</TabsTrigger>
          </TabsList>


          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('code_quiz_creator.question_details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div>
                  <Label>{t('code_quiz_creator.question_title')}</Label>
                  <Input
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder={t('code_quiz_creator.question_title_placeholder')}
                    className={errors.question ? 'border-red-500' : ''}
                  />
                  {errors.question && (
                    <p className="text-xs text-red-500 mt-1">{errors.question}</p>
                  )}
                </div>


                <div>
                  <Label>{t('code_quiz_creator.field_description')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('code_quiz_creator.description_placeholder')}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('code_quiz_creator.description_help')}
                  </p>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('code_quiz_creator.difficulty')}</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">{t('code_quiz_creator.difficulty_easy')}</SelectItem>
                        <SelectItem value="medium">{t('code_quiz_creator.difficulty_medium')}</SelectItem>
                        <SelectItem value="hard">{t('code_quiz_creator.difficulty_hard')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('code_quiz_creator.points')}</Label>
                    <Input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>


                <div>
                  <Label>{t('code_quiz_creator.starter_code')}</Label>
                  <Textarea
                    value={formData.starterCode}
                    onChange={(e) => setFormData({ ...formData, starterCode: e.target.value })}
                    placeholder={t('code_quiz_creator.starter_code_placeholder')}
                    className="font-mono text-sm"
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('code_quiz_creator.starter_code_help')}
                  </p>
                </div>
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('code_quiz_creator.allowed_languages')}</CardTitle>
                <CardDescription>{t('code_quiz_creator.allowed_languages_help')}</CardDescription>
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


          <TabsContent value="testcases" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t('code_quiz_creator.test_cases')}</CardTitle>
                    <CardDescription>
                      {t('code_quiz_creator.test_cases_help')}
                    </CardDescription>
                  </div>
                  <Button onClick={addTestCase}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('code_quiz_creator.add_test_case')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formData.testCases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('code_quiz_creator.no_test_cases')}</p>
                    <p className="text-sm">{t('code_quiz_creator.add_test_case_prompt')}</p>
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


            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">{t('code_quiz_creator.guidelines.title')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t('code_quiz_creator.guidelines.cover_edge_cases')}</li>
                  <li>{t('code_quiz_creator.guidelines.examples_hint_prefix')} <strong>{t('code_quiz_creator.guidelines.examples_hint_emphasis')}</strong> {t('code_quiz_creator.guidelines.examples_hint_suffix')}</li>
                  <li>{t('code_quiz_creator.guidelines.input_format')}</li>
                  <li>{t('code_quiz_creator.guidelines.expected_output')}</li>
                  <li>{t('code_quiz_creator.guidelines.all_visible')}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>


          <TabsContent value="hints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('code_quiz_creator.hints_optional')}</CardTitle>
                <CardDescription>
                  {t('code_quiz_creator.hints_help')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="flex gap-2">
                  <Input
                    value={currentHint}
                    onChange={(e) => setCurrentHint(e.target.value)}
                    placeholder={t('code_quiz_creator.hint_placeholder')}
                    onKeyPress={(e) => e.key === 'Enter' && addHint()}
                  />
                  <Button onClick={addHint} disabled={!currentHint.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('code_quiz_creator.add')}
                  </Button>
                </div>


                {formData.hints.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">{t('code_quiz_creator.no_hints')}</p>
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


          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('code_quiz_creator.execution_settings')}</CardTitle>
                <CardDescription>
                  {t('code_quiz_creator.execution_settings_help')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('code_quiz_creator.time_limit')}</Label>
                  <Input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                    min={1}
                    max={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('code_quiz_creator.time_limit_help')}
                  </p>
                </div>

                <div>
                  <Label>{t('code_quiz_creator.memory_limit')}</Label>
                  <Input
                    type="number"
                    value={formData.memoryLimit}
                    onChange={(e) => setFormData({ ...formData, memoryLimit: parseInt(e.target.value) })}
                    min={64000}
                    max={512000}
                    step={64000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('code_quiz_creator.memory_limit_help')}
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
