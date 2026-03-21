import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Separator } from './ui/separator'
import {
  BookOpen,
  Code2,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import { EnhancedCodeQuizData } from './EnhancedCodeQuizCreator'
import Editor from '@monaco-editor/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { SUPPORTED_LANGUAGES, runTestCases, wrapUserCode, shouldWrapUserCode, type TestResult } from '../utils/judge0'
import { useQuizStore } from '../stores/quiz.store'
import { getQuizResultByEnrollmentAndLesson, upsertQuizResultDraft } from '../services/quiz-results.api'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { useTranslation } from 'react-i18next'

interface EnhancedCodeQuizPlayerProps {
  quiz: EnhancedCodeQuizData
  lessonId: number
  enrollmentId?: number
  onComplete?: (score: number, isCorrect: boolean) => void
}

export function EnhancedCodeQuizPlayer({ quiz, lessonId, enrollmentId, onComplete }: EnhancedCodeQuizPlayerProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(quiz.allowedLanguages[0])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showHints, setShowHints] = useState<number[]>([])
  const [showSolution, setShowSolution] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(enrollmentId ? 'saved' : 'idle')
  
  const { saveQuizAnswer, getQuizAnswer } = useQuizStore()
  const saveStatusLabel = saveStatus === 'saving'
    ? t('enhanced_code_quiz_player.saving')
    : saveStatus === 'saved'
      ? t('enhanced_code_quiz_player.saved_cloud')
      : saveStatus === 'error'
        ? t('enhanced_code_quiz_player.save_failed')
        : t('enhanced_code_quiz_player.saved_local')
  const normalizeOutput = (value?: string | null) => (value || '').replace(/\r\n/g, '\n').trim()
  const getDebugHint = (result: TestResult) => {
    const error = (result.error || '').toLowerCase()
    if (error.includes('compilation') || error.includes('compile')) {
      return t('enhanced_code_quiz_player.compile_error_hint')
    }
    if (error.includes('runtime') || error.includes('exception') || error.includes('traceback')) {
      return t('enhanced_code_quiz_player.runtime_error_hint')
    }
    if (!result.passed) {
      return t('enhanced_code_quiz_player.wrong_answer_hint')
    }
    return ''
  }

  // Load saved answer
  useEffect(() => {
    if (quiz.id) {
      const saved = getQuizAnswer(quiz.id, lessonId)
      if (saved && saved.code) {
        setCode(saved.code)
        if (saved.language) {
          setSelectedLanguage(saved.language)
        }
        if (saved.isSubmitted) {
          setIsSubmitted(true)
        }
      } else {
        // Load starter code or function signature
        const starterCode = quiz.starterCode?.[selectedLanguage] || 
                           quiz.functionSignature?.[selectedLanguage] || 
                           getDefaultStarterCode(selectedLanguage)
        setCode(starterCode)
      }
    }
  }, [quiz.id, lessonId, selectedLanguage])

  useEffect(() => {
    let cancelled = false

    async function loadServerDraft() {
      if (!quiz.id || !enrollmentId) return

      try {
        const existing = await getQuizResultByEnrollmentAndLesson(enrollmentId, lessonId)
        if (cancelled || !existing) return

        const answer = existing.answers?.[String(quiz.id)]
        if (!answer) return

        if (typeof answer.code_answer === 'string' && answer.code_answer.trim()) {
          setCode(answer.code_answer)
        }
        if (typeof answer.language === 'number') {
          setSelectedLanguage(answer.language)
        }
        if (typeof answer.is_submitted === 'boolean') {
          setIsSubmitted(answer.is_submitted)
        }
        if (enrollmentId) {
          setSaveStatus('saved')
        }
      } catch (error) {
        console.error('Failed to load enhanced code quiz draft:', error)
        if (enrollmentId) {
          setSaveStatus('error')
        }
      }
    }

    loadServerDraft()
    return () => { cancelled = true }
  }, [quiz.id, lessonId, enrollmentId])

  // Auto-save code (debounced)
  useEffect(() => {
    if (!quiz.id) return
    if (enrollmentId) {
      setSaveStatus('saving')
    }
    
    const timer = setTimeout(() => {
      if (code.trim()) {
        saveQuizAnswer({
          questionId: quiz.id!,
          lessonId,
          type: 'code',
          code,
          language: selectedLanguage,
          isSubmitted: isSubmitted,
          lastUpdated: new Date().toISOString()
        })

        if (enrollmentId) {
          void upsertQuizResultDraft(enrollmentId, lessonId, {
            answers: {
              [String(quiz.id)]: {
                code_answer: code,
                language: selectedLanguage,
                is_submitted: isSubmitted,
              }
            },
            submit_time: isSubmitted ? new Date().toISOString() : null,
          }).then(() => {
            setSaveStatus('saved')
          }).catch((error) => {
            console.error('Failed to save enhanced code quiz draft to server:', error)
            setSaveStatus('error')
          })
        } else {
          setSaveStatus('idle')
        }
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [code, selectedLanguage, quiz.id, lessonId, enrollmentId, isSubmitted])

  // Get default starter code based on language
  const getDefaultStarterCode = (languageId: number): string => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.id === languageId)
    if (!lang) return ''

    switch (lang.value) {
      case 'javascript':
        return `${t('enhanced_code_quiz_player.starter_comment_js')}\nfunction solution() {\n  \n}\n`
      case 'python':
        return `${t('enhanced_code_quiz_player.starter_comment_py')}\ndef solution():\n    pass\n`
      case 'java':
        return `${t('enhanced_code_quiz_player.starter_comment_js')}\npublic class Solution {\n    public void solution() {\n        \n    }\n}\n`
      case 'cpp':
        return `${t('enhanced_code_quiz_player.starter_comment_js')}\n#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    \n}\n`
      default:
        return `${t('enhanced_code_quiz_player.starter_comment_js')}\n`
    }
  }

  // Run test cases
  const handleRun = async () => {
    if (!code.trim()) {
      toast.error(t('enhanced_code_quiz_player.write_code_first'))
      return
    }

    setIsRunning(true)
    setTestResults([])

    try {
      const results = await runTestCases(getExecutableCode(), selectedLanguage, quiz.testCases, {
        timeLimit: quiz.timeLimit,
        memoryLimit: quiz.memoryLimit
      })
      
      setTestResults(results)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      
      if (passed === total) {
        toast.success(t('enhanced_code_quiz_player.all_tests_passed', { passed, total }))
      } else {
        toast.warning(t('enhanced_code_quiz_player.tests_passed', { passed, total }))
      }
    } catch (error: any) {
      toast.error(error.message || t('enhanced_code_quiz_player.run_failed'))
    } finally {
      setIsRunning(false)
    }
  }

  // Submit solution
  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error(t('enhanced_code_quiz_player.write_code_first'))
      return
    }

    setIsRunning(true)

    try {
      const results = await runTestCases(getExecutableCode(), selectedLanguage, quiz.testCases, {
        timeLimit: quiz.timeLimit,
        memoryLimit: quiz.memoryLimit
      })
      
      setTestResults(results)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const score = Math.round((passed / total) * quiz.points)
      const isCorrect = passed === total

      setIsSubmitted(true)

      // Save submission
      if (quiz.id) {
        saveQuizAnswer({
          questionId: quiz.id,
          lessonId,
          type: 'code',
          code,
          language: selectedLanguage,
          isSubmitted: true,
          isCorrect,
          score,
          lastUpdated: new Date().toISOString()
        })
      }

      if (isCorrect) {
        toast.success(t('enhanced_code_quiz_player.perfect_score', { score, points: quiz.points }))
      } else {
        toast.warning(t('enhanced_code_quiz_player.score_message', { passed, total, score, points: quiz.points }))
      }

      onComplete?.(score, isCorrect)
    } catch (error: any) {
      toast.error(error.message || t('enhanced_code_quiz_player.submit_failed'))
    } finally {
      setIsRunning(false)
    }
  }

  // Toggle hint visibility
  const toggleHint = (index: number) => {
    if (showHints.includes(index)) {
      setShowHints(showHints.filter(i => i !== index))
    } else {
      setShowHints([...showHints, index])
    }
  }

  const getDifficultyColor = () => {
    switch (quiz.learningObjectives.difficulty) {
      case 'easy': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'hard': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getExecutableCode = (): string => {
    const langValue = SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage)?.value || 'javascript'
    return shouldWrapUserCode(code, langValue) ? wrapUserCode(code, langValue, '') : code
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">{quiz.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getDifficultyColor()}>
                  {quiz.learningObjectives.difficulty.toUpperCase()}
                </Badge>
                <Badge variant="outline">{quiz.points} points</Badge>
                <Badge variant={saveStatus === 'error' ? 'destructive' : 'outline'}>
                  {saveStatus === 'saving' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {saveStatusLabel}
                </Badge>
                {quiz.learningObjectives.estimatedTime && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    ~{quiz.learningObjectives.estimatedTime} min
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {isSubmitted && (
            <Badge variant="secondary" className="text-green-600">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {t('enhanced_code_quiz_player.submitted')}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 border-r overflow-y-auto p-6">
          <Tabs defaultValue="description">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="description">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('enhanced_code_quiz_player.description')}
              </TabsTrigger>
              <TabsTrigger value="hints">
                <Lightbulb className="h-4 w-4 mr-2" />
                {t('enhanced_code_quiz_player.hints', { count: quiz.hints.length })}
              </TabsTrigger>
              {quiz.solution && (
                <TabsTrigger value="solution">
                  <Eye className="h-4 w-4 mr-2" />
                  {t('enhanced_code_quiz_player.solution')}
                </TabsTrigger>
              )}
            </TabsList>

            {/* Description Tab */}
            <TabsContent value="description" className="space-y-6 mt-6">
              {/* Problem Statement */}
              <div>
                <h2 className="text-lg font-semibold mb-3">{t('enhanced_code_quiz_player.problem')}</h2>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-foreground">
                    {quiz.problemStatement.description}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Examples */}
              {quiz.examples.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">{t('enhanced_code_quiz_player.examples')}</h2>
                  <div className="space-y-4">
                    {quiz.examples.map((example, idx) => (
                      <Card key={example.id}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="font-semibold text-sm">{t('enhanced_code_quiz_player.example', { index: idx + 1 })}</div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">{t('enhanced_code_quiz_player.input')}</div>
                              <pre className="bg-muted p-2 rounded text-sm font-mono">
                                {example.input}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">{t('enhanced_code_quiz_player.output')}</div>
                              <pre className="bg-muted p-2 rounded text-sm font-mono">
                                {example.output}
                              </pre>
                            </div>
                            {example.explanation && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">{t('enhanced_code_quiz_player.explanation')}</div>
                                <p className="text-sm">{example.explanation}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Constraints */}
              {quiz.constraints.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">{t('enhanced_code_quiz_player.constraints')}</h2>
                  <ul className="space-y-2">
                    {quiz.constraints.map((constraint, idx) => (
                      <li key={constraint.id} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <code className="text-sm">{constraint.description}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Input/Output Format */}
              {(quiz.problemStatement.inputFormat || quiz.problemStatement.outputFormat) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {quiz.problemStatement.inputFormat && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">{t('enhanced_code_quiz_player.input_format')}</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {quiz.problemStatement.inputFormat}
                        </p>
                      </div>
                    )}
                    {quiz.problemStatement.outputFormat && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">{t('enhanced_code_quiz_player.output_format')}</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {quiz.problemStatement.outputFormat}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Notes */}
              {quiz.problemStatement.notes && (
                <>
                  <Separator />
                  <Alert>
                    <AlertDescription>
                      <div className="whitespace-pre-wrap text-sm">
                        {quiz.problemStatement.notes}
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {/* Learning Objectives */}
              <Separator />
              <div>
                <h2 className="text-lg font-semibold mb-3">{t('enhanced_code_quiz_player.learning_title')}</h2>
                <div className="grid grid-cols-3 gap-4">
                  {quiz.learningObjectives.algorithm && quiz.learningObjectives.algorithm.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">{t('enhanced_code_quiz_player.algorithms')}</div>
                      <div className="space-y-1">
                        {quiz.learningObjectives.algorithm.map((algo, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs mr-1 mb-1">
                            {algo}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {quiz.learningObjectives.dataStructure && quiz.learningObjectives.dataStructure.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">{t('enhanced_code_quiz_player.data_structures')}</div>
                      <div className="space-y-1">
                        {quiz.learningObjectives.dataStructure.map((ds, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs mr-1 mb-1">
                            {ds}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {quiz.learningObjectives.skills && quiz.learningObjectives.skills.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">{t('enhanced_code_quiz_player.skills')}</div>
                      <div className="space-y-1">
                        {quiz.learningObjectives.skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs mr-1 mb-1">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Hints Tab */}
            <TabsContent value="hints" className="space-y-4 mt-6">
              {quiz.hints.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('enhanced_code_quiz_player.no_hints')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      {t('enhanced_code_quiz_player.click_hint')}
                    </AlertDescription>
                  </Alert>

                  {quiz.hints.map((hint, idx) => (
                    <Card key={idx}>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{t('enhanced_code_quiz_player.hint_level', { level: hint.level })}</Badge>
                                <Badge variant="secondary">
                                  {hint.type === 'idea' && t('enhanced_code_quiz_player.hint_idea')}
                                  {hint.type === 'data-structure' && t('enhanced_code_quiz_player.hint_data_structure')}
                                  {hint.type === 'algorithm' && t('enhanced_code_quiz_player.hint_algorithm')}
                                  {hint.type === 'pseudocode' && t('enhanced_code_quiz_player.hint_pseudocode')}
                                </Badge>
                              </div>
                              {showHints.includes(idx) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent>
                            <p className="text-sm whitespace-pre-wrap">{hint.content}</p>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Solution Tab */}
            {quiz.solution && (
              <TabsContent value="solution" className="space-y-4 mt-6">
                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertDescription>
                    {t('enhanced_code_quiz_player.solution_warning')}
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('enhanced_code_quiz_player.approach')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{quiz.solution.approach}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{t('enhanced_code_quiz_player.time_complexity')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-lg font-bold">{quiz.solution.timeComplexity}</code>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{t('enhanced_code_quiz_player.space_complexity')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-lg font-bold">{quiz.solution.spaceComplexity}</code>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('enhanced_code_quiz_player.solution_code')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm font-mono">{quiz.solution.code}</code>
                    </pre>
                  </CardContent>
                </Card>

                {quiz.solution.explanation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t('enhanced_code_quiz_player.explanation')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{quiz.solution.explanation}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Editor Header */}
          <div className="border-b p-3 flex items-center justify-between bg-card">
            <Select
              value={selectedLanguage.toString()}
              onValueChange={(value) => setSelectedLanguage(parseInt(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quiz.allowedLanguages.map((langId) => {
                  const lang = SUPPORTED_LANGUAGES.find(l => l.id === langId)
                  return lang ? (
                    <SelectItem key={langId} value={langId.toString()}>
                      {lang.value}
                    </SelectItem>
                  ) : null
                })}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRun}
                disabled={isRunning}
              >
                <Play className="h-4 w-4 mr-2" />
                {t('enhanced_code_quiz_player.run')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isRunning}
              >
                <Trophy className="h-4 w-4 mr-2" />
                {t('enhanced_code_quiz_player.submit')}
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage)?.value || 'javascript'}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on'
              }}
            />
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="border-t max-h-[300px] overflow-y-auto">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t('enhanced_code_quiz_player.test_results')}</h3>
                  <Badge variant={testResults.every(r => r.passed) ? 'default' : 'destructive'}>
                    {testResults.filter(r => r.passed).length} / {testResults.length} {t('code_debug_panel.passed')}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {testResults.map((result, idx) => (
                    <Card key={idx} className={result.passed ? 'border-green-500' : 'border-red-500'}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={result.passed ? 'default' : 'destructive'}>
                              {t('code_debug_panel.test_case', { index: idx + 1 })}
                            </Badge>
                            {result.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {result.time && (
                            <Badge variant="outline" className="text-xs">
                              {result.time}s
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">{t('enhanced_code_quiz_player.input')}</div>
                            <pre className="bg-muted p-2 rounded text-xs font-mono">
                              {result.input}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">{t('code_debug_panel.expected_output')}:</div>
                            <pre className="bg-muted p-2 rounded text-xs font-mono">
                              {result.expectedOutput}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">{t('enhanced_code_quiz_player.actual')}</div>
                            <pre className={`p-2 rounded text-xs font-mono ${
                              result.passed ? 'bg-green-500/10' : 'bg-red-500/10'
                            }`}>
                              {result.actualOutput || t('enhanced_code_quiz_player.no_output')}
                            </pre>
                          </div>
                          {result.error && (
                            <div>
                              <div className="text-xs text-muted-foreground">{t('enhanced_code_quiz_player.error')}</div>
                              <pre className="bg-red-500/10 p-2 rounded text-xs font-mono text-red-500">
                                {result.error}
                              </pre>
                            </div>
                          )}
                          {(result.debugLogs?.length || result.stderr || result.compileOutput || result.message || result.statusDescription) && (
                            <div>
                              <div className="text-xs text-muted-foreground">{t('enhanced_code_quiz_player.debug_logs')}</div>
                              <div className="space-y-1 mt-1">
                                {result.debugLogs && result.debugLogs.length > 0 && (
                                  <pre className="bg-slate-500/10 p-2 rounded text-xs font-mono text-slate-700 dark:text-slate-200">
                                    {result.debugLogs.join('\n')}
                                  </pre>
                                )}
                                {result.statusDescription && (
                                  <pre className="bg-muted p-2 rounded text-xs font-mono">
                                    {t('enhanced_code_quiz_player.status')} {result.statusDescription}{result.statusId ? ` (${result.statusId})` : ''}
                                  </pre>
                                )}
                                {result.compileOutput && (
                                  <pre className="bg-amber-500/10 p-2 rounded text-xs font-mono text-amber-700 dark:text-amber-300">
                                    {result.compileOutput}
                                  </pre>
                                )}
                                {result.stderr && (
                                  <pre className="bg-red-500/10 p-2 rounded text-xs font-mono text-red-500">
                                    {result.stderr}
                                  </pre>
                                )}
                                {result.message && (
                                  <pre className="bg-muted p-2 rounded text-xs font-mono">
                                    {result.message}
                                  </pre>
                                )}
                              </div>
                            </div>
                          )}
                          {!result.passed && (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription>{getDebugHint(result)}</AlertDescription>
                            </Alert>
                          )}
                          {!result.passed && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground">{t('enhanced_code_quiz_player.normalized_expected')}</div>
                                <pre className="bg-muted p-2 rounded text-xs font-mono">
                                  {normalizeOutput(result.expectedOutput) || '(empty)'}
                                </pre>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">{t('enhanced_code_quiz_player.normalized_actual')}</div>
                                <pre className="bg-muted p-2 rounded text-xs font-mono">
                                  {normalizeOutput(result.actualOutput) || '(empty)'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {testResults.some(result => !result.passed) && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('enhanced_code_quiz_player.rerun_hint')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
