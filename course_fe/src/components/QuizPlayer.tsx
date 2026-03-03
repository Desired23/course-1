import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import { Alert, AlertDescription } from './ui/alert'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Trash2,
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { CodeQuizPlayer, type CodeQuestion } from './CodeQuizPlayer'
import { useQuizStore } from '../stores/quiz.store'

export interface QuizQuestion {
  id: number
  question: string
  type: 'single' | 'multiple' | 'code'
  options?: string[]
  correctAnswer?: number | number[] // Index or array of indices
  explanation?: string
  points?: number
  image?: string // Optional image URL
  code?: string // Optional code snippet
  codeLanguage?: string // Language for syntax highlighting
  // Code question specific fields
  codeQuestion?: CodeQuestion
}

export interface Quiz {
  id: number
  title: string
  description?: string
  passingScore: number // percentage
  timeLimit?: number // in minutes
  questions: QuizQuestion[]
  attempts?: number
  bestScore?: number
}

interface QuizPlayerProps {
  quiz: Quiz
  lessonId?: number // ✅ Add lessonId to track which lesson
  onComplete?: (score: number, passed: boolean) => void
  onClose?: () => void
  onNext?: () => void // ✅ Callback to move to next lesson
  savedProgress?: Record<number, number | number[]> // Saved answers
  onProgressChange?: (answers: Record<number, number | number[]>) => void
}

export function QuizPlayer({ quiz, lessonId, onComplete, onClose, onNext, savedProgress, onProgressChange }: QuizPlayerProps) {
  const { saveQuizAnswer, getQuizAnswer } = useQuizStore()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number | number[]>>(savedProgress || {})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null)

  // Check if quiz has questions
  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl mb-2">No Questions Available</h3>
            <p className="text-muted-foreground mb-4">This quiz doesn't have any questions yet.</p>
            {onClose && (
              <Button onClick={onClose}>Go Back</Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const totalQuestions = quiz.questions.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100
  
  // Check if there's saved progress
  const hasSavedProgress = savedProgress && Object.keys(savedProgress).length > 0
  const answeredCount = Object.keys(answers).filter(key => {
    const answer = answers[parseInt(key)]
    if (answer === undefined || answer === null) return false
    if (Array.isArray(answer)) return answer.length > 0
    return true
  }).length

  // Handle answer selection
  const handleAnswerChange = (questionId: number, answer: number | number[]) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer
    }
    setAnswers(newAnswers)
    
    // ✅ Save MCQ/True-False answers to Zustand
    if (lessonId) {
      const question = quiz.questions.find(q => q.id === questionId)
      if (question && (question.type === 'single' || question.type === 'multiple')) {
        const isCorrect = question.type === 'single'
          ? answer === question.correctAnswer
          : JSON.stringify((answer as number[]).sort()) === JSON.stringify((question.correctAnswer as number[]).sort())
        
        saveQuizAnswer({
          questionId,
          lessonId,
          type: question.type === 'single' ? 'true_false' : 'multiple_choice',
          selectedAnswers: Array.isArray(answer) ? answer : [answer as number],
          isSubmitted: false, // Not submitted yet
          isCorrect,
          lastUpdated: new Date().toISOString()
        })
      }
    }
    
    // Save progress callback
    if (onProgressChange) {
      onProgressChange(newAnswers)
    }
  }

  // Handle single choice selection
  const handleSingleChoice = (questionId: number, optionIndex: number) => {
    handleAnswerChange(questionId, optionIndex)
  }

  // Handle multiple choice selection
  const handleMultipleChoice = (questionId: number, optionIndex: number, checked: boolean) => {
    const currentAnswers = (answers[questionId] as number[]) || []
    if (checked) {
      handleAnswerChange(questionId, [...currentAnswers, optionIndex])
    } else {
      handleAnswerChange(questionId, currentAnswers.filter(i => i !== optionIndex))
    }
  }

  // Calculate score
  const calculateScore = () => {
    let correctCount = 0
    quiz.questions.forEach(question => {
      const userAnswer = answers[question.id]
      const correctAnswer = question.correctAnswer

      if (question.type === 'single') {
        if (userAnswer === correctAnswer) {
          correctCount++
        }
      } else {
        // Multiple choice - check if arrays are equal
        const userAnswerArray = (userAnswer as number[] || []).sort()
        const correctAnswerArray = (correctAnswer as number[]).sort()
        if (JSON.stringify(userAnswerArray) === JSON.stringify(correctAnswerArray)) {
          correctCount++
        }
      }
    })

    return Math.round((correctCount / totalQuestions) * 100)
  }

  // Submit quiz
  const handleSubmit = () => {
    console.log('Current answers:', answers) // Debug log
    console.log('Quiz questions:', quiz.questions.map(q => ({ id: q.id, type: q.type }))) // Debug log
    
    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter(q => {
      const answer = answers[q.id]
      console.log(`Question ${q.id} (${q.type}):`, answer) // Debug log
      
      // For single choice: must have a valid answer (including 0)
      if (q.type === 'single') {
        return typeof answer !== 'number'
      }
      // For multiple choice: must have at least one option selected
      if (q.type === 'multiple') {
        return !Array.isArray(answer) || answer.length === 0
      }
      return true
    })
    
    console.log('Unanswered questions:', unansweredQuestions) // Debug log
    
    if (unansweredQuestions.length > 0) {
      toast.error(`Please answer all questions (${unansweredQuestions.length} remaining)`)
      return
    }

    setIsSubmitted(true)
    setShowResults(true)
    const score = calculateScore()
    const passed = score >= quiz.passingScore
    
    if (onComplete) {
      onComplete(score, passed)
    }

    if (passed) {
      toast.success(`Congratulations! You passed with ${score}%`)
    } else {
      toast.error(`You scored ${score}%. Passing score is ${quiz.passingScore}%`)
    }
  }

  // Retry quiz
  const handleRetry = () => {
    setAnswers({})
    setIsSubmitted(false)
    setShowResults(false)
    setCurrentQuestionIndex(0)
    
    // Clear saved progress via callback
    if (onProgressChange) {
      onProgressChange({})
    }
  }

  // Navigation
  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  // Check if answer is correct
  const isAnswerCorrect = (questionId: number) => {
    const question = quiz.questions.find(q => q.id === questionId)
    if (!question) return false

    const userAnswer = answers[questionId]
    const correctAnswer = question.correctAnswer

    if (question.type === 'single') {
      return userAnswer === correctAnswer
    } else {
      const userAnswerArray = (userAnswer as number[] || []).sort()
      const correctAnswerArray = (correctAnswer as number[]).sort()
      return JSON.stringify(userAnswerArray) === JSON.stringify(correctAnswerArray)
    }
  }

  const score = isSubmitted ? calculateScore() : 0
  const passed = score >= quiz.passingScore

  // Results Summary
  if (showResults) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quiz Results</CardTitle>
              <CardDescription>{quiz.title}</CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <XCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${
              passed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              {passed ? (
                <Award className="h-16 w-16 text-green-600" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
            </div>
            <div>
              <h3 className="text-4xl mb-2">{score}%</h3>
              <p className="text-muted-foreground">
                {passed ? 'Congratulations! You passed!' : `You need ${quiz.passingScore}% to pass`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Correct: </span>
                <span className="font-medium text-green-600">
                  {Math.round((score / 100) * totalQuestions)}/{totalQuestions}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Score: </span>
                <span className="font-medium">{score}%</span>
              </div>
            </div>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            <h4 className="font-medium">Question Review</h4>
            {quiz.questions.map((question, index) => {
              const correct = isAnswerCorrect(question.id)
              return (
                <div key={question.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  {correct ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">Question {index + 1}: {question.question}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowResults(false)
                      setCurrentQuestionIndex(index)
                    }}
                  >
                    Review
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleRetry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Quiz
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{quiz.title}</CardTitle>
            {quiz.description && <CardDescription className="text-sm">{quiz.description}</CardDescription>}
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Progress - Compact */}
        <div className="space-y-1.5 mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Q {currentQuestionIndex + 1}/{totalQuestions}</span>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>Pass: {quiz.passingScore}%</span>
              {quiz.timeLimit && timeRemaining && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Saved Progress Alert */}
        {hasSavedProgress && answeredCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                You have saved progress ({answeredCount}/{totalQuestions} questions answered)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAnswers({})
                  if (onProgressChange) {
                    onProgressChange({})
                  }
                  toast.info('Progress cleared. Starting fresh.')
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear & Start Fresh
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Question */}
        <div className="space-y-4">
          {/* Code Question - Render CodeQuizPlayer */}
          {currentQuestion.type === 'code' && currentQuestion.codeQuestion ? (
            <CodeQuizPlayer
              question={currentQuestion.codeQuestion}
              lessonId={lessonId} // ✅ Pass lessonId to save code state
              onComplete={(passed, score) => {
                handleAnswerChange(currentQuestion.id, passed ? 1 : 0)
                if (passed) {
                  toast.success('Code solution accepted!')
                  
                  // ✅ Auto-advance to next question after 2 seconds
                  setTimeout(() => {
                    if (currentQuestionIndex < totalQuestions - 1) {
                      goToNextQuestion()
                    } else if (onNext) {
                      // All questions completed, move to next lesson
                      onNext()
                    }
                  }, 2000)
                }
              }}
              onSubmit={(code, languageId) => {
                console.log('Code submitted:', { code, languageId })
              }}
            />
          ) : (
            <>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0">
                  Q{currentQuestionIndex + 1}
                </Badge>
                <div className="flex-1">
                  <h3 className="text-lg mb-4">{currentQuestion.question}</h3>
                  
                  {/* Optional Image */}
                  {currentQuestion.image && (
                    <div className="mb-4 rounded-lg overflow-hidden border">
                      <img 
                        src={currentQuestion.image} 
                        alt="Question illustration" 
                        className="w-full max-h-96 object-contain bg-muted"
                      />
                    </div>
                  )}
                  
                  {/* Optional Code Snippet */}
                  {currentQuestion.code && (
                    <div className="mb-4 rounded-lg bg-slate-950 p-4 overflow-x-auto">
                      <pre className="text-sm text-slate-50">
                        <code>{currentQuestion.code}</code>
                      </pre>
                      {currentQuestion.codeLanguage && (
                        <div className="mt-2 text-xs text-slate-400">
                          Language: {currentQuestion.codeLanguage}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Show correct/incorrect if submitted */}
                  {isSubmitted && (
                    <Alert className={isAnswerCorrect(currentQuestion.id) ? 'border-green-500' : 'border-red-500'}>
                      <AlertDescription className="flex items-center gap-2">
                        {isAnswerCorrect(currentQuestion.id) ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span>Correct!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span>Incorrect</span>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Options */}
              {currentQuestion.type === 'single' ? (
                <RadioGroup
                  key={currentQuestion.id}
                  value={answers[currentQuestion.id]?.toString()}
                  onValueChange={(value) => handleSingleChoice(currentQuestion.id, parseInt(value))}
                  disabled={isSubmitted}
                >
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const isCorrect = currentQuestion.correctAnswer === index
                      const isSelected = answers[currentQuestion.id] === index
                      const showCorrectAnswer = isSubmitted && (isCorrect || isSelected)
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                            isSubmitted
                              ? isCorrect
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                : isSelected && !isCorrect
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                                : ''
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <RadioGroupItem 
                            value={index.toString()} 
                            id={`q-${currentQuestion.id}-option-${index}`}
                          />
                          <Label
                            htmlFor={`q-${currentQuestion.id}-option-${index}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                          {isSubmitted && isCorrect && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {isSubmitted && isSelected && !isCorrect && (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = (currentQuestion.correctAnswer as number[]).includes(index)
                    const isSelected = (answers[currentQuestion.id] as number[] || []).includes(index)
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
                          isSubmitted
                            ? isCorrect
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                              : isSelected && !isCorrect
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                              : ''
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          id={`q-${currentQuestion.id}-option-${index}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => 
                            handleMultipleChoice(currentQuestion.id, index, checked as boolean)
                          }
                          disabled={isSubmitted}
                        />
                        <Label
                          htmlFor={`q-${currentQuestion.id}-option-${index}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option}
                        </Label>
                        {isSubmitted && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {isSubmitted && isSelected && !isCorrect && (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    )
                  })}
                  <p className="text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Select all correct answers
                  </p>
                </div>
              )}

              {/* Explanation (shown after submission) */}
              {isSubmitted && currentQuestion.explanation && (
                <Alert>
                  <AlertDescription>
                    <strong>Explanation:</strong> {currentQuestion.explanation}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0 || isSubmitted}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {(() => {
              const answer = answers[currentQuestion.id]
              const isAnswered = currentQuestion.type === 'single' 
                ? answer !== undefined && answer !== null
                : Array.isArray(answer) && answer.length > 0
              
              return isAnswered && (
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Answered
                </Badge>
              )
            })()}
          </div>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitted}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={goToNextQuestion}
              disabled={isSubmitted}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}