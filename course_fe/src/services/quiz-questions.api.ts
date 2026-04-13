














import { http } from './http'



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

export interface PaginatedQuizQuestions {
  count: number
  next: string | null
  previous: string | null
  page?: number
  total_pages?: number
  page_size?: number
  results: QuizQuestion[]
}

export interface PaginatedQuizTestCases {
  count: number
  next: string | null
  previous: string | null
  page?: number
  total_pages?: number
  page_size?: number
  results: QuizTestCase[]
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




export async function getQuizQuestions(params?: { lesson_id?: number; question_id?: number }): Promise<QuizQuestion[]> {
  const search = new URLSearchParams()
  if (params?.lesson_id) search.set('lesson_id', String(params.lesson_id))
  if (params?.question_id) search.set('question_id', String(params.question_id))
  const qs = search.toString()
  const res = await http.get<PaginatedQuizQuestions | QuizQuestion[]>(`/quiz-questions/${qs ? `?${qs}` : ''}`)
  return Array.isArray(res) ? res : (res.results || [])
}


export async function getQuestionsByLesson(lessonId: number): Promise<QuizQuestion[]> {
  return getQuizQuestions({ lesson_id: lessonId })
}


export async function createQuizQuestion(data: QuizQuestionCreateData): Promise<QuizQuestion> {
  return http.post<QuizQuestion>('/quiz-questions/create/', data)
}


export async function updateQuizQuestion(questionId: number, data: QuizQuestionUpdateData): Promise<QuizQuestion> {
  return http.patch<QuizQuestion>(`/quiz-questions/update/${questionId}/`, data)
}


export async function deleteQuizQuestion(questionId: number): Promise<void> {
  return http.delete(`/quiz-questions/delete/${questionId}/`)
}




export async function getTestCases(questionId: number): Promise<QuizTestCase[]> {
  const res = await http.get<PaginatedQuizTestCases | QuizTestCase[]>(`/test-cases/?question_id=${questionId}`)
  return Array.isArray(res) ? res : (res.results || [])
}


export async function createTestCase(data: TestCaseCreateData): Promise<QuizTestCase> {
  return http.post<QuizTestCase>('/test-cases/create/', data)
}


export async function updateTestCase(testCaseId: number, data: TestCaseUpdateData): Promise<QuizTestCase> {
  return http.patch<QuizTestCase>(`/test-cases/update/${testCaseId}/`, data)
}


export async function deleteTestCase(testCaseId: number): Promise<void> {
  return http.delete(`/test-cases/delete/${testCaseId}/`)
}



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
