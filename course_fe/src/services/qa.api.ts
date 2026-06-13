import { http } from './http'

export interface Question {
  id: number
  title: string
  content: string
  author: number
  author_name: string | null
  author_avatar: string | null
  tags: string[]
  status: 'open' | 'closed' | 'duplicate' | 'hidden'
  views: number
  score: number
  answer_count: number
  has_accepted_answer: boolean
  report_count: number
  last_report_reason: string | null
  last_reported_at: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Answer {
  id: number
  question: number
  content: string
  author: number
  author_name: string | null
  author_avatar: string | null
  is_accepted: boolean
  score: number
  status: 'active' | 'deleted'
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface VoteResponse {
  score: number
  user_vote: 'up' | 'down' | null
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export async function getQuestions(params?: {
  search?: string
  tag?: string
  status?: string
  sort?: 'newest' | 'votes' | 'unanswered'
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<Question>> {
  const query: Record<string, string | number> = {}
  if (params?.search) query.search = params.search
  if (params?.tag) query.tag = params.tag
  if (params?.status) query.status = params.status
  if (params?.sort) query.sort = params.sort
  if (params?.page) query.page = params.page
  if (params?.page_size) query.page_size = params.page_size
  return http.get<PaginatedResponse<Question>>('/questions/', query)
}

export async function getQuestion(questionId: number): Promise<Question> {
  return http.get<Question>('/questions/', { question_id: questionId })
}

export async function createQuestion(data: {
  title: string
  content: string
  tags?: string[]
}): Promise<Question> {
  return http.post<Question>('/questions/create/', data)
}

export async function updateQuestion(questionId: number, data: Partial<Question>): Promise<Question> {
  return http.patch<Question>(`/questions/${questionId}/update/`, data)
}

export async function deleteQuestion(questionId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/questions/${questionId}/delete/`)
}

export async function increaseQuestionViews(questionId: number): Promise<{ message: string }> {
  return http.post<{ message: string }>(`/questions/${questionId}/increase-views/`, {})
}

export async function reportQuestion(questionId: number, reason?: string): Promise<Question> {
  return http.post<Question>(`/questions/${questionId}/report/`, { reason: reason ?? '' })
}

export async function moderateQuestion(
  questionId: number,
  action: 'approve' | 'dismiss' | 'close' | 'hide' | 'delete',
  reason?: string
): Promise<Question> {
  return http.post<Question>(`/questions/${questionId}/moderate/`, { action, reason: reason ?? '' })
}

export async function acceptAnswer(questionId: number, answerId: number): Promise<Question> {
  return http.patch<Question>(`/questions/${questionId}/accept-answer/`, { answer_id: answerId })
}

export async function getAnswers(questionId: number): Promise<PaginatedResponse<Answer>> {
  return http.get<PaginatedResponse<Answer>>('/answers/', { question_id: questionId })
}

export async function createAnswer(data: {
  question: number
  content: string
}): Promise<Answer> {
  return http.post<Answer>('/answers/create/', data)
}

export async function updateAnswer(answerId: number, data: { content: string }): Promise<Answer> {
  return http.patch<Answer>(`/answers/${answerId}/update/`, data)
}

export async function deleteAnswer(answerId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/answers/${answerId}/delete/`)
}

export async function voteQuestion(questionId: number, voteType: 'up' | 'down'): Promise<VoteResponse> {
  return http.post<VoteResponse>(`/qa-votes/question/${questionId}/`, { vote_type: voteType })
}

export async function voteAnswer(answerId: number, voteType: 'up' | 'down'): Promise<VoteResponse> {
  return http.post<VoteResponse>(`/qa-votes/answer/${answerId}/`, { vote_type: voteType })
}

export function formatQADate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

export function getStatusLabel(status: Question['status']): string {
  const labels: Record<Question['status'], string> = {
    open: 'Mở',
    closed: 'Đóng',
    duplicate: 'Trùng lặp',
    hidden: 'Đã gỡ',
  }
  return labels[status] ?? status
}
