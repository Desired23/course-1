




import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'


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

interface QuizState {

  quizAnswers: QuizAnswer[]


  saveQuizAnswer: (answer: QuizAnswer) => void
  getQuizAnswer: (questionId: number, lessonId: number) => QuizAnswer | undefined
  clearQuizAnswers: (lessonId: number) => void
  clearAllQuizAnswers: () => void


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

        quizAnswers: [],


        saveQuizAnswer: (answer: QuizAnswer) => {
          set((state) => {
            const existing = state.quizAnswers.find(
              (a) => a.questionId === answer.questionId && a.lessonId === answer.lessonId
            )

            if (existing) {

              return {
                quizAnswers: state.quizAnswers.map((a) =>
                  a.questionId === answer.questionId && a.lessonId === answer.lessonId
                    ? { ...a, ...answer, lastUpdated: new Date().toISOString() }
                    : a
                ),
              }
            } else {

              return {
                quizAnswers: [...state.quizAnswers, { ...answer, lastUpdated: new Date().toISOString() }],
              }
            }
          }, false, 'saveQuizAnswer')
        },


        getQuizAnswer: (questionId: number, lessonId: number) => {
          const { quizAnswers } = get()
          return quizAnswers.find(
            (a) => a.questionId === questionId && a.lessonId === lessonId
          )
        },


        clearQuizAnswers: (lessonId: number) => {
          set(
            (state) => ({
              quizAnswers: state.quizAnswers.filter((a) => a.lessonId !== lessonId),
            }),
            false,
            'clearQuizAnswers'
          )
        },


        clearAllQuizAnswers: () => {
          set({ quizAnswers: [] }, false, 'clearAllQuizAnswers')
        },


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
        name: 'udemy-quiz-storage',

        partialize: (state) => ({ quizAnswers: state.quizAnswers }),
      }
    ),
    { name: 'QuizStore' }
  )
)
