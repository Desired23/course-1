import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useEnrollment } from './EnrollmentContext'

export interface LessonProgress {
  progress_id: number
  enrollment_id: number
  lesson_id: number
  progress: number
  last_accessed: string
  status: 'not_started' | 'in_progress' | 'completed'
  start_time?: string
  completion_time?: string
  time_spent: number
  last_position: number
  notes?: string
}


export interface QuizAnswer {
  questionId: number
  lessonId: number
  type: 'code' | 'multiple_choice' | 'true_false'

  code?: string
  language?: number

  selectedAnswers?: number[]

  isSubmitted: boolean
  isCorrect?: boolean
  score?: number
  lastUpdated: string
}

interface LearningProgressContextType {
  lessonProgress: LessonProgress[]
  getLessonProgress: (lessonId: number) => LessonProgress | undefined
  updateLessonProgress: (lessonId: number, data: Partial<LessonProgress>) => void
  markLessonComplete: (lessonId: number) => void
  markLessonIncomplete: (lessonId: number) => void
  saveVideoPosition: (lessonId: number, position: number) => void
  getVideoPosition: (lessonId: number) => number
  getCourseCompletionStats: (courseId: string) => {
    completed: number
    total: number
    percentage: number
  }
  addTimeSpent: (lessonId: number, seconds: number) => void
  getTotalTimeSpent: (courseId: string) => number

  quizAnswers: QuizAnswer[]
  saveQuizAnswer: (answer: QuizAnswer) => void
  getQuizAnswer: (questionId: number, lessonId: number) => QuizAnswer | undefined
  clearQuizAnswers: (lessonId: number) => void
}

const LearningProgressContext = createContext<LearningProgressContextType | undefined>(undefined)

export function LearningProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { enrollments, updateProgress } = useEnrollment()
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([])
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])

  useEffect(() => {

    if (!user) {
      setLessonProgress([])
      setQuizAnswers([])
      return
    }

    const saved = localStorage.getItem(`learningProgress_${user.id}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLessonProgress(parsed)
      } catch (error) {
        console.error('Error loading learning progress:', error)
        setLessonProgress([])
      }
    } else {
      setLessonProgress([])
    }


    const savedQuizAnswers = localStorage.getItem(`quizAnswers_${user.id}`)
    if (savedQuizAnswers) {
      try {
        const parsed = JSON.parse(savedQuizAnswers)
        setQuizAnswers(parsed)
      } catch (error) {
        console.error('Error loading quiz answers:', error)
        setQuizAnswers([])
      }
    } else {
      setQuizAnswers([])
    }
  }, [user])

  useEffect(() => {

    if (!user) return
    if (lessonProgress.length > 0) {
      localStorage.setItem(`learningProgress_${user.id}`, JSON.stringify(lessonProgress))
      return
    }
    localStorage.removeItem(`learningProgress_${user.id}`)
  }, [lessonProgress, user])


  useEffect(() => {
    if (!user) return
    if (quizAnswers.length > 0) {
      localStorage.setItem(`quizAnswers_${user.id}`, JSON.stringify(quizAnswers))
      return
    }
    localStorage.removeItem(`quizAnswers_${user.id}`)
  }, [quizAnswers, user])

  const getLessonProgress = (lessonId: number): LessonProgress | undefined => {
    return lessonProgress.find(p => p.lesson_id === lessonId)
  }

  const updateLessonProgress = (lessonId: number, data: Partial<LessonProgress>) => {
    if (!user) return

    setLessonProgress(prev => {
      const existing = prev.find(p => p.lesson_id === lessonId)

      if (existing) {
        return prev.map(p =>
          p.lesson_id === lessonId
            ? { ...p, ...data, last_accessed: new Date().toISOString() }
            : p
        )
      } else {
        const newProgress: LessonProgress = {
          progress_id: Date.now(),
          enrollment_id: 0,
          lesson_id: lessonId,
          progress: 0,
          last_accessed: new Date().toISOString(),
          status: 'not_started',
          time_spent: 0,
          last_position: 0,
          ...data
        }
        return [...prev, newProgress]
      }
    })
  }

  const markLessonComplete = (lessonId: number) => {
    updateLessonProgress(lessonId, {
      status: 'completed',
      progress: 100,
      completion_time: new Date().toISOString()
    })



  }

  const markLessonIncomplete = (lessonId: number) => {
    updateLessonProgress(lessonId, {
      status: 'in_progress',
      progress: 0,
      completion_time: undefined
    })
  }

  const saveVideoPosition = (lessonId: number, position: number) => {
    updateLessonProgress(lessonId, {
      last_position: position,
      status: position > 0 ? 'in_progress' : 'not_started'
    })
  }

  const getVideoPosition = (lessonId: number): number => {
    const progress = getLessonProgress(lessonId)
    return progress?.last_position || 0
  }

  const getCourseCompletionStats = (courseId: string) => {


    const completed = lessonProgress.filter(p => p.status === 'completed').length
    const total = 20

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }

  const addTimeSpent = (lessonId: number, seconds: number) => {
    const existing = getLessonProgress(lessonId)
    const newTimeSpent = (existing?.time_spent || 0) + seconds

    updateLessonProgress(lessonId, {
      time_spent: newTimeSpent
    })
  }

  const getTotalTimeSpent = (courseId: string): number => {

    return lessonProgress.reduce((total, p) => total + p.time_spent, 0)
  }


  const saveQuizAnswer = (answer: QuizAnswer) => {
    setQuizAnswers(prev => {
      const existingIndex = prev.findIndex(a => a.questionId === answer.questionId && a.lessonId === answer.lessonId)
      if (existingIndex !== -1) {
        const newAnswers = [...prev]
        newAnswers[existingIndex] = answer
        return newAnswers
      } else {
        return [...prev, answer]
      }
    })
  }

  const getQuizAnswer = (questionId: number, lessonId: number): QuizAnswer | undefined => {
    return quizAnswers.find(a => a.questionId === questionId && a.lessonId === lessonId)
  }

  const clearQuizAnswers = (lessonId: number) => {
    setQuizAnswers(prev => prev.filter(a => a.lessonId !== lessonId))
  }

  const value = {
    lessonProgress,
    getLessonProgress,
    updateLessonProgress,
    markLessonComplete,
    markLessonIncomplete,
    saveVideoPosition,
    getVideoPosition,
    getCourseCompletionStats,
    addTimeSpent,
    getTotalTimeSpent,

    quizAnswers,
    saveQuizAnswer,
    getQuizAnswer,
    clearQuizAnswers
  }

  return (
    <LearningProgressContext.Provider value={value}>
      {children}
    </LearningProgressContext.Provider>
  )
}

export function useLearningProgress() {
  const context = useContext(LearningProgressContext)
  if (context === undefined) {
    throw new Error('useLearningProgress must be used within a LearningProgressProvider')
  }
  return context
}
