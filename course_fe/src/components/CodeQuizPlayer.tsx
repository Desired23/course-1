import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { CodeEditor } from './CodeEditor'
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award,
  RefreshCw,
  Code2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  MemoryStick,
  Zap,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Moon,
  Sun,
  Info,
  Database
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { useUIStore } from '../stores/ui.store'
import { useQuizStore } from '../stores/quiz.store'
import { 
  SUPPORTED_LANGUAGES, 
  runTestCases, 
  calculateScore,
  getStarterCode,
  getLanguageById,
  wrapUserCode,
  shouldWrapUserCode,
  STATUS_DESCRIPTIONS,
  type TestCase,
  type TestResult
} from '../utils/judge0'

export interface CodeQuestion {
  id: number
  question: string
  description?: string
  type: 'code'
  language?: string // Default language (optional)
  allowedLanguages?: number[] // Language IDs allowed
  starterCode?: string
  testCases: TestCase[]
  timeLimit?: number // seconds
  memoryLimit?: number // KB
  difficulty?: 'easy' | 'medium' | 'hard'
  points?: number
  hints?: string[]
}

interface CodeQuizPlayerProps {
  question: CodeQuestion
  lessonId?: number // ✅ Add lessonId to track which lesson this belongs to
  onComplete?: (passed: boolean, score: number) => void
  onSubmit?: (code: string, language: number) => void
  className?: string
}

export function CodeQuizPlayer({ question, lessonId, onComplete, onSubmit, className }: CodeQuizPlayerProps) {
  const { saveQuizAnswer, getQuizAnswer } = useQuizStore()
  
  // ✅ Try to load saved answer first
  const savedAnswer = lessonId ? getQuizAnswer(question.id, lessonId) : undefined
  
  const [selectedLanguage, setSelectedLanguage] = useState<number>(
    savedAnswer?.language || question.allowedLanguages?.[0] || 63 // Load saved language or default to JavaScript
  )
  const [code, setCode] = useState<string>(
    savedAnswer?.code || question.starterCode || getStarterCode(getLanguageById(selectedLanguage)?.value || 'javascript')
  )
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(savedAnswer?.isSubmitted || false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [showHints, setShowHints] = useState(false)
  const [currentHint, setCurrentHint] = useState(0)
  const [runProgress, setRunProgress] = useState({ current: 0, total: 0 })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // ✅ Calculate score early (before useEffect that depends on it)
  const score = testResults.length > 0 ? calculateScore(testResults) : null
  const currentLang = getLanguageById(selectedLanguage)

  const normalizeOutput = (value?: string | null) => (value || '').replace(/\r\n/g, '\n').trim()
  const getDebugHint = (result: TestResult) => {
    const error = (result.error || '').toLowerCase()
    if (error.includes('compilation') || error.includes('compile')) {
      return 'Compilation error: Check syntax, missing imports, and function/class signatures.'
    }
    if (error.includes('runtime') || error.includes('exception') || error.includes('traceback')) {
      return 'Runtime error: Inspect edge cases, null/undefined access, array bounds, and division by zero.'
    }
    if (!result.passed) {
      return 'Wrong answer: Compare Expected vs Your Output. Pay attention to spaces, line breaks, and output format.'
    }
    return ''
  }

  // Filter allowed languages
  const allowedLanguages = question.allowedLanguages
    ? SUPPORTED_LANGUAGES.filter(lang => question.allowedLanguages?.includes(lang.id))
    : SUPPORTED_LANGUAGES

  // CRITICAL: Reset all state when question changes
  useEffect(() => {
    const defaultLang = question.allowedLanguages?.[0] || 63
    const lang = getLanguageById(defaultLang)
    const defaultCode = question.starterCode || getStarterCode(lang?.value || 'javascript')
    
    setSelectedLanguage(defaultLang)
    setCode(defaultCode)
    setTestResults([])
    setIsRunning(false)
    setIsSubmitted(false)
    setShowHints(false)
    setCurrentHint(0)
    setRunProgress({ current: 0, total: 0 })
  }, [question.id]) // Reset when question ID changes

  // Update starter code when language changes
  useEffect(() => {
    if (!code || code === question.starterCode) {
      const lang = getLanguageById(selectedLanguage)
      setCode(question.starterCode || getStarterCode(lang?.value || 'javascript'))
    }
  }, [selectedLanguage])

  // ✅ Auto-save code whenever it changes (debounced)
  useEffect(() => {
    if (!lessonId) return // Don't save if no lesson ID
    
    const timer = setTimeout(() => {
      saveQuizAnswer({
        questionId: question.id,
        lessonId,
        type: 'code',
        code,
        language: selectedLanguage,
        isSubmitted,
        isCorrect: score?.percentage === 100,
        score: score?.percentage,
        lastUpdated: new Date().toISOString()
      })
    }, 2000) // Debounce 2 seconds

    return () => clearTimeout(timer)
  }, [code, selectedLanguage, lessonId, question.id, isSubmitted, score])

  // Handle language change
  const handleLanguageChange = (languageId: string) => {
    const newLang = parseInt(languageId)
    if (confirm('Changing language will reset your code. Continue?')) {
      setSelectedLanguage(newLang)
      const lang = getLanguageById(newLang)
      setCode(question.starterCode || getStarterCode(lang?.value || 'javascript'))
    }
  }

  // Run code against test cases
  const handleRun = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    setIsRunning(true)
    setRunProgress({ current: 0, total: question.testCases.length })
    setTestResults([])

    try {
      const lang = getLanguageById(selectedLanguage)
      const languageValue = lang?.value || 'javascript'
      const shouldWrap = shouldWrapUserCode(code, languageValue)
      const executableCode = shouldWrap
        ? wrapUserCode(code, languageValue, '')
        : code

      console.log('Execution mode:', shouldWrap ? 'function-wrapper' : 'raw-stdin')
      
      const results = await runTestCases(
        executableCode,
        selectedLanguage,
        question.testCases,
        (current, total) => setRunProgress({ current, total })
      )
      
      setTestResults(results)
      
      const { passed, total, percentage } = calculateScore(results)
      
      if (passed === total) {
        toast.success(`All ${total} test cases passed! 🎉`)
      } else {
        toast.error(`${passed}/${total} test cases passed`)
      }
    } catch (error) {
      console.error('Error running tests:', error)
      toast.error('Failed to run test cases. Please try again.')
    } finally {
      setIsRunning(false)
      setRunProgress({ current: 0, total: 0 })
    }
  }

  // Submit solution
  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    if (testResults.length === 0) {
      toast.error('Please run your code first before submitting')
      return
    }

    const { passed, total, percentage } = calculateScore(testResults)
    
    if (passed < total) {
      if (!confirm(`Only ${passed}/${total} test cases passed. Submit anyway?`)) {
        return
      }
    }

    setIsSubmitted(true)
    
    if (onSubmit) {
      onSubmit(code, selectedLanguage)
    }
    
    if (onComplete) {
      onComplete(passed === total, percentage)
    }
    
    if (passed === total) {
      toast.success('Solution submitted successfully! 🎉')
    } else {
      toast.info('Solution submitted. You can retry later.')
    }
  }

  // Reset solution
  const handleReset = () => {
    if (confirm('Reset your code to starter template?')) {
      const lang = getLanguageById(selectedLanguage)
      setCode(question.starterCode || getStarterCode(lang?.value || 'javascript'))
      setTestResults([])
      setIsSubmitted(false)
    }
  }

  // Show next hint
  const showNextHint = () => {
    if (question.hints && currentHint < question.hints.length) {
      setCurrentHint(prev => prev + 1)
      setShowHints(true)
    }
  }

  // Results Summary (after submission)
  if (isSubmitted && testResults.length > 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Code Submission Results</CardTitle>
              <CardDescription>{question.question}</CardDescription>
            </div>
            <Badge variant={score?.percentage === 100 ? 'default' : 'secondary'}>
              {score?.percentage}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${
              score?.percentage === 100 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-orange-100 dark:bg-orange-900/20'
            }`}>
              {score?.percentage === 100 ? (
                <Award className="h-16 w-16 text-green-600" />
              ) : (
                <Code2 className="h-16 w-16 text-orange-600" />
              )}
            </div>
            <div>
              <h3 className="text-4xl font-bold mb-2">{score?.percentage}%</h3>
              <p className="text-muted-foreground">
                {score?.passed} / {score?.total} test cases passed
              </p>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            <h4 className="font-medium">Test Results</h4>
            {testResults.map((result, index) => (
              <Card key={result.id} className={result.passed ? 'border-green-500' : 'border-red-500'}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {result.isHidden ? `Hidden Test ${index + 1}` : `Test Case ${index + 1}`}
                      </span>
                    </div>
                    {result.time && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {result.time}s
                      </Badge>
                    )}
                  </div>
                  
                  {!result.isHidden && (
                    <div className="space-y-2 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Input:</span>
                        <pre className="bg-muted p-2 rounded mt-1 text-xs">{result.input || '(empty)'}</pre>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expected:</span>
                        <pre className="bg-muted p-2 rounded mt-1 text-xs">{result.expectedOutput}</pre>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Your Output:</span>
                        <pre className={`p-2 rounded mt-1 text-xs ${
                          result.passed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                        }`}>
                          {result.actualOutput || '(no output)'}
                        </pre>
                      </div>
                      {result.error && (
                        <div>
                          <span className="text-destructive">Error:</span>
                          <pre className="bg-destructive/10 p-2 rounded mt-1 text-xs text-destructive">
                            {result.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setIsSubmitted(false)
                setTestResults([])
              }} 
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex gap-0 relative min-h-[600px]">
      {/* Left Sidebar - Problem Description & Hints */}
      <motion.div
        initial={false}
        animate={{ width: isSidebarCollapsed ? '3rem' : '24rem' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative border-r bg-card flex-shrink-0"
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-4 top-4 z-10 h-8 w-8 rounded-full border bg-background p-0 shadow-md hover:shadow-lg transition-all"
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <AnimatePresence mode="wait">
          {isSidebarCollapsed ? (
            // Collapsed View
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsSidebarCollapsed(false)}
              className="flex flex-col items-center justify-start h-full pt-8 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="text-center space-y-6">
                <Code2 className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="rotate-90 text-lg font-bold tracking-wider whitespace-nowrap mt-24">Problem</p>
              </div>
            </motion.div>
          ) : (
            // Expanded View
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="h-5 w-5" />
                  <h3 className="font-semibold">{question.question}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {question.difficulty && (
                    <Badge variant={
                      question.difficulty === 'easy' ? 'default' :
                      question.difficulty === 'medium' ? 'secondary' : 'destructive'
                    } className="text-xs">
                      {question.difficulty}
                    </Badge>
                  )}
                  {question.points && (
                    <Badge variant="outline" className="text-xs">{question.points} pts</Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Description */}
                {question.description && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {question.description}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Constraints */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Constraints</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {question.timeLimit && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Time Limit: {question.timeLimit}s</span>
                      </div>
                    )}
                    {question.memoryLimit && (
                      <div className="flex items-center gap-2">
                        <MemoryStick className="h-3 w-3" />
                        <span>Memory Limit: {question.memoryLimit} KB</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sample Test Cases */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Sample Test Cases</h4>
                  <div className="space-y-3">
                    {question.testCases.filter(tc => !tc.isHidden).slice(0, 2).map((tc, idx) => (
                      <div key={idx} className="bg-muted/50 rounded p-3 text-xs">
                        <div className="mb-2">
                          <span className="font-medium">Input:</span>
                          <pre className="mt-1 bg-background p-2 rounded">{tc.input || '(empty)'}</pre>
                        </div>
                        <div>
                          <span className="font-medium">Expected Output:</span>
                          <pre className="mt-1 bg-background p-2 rounded">{tc.expectedOutput}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Hints */}
                {question.hints && question.hints.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Hints
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={showNextHint}
                        disabled={currentHint >= question.hints.length}
                        className="h-7 text-xs"
                      >
                        {showHints ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        Show Hint ({currentHint}/{question.hints.length})
                      </Button>
                    </div>
                    
                    {showHints && currentHint > 0 && (
                      <div className="space-y-2">
                        {question.hints.slice(0, currentHint).map((hint, idx) => (
                          <Alert key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-xs">
                              <strong>Hint {idx + 1}:</strong> {hint}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right Content - Code Editor & Results */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="border-0 rounded-none flex-1 flex flex-col">
          <CardHeader className="border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Language Selector */}
              <div className="flex items-center gap-4">
                <div className="w-48">
                  <Label className="text-xs">Language</Label>
                  <Select value={selectedLanguage.toString()} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedLanguages.map(lang => (
                        <SelectItem key={lang.id} value={lang.id.toString()}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <span className="text-xs text-muted-foreground">
                  solution.{currentLang?.extension || 'txt'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRun}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Code
                    </>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSubmit}
                  disabled={isRunning || testResults.length === 0}
                >
                  Submit Solution
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Code Editor */}
            <div className="flex-shrink-0" style={{ height: '450px' }}>
              <CodeEditor
                value={code}
                onChange={(newCode) => setCode(newCode)}
                language={currentLang?.value || 'javascript'}
                height="450px"
                showMinimap={false}
                fontSize={14}
                onSave={handleRun}
              />
            </div>

            {/* Run Progress */}
            {isRunning && runProgress.total > 0 && (
              <div className="p-4 border-t space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running test cases...
                  </span>
                  <span className="font-medium">{runProgress.current}/{runProgress.total}</span>
                </div>
                <Progress value={(runProgress.current / runProgress.total) * 100} />
              </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && !isSubmitted && (
              <div className="flex-1 overflow-y-auto border-t">
                <Tabs defaultValue="summary" className="h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 flex-shrink-0 overflow-x-auto flex-nowrap">
                    <TabsTrigger value="summary">
                      Summary ({score?.passed}/{score?.total})
                    </TabsTrigger>
                    {testResults.map((result, index) => (
                      <TabsTrigger 
                        key={index} 
                        value={`test-${index}`}
                        className="flex items-center gap-1"
                      >
                        {result.passed ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        Test {index + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <TabsContent value="summary" className="flex-1 overflow-y-auto p-4 mt-0">
                    <div className="space-y-4">
                      {/* Score Summary */}
                      <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{score?.total}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{score?.passed}</div>
                          <div className="text-xs text-muted-foreground">Passed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {score ? score.total - score.passed : 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{score?.percentage}%</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                      
                      {/* Test Results List */}
                      <div className="space-y-2">
                        {testResults.map((result, index) => (
                          <div 
                            key={result.id}
                            className={`flex items-center justify-between p-3 rounded border ${
                              result.passed ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {result.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="text-sm font-medium">
                                {result.isHidden ? `Hidden Test ${index + 1}` : `Test Case ${index + 1}`}
                              </span>
                            </div>
                            {result.time && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Zap className="h-3 w-3" />
                                {result.time}s
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {testResults.some((result) => !result.passed) && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Debug tip: Open each failed test tab to see full logs (stderr/compile output/message).
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Individual Test Case Tabs */}
                  {testResults.map((result, index) => (
                    <TabsContent key={result.id} value={`test-${index}`} className="space-y-4">
                      <div className="rounded-lg border border-border/50 bg-background/50 p-6 space-y-4">
                        {/* Test Case Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result.passed ? (
                              <CheckCircle2 className="size-6 text-green-600 dark:text-green-500" />
                            ) : (
                              <XCircle className="size-6 text-red-600 dark:text-red-500" />
                            )}
                            <div>
                              <h3 className="font-semibold">
                                {result.isHidden ? '🔒 Hidden Test Case' : `Test Case ${index + 1}`}
                              </h3>
                              <p className={`text-sm ${result.passed ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                {result.passed ? 'Passed' : 'Failed'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Execution Stats */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {result.time && (
                              <div className="flex items-center gap-1">
                                <Clock className="size-4" />
                                <span>{result.time}s</span>
                              </div>
                            )}
                            {result.memory && (
                              <div className="flex items-center gap-1">
                                <Database className="size-4" />
                                <span>{Math.round(result.memory / 1024)}MB</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Test Details */}
                        <div className="space-y-3">
                          {/* Input */}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Input:</label>
                            <pre className="bg-muted/50 rounded-md p-3 text-sm font-mono overflow-x-auto border border-border/30">
                              {result.input}
                            </pre>
                          </div>
                          
                          {/* Expected Output */}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Expected Output:</label>
                            <pre className="bg-muted/50 rounded-md p-3 text-sm font-mono overflow-x-auto border border-border/30">
                              {result.expectedOutput}
                            </pre>
                          </div>

                          {/* Actual Output - Always show */}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Your Output:</label>
                            <pre className={`bg-muted/50 rounded-md p-3 text-sm font-mono overflow-x-auto border ${
                              result.passed 
                                ? 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20' 
                                : 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20'
                            }`}>
                              {result.actualOutput || '(no output)'}
                            </pre>
                          </div>

                          {/* Error Details - Always show if present */}
                          {result.error && (
                            <div>
                              <label className="text-sm font-medium text-red-600 dark:text-red-400 mb-1 block">Error:</label>
                              <pre className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm font-mono overflow-x-auto text-red-900 dark:text-red-100">
                                {result.error}
                              </pre>
                            </div>
                          )}

                          {(result.debugLogs?.length || result.stderr || result.compileOutput || result.message || result.statusDescription) && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground mb-1 block">Debug Logs:</label>
                              {result.debugLogs && result.debugLogs.length > 0 && (
                                <pre className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-md p-3 text-sm font-mono overflow-x-auto text-slate-900 dark:text-slate-100">
                                  {result.debugLogs.join('\n')}
                                </pre>
                              )}
                              {result.statusDescription && (
                                <pre className="bg-muted/50 rounded-md p-3 text-sm font-mono overflow-x-auto border border-border/30">
                                  Status: {result.statusDescription}{result.statusId ? ` (${result.statusId})` : ''}
                                </pre>
                              )}
                              {result.compileOutput && (
                                <pre className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm font-mono overflow-x-auto text-amber-900 dark:text-amber-100">
                                  {result.compileOutput}
                                </pre>
                              )}
                              {result.stderr && (
                                <pre className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm font-mono overflow-x-auto text-red-900 dark:text-red-100">
                                  {result.stderr}
                                </pre>
                              )}
                              {result.message && (
                                <pre className="bg-muted/50 rounded-md p-3 text-sm font-mono overflow-x-auto border border-border/30">
                                  {result.message}
                                </pre>
                              )}
                            </div>
                          )}
                          
                          {/* Comparison Hint - Only for failed tests */}
                          {!result.passed && !result.error && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <p className="text-sm text-amber-900 dark:text-amber-100">
                                  <strong>Hint:</strong> Your output doesn't match the expected result. 
                                  Check for typos, wrong data types, or incorrect logic.
                                </p>
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
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Normalized Expected</label>
                                <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono overflow-x-auto border border-border/30">
                                  {normalizeOutput(result.expectedOutput) || '(empty)'}
                                </pre>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1 block">Normalized Actual</label>
                                <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono overflow-x-auto border border-border/30">
                                  {normalizeOutput(result.actualOutput) || '(empty)'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
