import { useState } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import {
  HelpCircle,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { cn } from './ui/utils'
import { useTranslation } from 'react-i18next'

interface QuizQuestion {
  id: number
  question: string
  type: 'single' | 'multiple' | 'text'
  options: string[]
  correctAnswer?: number | number[] | string
  explanation?: string
  image?: string
  code?: string
}

interface QuizPreviewProps {
  title: string
  questions?: QuizQuestion[]
  passingScore?: number
  timeLimit?: number
  showAnswers?: boolean
  className?: string
}

export function QuizPreview({
  title,
  questions = [],
  passingScore = 70,
  timeLimit,
  showAnswers = false,
  className
}: QuizPreviewProps) {
  const { t } = useTranslation()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number | number[] | string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0)

  if (questions.length === 0) {
    return (
      <Card className={cn("p-8", className)}>
        <div className="text-center space-y-2">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{t('quiz_preview.no_questions')}</p>
        </div>
      </Card>
    )
  }

  const currentQ = questions[currentQuestion]
  const totalQuestions = questions.length
  const progress = ((currentQuestion + 1) / totalQuestions) * 100

  const handleAnswer = (questionId: number, answer: number | number[] | string) => {
    setAnswers({ ...answers, [questionId]: answer })
  }

  const isCorrect = (questionId: number) => {
    if (!isSubmitted || !showAnswers) return null
    const question = questions.find(q => q.id === questionId)
    if (!question) return null

    const userAnswer = answers[questionId]
    const correctAnswer = question.correctAnswer

    if (Array.isArray(correctAnswer)) {
      return JSON.stringify(userAnswer?.sort()) === JSON.stringify(correctAnswer.sort())
    }
    return userAnswer === correctAnswer
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach(q => {
      if (isCorrect(q.id)) correct++
    })
    return Math.round((correct / totalQuestions) * 100)
  }

  const nextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const submitQuiz = () => {
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    const score = calculateScore()
    const passed = score >= passingScore

    return (
      <Card className={cn("p-8", className)}>
        <div className="text-center space-y-6">
          {passed ? (
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-6">
                <Award className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-6">
                <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-2">
              {passed ? 'Congratulations! 🎉' : 'Keep Practicing!'}
            </h2>
            <p className="text-muted-foreground">
              {passed
                ? 'You have successfully passed this quiz!'
                : `You need ${passingScore}% to pass. Try again!`
              }
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-4xl font-bold">{score}%</div>
            <Progress value={score} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">{t('quiz_preview.questions')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {questions.filter(q => isCorrect(q.id)).length}
              </div>
              <div className="text-sm text-muted-foreground">{t('quiz_preview.correct')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {questions.filter(q => isCorrect(q.id) === false).length}
              </div>
              <div className="text-sm text-muted-foreground">{t('quiz_preview.incorrect')}</div>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={() => {
              setIsSubmitted(false)
              setCurrentQuestion(0)
              setAnswers({})
            }}>
              {t('quiz_preview.retry_quiz')}
            </Button>
            <Button variant="outline" onClick={() => setCurrentQuestion(0)}>
              {t('quiz_preview.review_answers')}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-orange-600" />
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('quiz_preview.question_progress', { current: currentQuestion + 1, total: totalQuestions })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {timeLimit && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
              </div>
            )}
            <Badge variant="secondary">
              {t('quiz_preview.passing_score', { score: passingScore })}
            </Badge>
          </div>
        </div>
        <Progress value={progress} className="h-1 mt-4" />
      </Card>


      <Card className="p-6">
        <div className="space-y-6">

          <div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">
                Q{currentQuestion + 1}
              </Badge>
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-4">
                  {currentQ.question}
                </h4>


                {currentQ.image && (
                  <img
                    src={currentQ.image}
                    alt={t('quiz_preview.question_image_alt')}
                    className="rounded-lg border mb-4 max-h-48 object-cover"
                  />
                )}


                {currentQ.code && (
                  <pre className="bg-muted p-4 rounded-lg mb-4 overflow-x-auto">
                    <code className="text-sm">{currentQ.code}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>


          <div className="space-y-3">
            {currentQ.type === 'single' ? (
              <RadioGroup
                key={currentQ.id}
                value={answers[currentQ.id]?.toString()}
                onValueChange={(value) => handleAnswer(currentQ.id, parseInt(value))}
              >
                {currentQ.options.map((option, index) => {
                  const isSelected = answers[currentQ.id] === index
                  const isAnswerCorrect = isCorrect(currentQ.id)
                  const isThisCorrect = currentQ.correctAnswer === index

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                        isSelected && !isSubmitted && "border-primary bg-primary/5",
                        isSubmitted && isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                        isSubmitted && isSelected && !isThisCorrect && "border-red-500 bg-red-50 dark:bg-red-900/20"
                      )}
                    >
                      <RadioGroupItem
                        value={index.toString()}
                        id={`q-${currentQ.id}-option-${index}`}
                      />
                      <Label
                        htmlFor={`q-${currentQ.id}-option-${index}`}
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                      {isSubmitted && isThisCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {isSubmitted && isSelected && !isThisCorrect && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  )
                })}
              </RadioGroup>
            ) : currentQ.type === 'multiple' ? (
              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  const selected = (answers[currentQ.id] as number[] || []).includes(index)
                  const isThisCorrect = (currentQ.correctAnswer as number[] || []).includes(index)

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                        selected && !isSubmitted && "border-primary bg-primary/5",
                        isSubmitted && isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                        isSubmitted && selected && !isThisCorrect && "border-red-500 bg-red-50 dark:bg-red-900/20"
                      )}
                      onClick={() => {
                        if (!isSubmitted) {
                          const current = (answers[currentQ.id] as number[]) || []
                          if (current.includes(index)) {
                            handleAnswer(currentQ.id, current.filter(i => i !== index))
                          } else {
                            handleAnswer(currentQ.id, [...current, index])
                          }
                        }
                      }}
                    >
                      <Checkbox
                        checked={selected}
                        id={`q-${currentQ.id}-option-${index}`}
                      />
                      <Label
                        htmlFor={`q-${currentQ.id}-option-${index}`}
                        className="flex-1 cursor-pointer"
                      >
                        {option}
                      </Label>
                      {isSubmitted && isThisCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {isSubmitted && selected && !isThisCorrect && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={`q-${currentQ.id}-text`} className="text-sm text-muted-foreground">{t('quiz_preview.answer')}</Label>
                <textarea
                  id={`q-${currentQ.id}-text`}
                  className="w-full min-h-[120px] rounded-md border bg-background p-3 text-sm"
                  value={String(answers[currentQ.id] || '')}
                  onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                  placeholder={t('quiz_preview.enter_answer')}
                />
              </div>
            )}
          </div>


          {isSubmitted && currentQ.explanation && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
              <h5 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                {t('quiz_preview.explanation')}
              </h5>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {currentQ.explanation}
              </p>
            </Card>
          )}
        </div>
      </Card>


      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t('common.previous')}
        </Button>

        <div className="text-sm text-muted-foreground">
          {t('quiz_preview.answered_progress', { answered: Object.keys(answers).length, total: totalQuestions })}
        </div>

        {currentQuestion < totalQuestions - 1 ? (
          <Button onClick={nextQuestion}>
            {t('common.next')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={submitQuiz}
            disabled={Object.keys(answers).length < totalQuestions}
          >
            {t('quiz_preview.submit_quiz')}
          </Button>
        )}
      </div>
    </div>
  )
}
