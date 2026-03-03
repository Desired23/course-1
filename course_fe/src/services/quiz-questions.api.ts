/**
 * Quiz Questions API Service
 * CRUD for quiz questions + test cases
 *
 * Endpoints:
 *   GET    /api/quiz-questions/                       — List questions (?question_id=, ?lesson_id=)
 *   POST   /api/quiz-questions/create/                — Create question
 *   PATCH  /api/quiz-questions/update/:id/            — Update question
 *   DELETE /api/quiz-questions/delete/:id/            — Delete question
 *   GET    /api/test-cases/                           — List test cases (?question_id=)
 *   POST   /api/test-cases/create/                    — Create test case
 *   PATCH  /api/test-cases/update/:id/                — Update test case
 *   DELETE /api/test-cases/delete/:id/                — Delete test case
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────

export type QuestionType = 'multiple' | 'truefalse' | 'short' | 'essay' | 'code'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface QuizTestCase {
  id: number
  question: number
  input_data: string
  expected_output: string
  is_hidden: boolean
  points: number
  order_number: number
}

export interface QuizQuestion {
  id: number
  lesson: number
  question_text: string
  question_type: QuestionType
  difficulty: DifficultyLevel
  options: Record<string, string>[] | null
  correct_answer: string
  points: number
  explanation: string | null
  order_number: number | null
  description: string | null
  time_limit: number | null
  memory_limit: number | null
  allowed_languages: number[] | null
  starter_code: string | null
  test_cases: QuizTestCase[]
  created_at: string
  updated_at: string
}

export interface QuizQuestionCreateData {
  lesson: number
  question_text: string
  question_type: QuestionType
  difficulty?: DifficultyLevel
  options?: Record<string, string>[] | null
  correct_answer: string
  points?: number
  explanation?: string
  order_number?: number
  description?: string
  time_limit?: number
  memory_limit?: number
  allowed_languages?: number[]
  starter_code?: string
}

export interface QuizQuestionUpdateData {
  question_text?: string
  question_type?: QuestionType
  difficulty?: DifficultyLevel
  options?: Record<string, string>[] | null
  correct_answer?: string
  points?: number
  explanation?: string
  order_number?: number
  description?: string
  time_limit?: number
  memory_limit?: number
  allowed_languages?: number[]
  starter_code?: string
}

export interface TestCaseCreateData {
  question: number
  input_data: string
  expected_output: string
  is_hidden?: boolean
  points?: number
  order_number?: number
}

export interface TestCaseUpdateData {
  input_data?: string
  expected_output?: string
  is_hidden?: boolean
  points?: number
  order_number?: number
}

// ─── Quiz Question API ────────────────────────────────────────

/** List questions — filter by lesson_id or question_id */
export async function getQuizQuestions(params?: { lesson_id?: number; question_id?: number }): Promise<QuizQuestion[]> {
  const search = new URLSearchParams()
  if (params?.lesson_id) search.set('lesson_id', String(params.lesson_id))
  if (params?.question_id) search.set('question_id', String(params.question_id))
  const qs = search.toString()
  return http.get<QuizQuestion[]>(`/quiz-questions/${qs ? `?${qs}` : ''}`)
}

/** Get questions for a lesson */
export async function getQuestionsByLesson(lessonId: number): Promise<QuizQuestion[]> {
  return getQuizQuestions({ lesson_id: lessonId })
}

/** Create question */
export async function createQuizQuestion(data: QuizQuestionCreateData): Promise<QuizQuestion> {
  return http.post<QuizQuestion>('/quiz-questions/create/', data)
}

/** Update question */
export async function updateQuizQuestion(questionId: number, data: QuizQuestionUpdateData): Promise<QuizQuestion> {
  return http.patch<QuizQuestion>(`/quiz-questions/update/${questionId}/`, data)
}

/** Delete question */
export async function deleteQuizQuestion(questionId: number): Promise<void> {
  return http.delete(`/quiz-questions/delete/${questionId}/`)
}

// ─── Test Case API ────────────────────────────────────────────

/** List test cases for a question */
export async function getTestCases(questionId: number): Promise<QuizTestCase[]> {
  return http.get<QuizTestCase[]>(`/test-cases/?question_id=${questionId}`)
}

/** Create test case */
export async function createTestCase(data: TestCaseCreateData): Promise<QuizTestCase> {
  return http.post<QuizTestCase>('/test-cases/create/', data)
}

/** Update test case */
export async function updateTestCase(testCaseId: number, data: TestCaseUpdateData): Promise<QuizTestCase> {
  return http.patch<QuizTestCase>(`/test-cases/update/${testCaseId}/`, data)
}

/** Delete test case */
export async function deleteTestCase(testCaseId: number): Promise<void> {
  return http.delete(`/test-cases/delete/${testCaseId}/`)
}

// ─── Helpers ──────────────────────────────────────────────────

export function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    multiple: 'Trắc nghiệm',
    truefalse: 'Đúng/Sai',
    short: 'Trả lời ngắn',
    essay: 'Tự luận',
    code: 'Lập trình',
  }
  return labels[type] || type
}

export function getDifficultyLabel(level: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    easy: 'Dễ',
    medium: 'Trung bình',
    hard: 'Khó',
  }
  return labels[level] || level
}

export function getDifficultyColor(level: DifficultyLevel): string {
  const colors: Record<DifficultyLevel, string> = {
    easy: 'text-green-600',
    medium: 'text-yellow-600',
    hard: 'text-red-600',
  }
  return colors[level] || ''
}
