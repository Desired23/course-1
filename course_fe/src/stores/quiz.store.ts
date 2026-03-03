/**
 * Quiz Store - Quiz Answer State Management
 * Handles: Code quiz answers, MCQ answers, submission state, persistence
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ✅ Quiz Answer Types
export interface QuizAnswer {
  questionId: number
  lessonId: number
  type: 'code' | 'multiple_choice' | 'true_false'
  // For code quiz
  code?: string
  language?: number // Judge0 language ID
  // For MCQ/True-False
  selectedAnswers?: number[]
  // Metadata
  isSubmitted: boolean
  isCorrect?: boolean
  score?: number
  lastUpdated: string
}

interface QuizState {
  // State
  quizAnswers: QuizAnswer[]
  
  // Actions
  saveQuizAnswer: (answer: QuizAnswer) => void
  getQuizAnswer: (questionId: number, lessonId: number) => QuizAnswer | undefined
  clearQuizAnswers: (lessonId: number) => void
  clearAllQuizAnswers: () => void
  
  // Stats
  getLessonQuizStats: (lessonId: number) => {
    total: number
    submitted: number
    correct: number
    averageScore: number
  }
}

export const useQuizStore = create<QuizState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        quizAnswers: [],

        // Save or update quiz answer
        saveQuizAnswer: (answer: QuizAnswer) => {
          set((state) => {
            const existing = state.quizAnswers.find(
              (a) => a.questionId === answer.questionId && a.lessonId === answer.lessonId
            )

            if (existing) {
              // Update existing answer
              return {
                quizAnswers: state.quizAnswers.map((a) =>
                  a.questionId === answer.questionId && a.lessonId === answer.lessonId
                    ? { ...a, ...answer, lastUpdated: new Date().toISOString() }
                    : a
                ),
              }
            } else {
              // Add new answer
              return {
                quizAnswers: [...state.quizAnswers, { ...answer, lastUpdated: new Date().toISOString() }],
              }
            }
          }, false, 'saveQuizAnswer')
        },

        // Get quiz answer
        getQuizAnswer: (questionId: number, lessonId: number) => {
          const { quizAnswers } = get()
          return quizAnswers.find(
            (a) => a.questionId === questionId && a.lessonId === lessonId
          )
        },

        // Clear all answers for a specific lesson
        clearQuizAnswers: (lessonId: number) => {
          set(
            (state) => ({
              quizAnswers: state.quizAnswers.filter((a) => a.lessonId !== lessonId),
            }),
            false,
            'clearQuizAnswers'
          )
        },

        // Clear all quiz answers
        clearAllQuizAnswers: () => {
          set({ quizAnswers: [] }, false, 'clearAllQuizAnswers')
        },

        // Get quiz statistics for a lesson
        getLessonQuizStats: (lessonId: number) => {
          const { quizAnswers } = get()
          const lessonAnswers = quizAnswers.filter((a) => a.lessonId === lessonId)
          
          const submitted = lessonAnswers.filter((a) => a.isSubmitted).length
          const correct = lessonAnswers.filter((a) => a.isCorrect).length
          const totalScore = lessonAnswers.reduce((sum, a) => sum + (a.score || 0), 0)
          
          return {
            total: lessonAnswers.length,
            submitted,
            correct,
            averageScore: lessonAnswers.length > 0 ? totalScore / lessonAnswers.length : 0,
          }
        },
      }),
      {
        name: 'udemy-quiz-storage', // LocalStorage key
        // Only persist quiz answers, not functions
        partialize: (state) => ({ quizAnswers: state.quizAnswers }),
      }
    ),
    { name: 'QuizStore' }
  )
)
