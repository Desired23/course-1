import { http } from './http'

export interface QuizResultRecord {
  id: number
  enrollment: number
  lesson: number
  start_time: string | null
  submit_time: string | null
  time_taken: number | null
  total_questions: number | null
  correct_answers: number | null
  total_points: number | null
  score: string | number | null
  answers: Record<string, any> | null
  passed: boolean
  attempt: number
  created_at: string
  updated_at: string
}

export interface QuizResultCreateData {
  enrollment: number
  lesson: number
  answers?: Record<string, any>
  passed?: boolean
  attempt?: number
  score?: number | string | null
  total_questions?: number | null
  correct_answers?: number | null
  total_points?: number | null
  time_taken?: number | null
  submit_time?: string | null
}

export interface QuizResultUpdateData extends Partial<QuizResultCreateData> {}

export async function getQuizResultByEnrollmentAndLesson(
  enrollmentId: number,
  lessonId: number
): Promise<QuizResultRecord | null> {
  try {
    return await http.get<QuizResultRecord>(`/quiz-results-old/?enrollment_id=${enrollmentId}&lesson_id=${lessonId}`)
  } catch (error: any) {
    if (error?.status === 404) return null
    throw error
  }
}

export async function createQuizResultDraft(data: QuizResultCreateData): Promise<QuizResultRecord> {
  return http.post<QuizResultRecord>('/quiz-results-old/create/', data)
}

export async function updateQuizResultDraft(
  quizResultId: number,
  data: QuizResultUpdateData
): Promise<QuizResultRecord> {
  return http.patch<QuizResultRecord>(`/quiz-results-old/${quizResultId}/update/`, data)
}

export async function upsertQuizResultDraft(
  enrollmentId: number,
  lessonId: number,
  data: QuizResultUpdateData
): Promise<QuizResultRecord> {
  const existing = await getQuizResultByEnrollmentAndLesson(enrollmentId, lessonId)
  if (existing) {
    const mergedAnswers = data.answers
      ? { ...(existing.answers || {}), ...data.answers }
      : existing.answers
    return updateQuizResultDraft(existing.id, {
      ...data,
      answers: mergedAnswers,
    })
  }

  return createQuizResultDraft({
    enrollment: enrollmentId,
    lesson: lessonId,
    ...data,
  })
}
