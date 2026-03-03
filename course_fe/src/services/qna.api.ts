/**
 * Q&A API Service — Questions & Answers
 *
 * BE endpoints (all under /api/):
 *   QnA:
 *     GET    /qnas/                      — list (paginated), ?user_id, ?qna_id
 *     POST   /qnas/create/               — create
 *     PATCH  /qnas/<id>/update/          — update
 *     DELETE /qnas/<id>/delete/          — delete
 *
 *   QnA Answers:
 *     GET    /qna_answers/               — list by ?qna_id (required), or ?answer_id
 *     POST   /qna_answers/create/        — create
 *     PATCH  /qna_answers/<id>/update/   — update
 *     DELETE /qna_answers/<id>/delete/   — delete
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QnA {
  id: number
  course: number
  course_title: string | null
  lesson: number
  lesson_title: string | null
  question: string
  description: string | null
  tags: string[] | null
  user: number
  user_name: string | null
  user_avatar: string | null
  created_at: string
  status: 'Pending' | 'Answered' | 'Closed'
  views: number
  votes: number
  answers_count: number
}

export interface QnAAnswer {
  id: number
  qna: number
  answer: string
  user: number
  user_name: string | null
  user_avatar: string | null
  created_at: string
  updated_at: string
  is_accepted: boolean
  likes: number
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

// ─── QnA Questions ────────────────────────────────────────────────────────────

export async function getQnAs(
  params?: { user_id?: number; qna_id?: number; page?: number; page_size?: number }
): Promise<PaginatedResponse<QnA>> {
  const q: Record<string, string | number> = {}
  if (params?.user_id) q.user_id = params.user_id
  if (params?.qna_id) q.qna_id = params.qna_id
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<QnA>>('/qnas/', q)
}

export async function getQnAById(qnaId: number): Promise<QnA> {
  return http.get<QnA>('/qnas/', { qna_id: qnaId })
}

export async function getAllQnAs(): Promise<QnA[]> {
  const res = await getQnAs({ page_size: 1000 })
  return res.results
}

export async function createQnA(data: {
  course: number
  lesson: number
  question: string
  user: number
  description?: string
  tags?: string[]
}): Promise<QnA> {
  return http.post<QnA>('/qnas/create/', data)
}

export async function updateQnA(
  qnaId: number,
  data: Partial<{ question: string; status: string }>
): Promise<QnA> {
  return http.patch<QnA>(`/qnas/${qnaId}/update/`, data)
}

export async function deleteQnA(qnaId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/qnas/${qnaId}/delete/`)
}

// ─── QnA Answers ──────────────────────────────────────────────────────────────

export async function getQnAAnswers(
  params: { qna_id: number; answer_id?: number; page?: number; page_size?: number }
): Promise<PaginatedResponse<QnAAnswer>> {
  const q: Record<string, string | number> = { qna_id: params.qna_id }
  if (params.answer_id) q.answer_id = params.answer_id
  if (params.page) q.page = params.page
  if (params.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<QnAAnswer>>('/qna_answers/', q)
}

export async function getAllQnAAnswers(qnaId: number): Promise<QnAAnswer[]> {
  const res = await getQnAAnswers({ qna_id: qnaId, page_size: 1000 })
  return res.results
}

export async function createQnAAnswer(data: {
  qna: number
  answer: string
  user: number
}): Promise<QnAAnswer> {
  return http.post<QnAAnswer>('/qna_answers/create/', data)
}

export async function updateQnAAnswer(
  answerId: number,
  data: Partial<{ answer: string; is_accepted: boolean }>
): Promise<QnAAnswer> {
  return http.patch<QnAAnswer>(`/qna_answers/${answerId}/update/`, data)
}

export async function deleteQnAAnswer(answerId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/qna_answers/${answerId}/delete/`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getQnAStatusLabel(status: string): string {
  switch (status) {
    case 'Pending': return 'Chờ trả lời'
    case 'Answered': return 'Đã trả lời'
    case 'Closed': return 'Đã đóng'
    default: return status
  }
}

export function getQnAStatusBadge(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Answered': return 'default'
    case 'Pending': return 'secondary'
    case 'Closed': return 'outline'
    default: return 'outline'
  }
}

export function formatQnADate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} giờ trước`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD} ngày trước`
  return d.toLocaleDateString('vi-VN')
}
