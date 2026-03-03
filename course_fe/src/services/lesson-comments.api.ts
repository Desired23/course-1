/**
 * Lesson Comments API Service
 *
 * BE endpoints (all under /api/):
 *   POST   /comments/create                      — create comment (user from token)
 *   GET    /comments/lesson/<lesson_id>/          — get root comments (parent_comment=null)
 *   GET    /comments/<comment_id>                 — single comment; ?replies=true → paginated replies
 *   PATCH  /comments/<comment_id>/update          — update content/votes
 *   DELETE /comments/<comment_id>/manage/         — delete (instructor/admin)
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LessonComment {
  id: number
  user: number
  lesson: number
  parent_comment: number | null
  content: string
  votes: number
  created_at: string
  updated_at: string
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

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Create a new lesson comment.
 * POST body: { lesson, content, parent_comment? }
 * The BE uses `request.user.id` as the user.
 */
export async function createLessonComment(data: {
  lesson: number
  content: string
  parent_comment?: number | null
}): Promise<LessonComment> {
  return http.post<LessonComment>('/comments/create', data)
}

/**
 * Get root comments for a lesson (parent_comment = null), ordered by -created_at.
 * Returns paginated response.
 */
export async function getLessonComments(
  lessonId: number,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<LessonComment>> {
  const q: Record<string, string | number> = {}
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<LessonComment>>(`/comments/lesson/${lessonId}/`, q)
}

/** Get all root comments for a lesson (auto-paginate). */
export async function getAllLessonComments(lessonId: number): Promise<LessonComment[]> {
  const res = await getLessonComments(lessonId, { page_size: 1000 })
  return res.results
}

/**
 * Get a single comment by ID.
 * If replies=true, returns paginated replies instead.
 */
export async function getLessonCommentById(commentId: number): Promise<LessonComment> {
  return http.get<LessonComment>(`/comments/${commentId}`)
}

/** Get paginated replies for a comment. */
export async function getLessonCommentReplies(
  commentId: number,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<LessonComment>> {
  const q: Record<string, string | number> = { replies: 1 }
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<LessonComment>>(`/comments/${commentId}`, q)
}

/** Get all replies for a comment. */
export async function getAllReplies(commentId: number): Promise<LessonComment[]> {
  const res = await getLessonCommentReplies(commentId, { page_size: 1000 })
  return res.results
}

/** Update comment content and/or votes. */
export async function updateLessonComment(
  commentId: number,
  data: Partial<{ content: string; votes: number }>
): Promise<LessonComment> {
  return http.patch<LessonComment>(`/comments/${commentId}/update`, data)
}

/** Delete a comment (instructor/admin only). */
export async function deleteLessonComment(commentId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/comments/${commentId}/manage/`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCommentDate(dateStr: string): string {
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
