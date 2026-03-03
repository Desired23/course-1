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
import { SUPPORTED_LANGUAGES, runTestCases, type TestResult } from '../utils/judge0'
import { useQuizStore } from '../stores/quiz.store'
import { toast } from 'sonner@2.0.3'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

interface EnhancedCodeQuizPlayerProps {
  quiz: EnhancedCodeQuizData
  lessonId: number
  onComplete?: (score: number, isCorrect: boolean) => void
}

export function EnhancedCodeQuizPlayer({ quiz, lessonId, onComplete }: EnhancedCodeQuizPlayerProps) {
  const [code, setCode] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(quiz.allowedLanguages[0])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showHints, setShowHints] = useState<number[]>([])
  const [showSolution, setShowSolution] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const { saveQuizAnswer, getQuizAnswer } = useQuizStore()

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

  // Auto-save code (debounced)
  useEffect(() => {
    if (!quiz.id) return
    
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
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [code, selectedLanguage, quiz.id, lessonId, isSubmitted])

  // Get default starter code based on language
  const getDefaultStarterCode = (languageId: number): string => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.id === languageId)
    if (!lang) return ''

    switch (lang.value) {
      case 'javascript':
        return `// Write your solution here\nfunction solution() {\n  \n}\n`
      case 'python':
        return `# Write your solution here\ndef solution():\n    pass\n`
      case 'java':
        return `// Write your solution here\npublic class Solution {\n    public void solution() {\n        \n    }\n}\n`
      case 'cpp':
        return `// Write your solution here\n#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    \n}\n`
      default:
        return `// Write your solution here\n`
    }
  }

  // Run test cases
  const handleRun = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    setIsRunning(true)
    setTestResults([])

    try {
      const results = await runTestCases(code, selectedLanguage, quiz.testCases, {
        timeLimit: quiz.timeLimit,
        memoryLimit: quiz.memoryLimit
      })
      
      setTestResults(results)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      
      if (passed === total) {
        toast.success(`All tests passed! (${passed}/${total})`)
      } else {
        toast.warning(`${passed}/${total} tests passed`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to run tests')
    } finally {
      setIsRunning(false)
    }
  }

  // Submit solution
  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    setIsRunning(true)

    try {
      const results = await runTestCases(code, selectedLanguage, quiz.testCases, {
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
        toast.success(`🎉 Perfect! All tests passed! Score: ${score}/${quiz.points}`)
      } else {
        toast.warning(`${passed}/${total} tests passed. Score: ${score}/${quiz.points}`)
      }

      onComplete?.(score, isCorrect)
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit')
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
              Submitted
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
                Description
              </TabsTrigger>
              <TabsTrigger value="hints">
                <Lightbulb className="h-4 w-4 mr-2" />
                Hints ({quiz.hints.length})
              </TabsTrigger>
              {quiz.solution && (
                <TabsTrigger value="solution">
                  <Eye className="h-4 w-4 mr-2" />
                  Solution
                </TabsTrigger>
              )}
            </TabsList>

            {/* Description Tab */}
            <TabsContent value="description" className="space-y-6 mt-6">
              {/* Problem Statement */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Problem</h2>
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
                  <h2 className="text-lg font-semibold mb-3">Examples</h2>
                  <div className="space-y-4">
                    {quiz.examples.map((example, idx) => (
                      <Card key={example.id}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="font-semibold text-sm">Example {idx + 1}:</div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Input:</div>
                              <pre className="bg-muted p-2 rounded text-sm font-mono">
                                {example.input}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Output:</div>
                              <pre className="bg-muted p-2 rounded text-sm font-mono">
                                {example.output}
                              </pre>
                            </div>
                            {example.explanation && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Explanation:</div>
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
                  <h2 className="text-lg font-semibold mb-3">Constraints</h2>
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
                        <h3 className="font-semibold text-sm mb-2">Input Format:</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {quiz.problemStatement.inputFormat}
                        </p>
                      </div>
                    )}
                    {quiz.problemStatement.outputFormat && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">Output Format:</h3>
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
                <h2 className="text-lg font-semibold mb-3">What You'll Learn</h2>
                <div className="grid grid-cols-3 gap-4">
                  {quiz.learningObjectives.algorithm && quiz.learningObjectives.algorithm.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">🧮 Algorithms</div>
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
                      <div className="text-sm font-medium mb-2">📊 Data Structures</div>
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
                      <div className="text-sm font-medium mb-2">💡 Skills</div>
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
                  <p>No hints available for this problem</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      Click on a hint to reveal it. Try solving without hints first!
                    </AlertDescription>
                  </Alert>

                  {quiz.hints.map((hint, idx) => (
                    <Card key={idx}>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Hint {hint.level}</Badge>
                                <Badge variant="secondary">
                                  {hint.type === 'idea' && '💡 Idea'}
                                  {hint.type === 'data-structure' && '📊 Data Structure'}
                                  {hint.type === 'algorithm' && '🧮 Algorithm'}
                                  {hint.type === 'pseudocode' && '📝 Pseudocode'}
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
                    ⚠️ Try solving the problem yourself before viewing the solution!
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Approach</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{quiz.solution.approach}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Time Complexity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-lg font-bold">{quiz.solution.timeComplexity}</code>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Space Complexity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-lg font-bold">{quiz.solution.spaceComplexity}</code>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Solution Code</CardTitle>
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
                      <CardTitle className="text-base">Explanation</CardTitle>
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
                Run
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isRunning}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Submit
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
                  <h3 className="font-semibold">Test Results</h3>
                  <Badge variant={testResults.every(r => r.passed) ? 'default' : 'destructive'}>
                    {testResults.filter(r => r.passed).length} / {testResults.length} Passed
                  </Badge>
                </div>

                <div className="space-y-2">
                  {testResults.map((result, idx) => (
                    <Card key={idx} className={result.passed ? 'border-green-500' : 'border-red-500'}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={result.passed ? 'default' : 'destructive'}>
                              Test {idx + 1}
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
                            <div className="text-xs text-muted-foreground">Input:</div>
                            <pre className="bg-muted p-2 rounded text-xs font-mono">
                              {result.input}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Expected:</div>
                            <pre className="bg-muted p-2 rounded text-xs font-mono">
                              {result.expectedOutput}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Actual:</div>
                            <pre className={`p-2 rounded text-xs font-mono ${
                              result.passed ? 'bg-green-500/10' : 'bg-red-500/10'
                            }`}>
                              {result.actualOutput || 'No output'}
                            </pre>
                          </div>
                          {result.error && (
                            <div>
                              <div className="text-xs text-muted-foreground">Error:</div>
                              <pre className="bg-red-500/10 p-2 rounded text-xs font-mono text-red-500">
                                {result.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}