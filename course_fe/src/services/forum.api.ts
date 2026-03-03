/**
 * Forum API Service — Forums, Topics, Comments
 *
 * BE endpoints (all under /api/):
 *   Forums:
 *     GET    /forums/                          — list (paginated), ?course_id, ?forum_id
 *     POST   /forums/create/                   — create
 *     PATCH  /forums/<id>/update/              — update
 *     DELETE /forums/<id>/delete/              — delete
 *
 *   Forum Topics:
 *     GET    /forum_topics/                    — list (paginated), ?forum_id, ?user_id, ?topic_id
 *     POST   /forum_topics/create/             — create
 *     PATCH  /forum_topics/<id>/update/        — update
 *     DELETE /forum_topics/<id>/delete/        — delete
 *
 *   Forum Comments:
 *     GET    /forum_comments/                  — list (paginated), ?topic_id, ?user_id, ?comment_id
 *     POST   /forum_comments/create/           — create
 *     PATCH  /forum_comments/<id>/update/      — update
 *     DELETE /forum_comments/<id>/delete/      — delete
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Forum {
  id: number
  course: number | null
  title: string
  description: string | null
  user_id: number
  user_name: string | null
  created_at: string
  status: 'active' | 'archived' | 'deleted'
  topic_count: number
  last_activity: string | null
}

export interface ForumTopic {
  id: number
  forum: number
  forum_title: string | null
  title: string
  content: string
  user: number
  user_name: string | null
  user_avatar: string | null
  created_at: string
  updated_at: string
  status: 'active' | 'locked' | 'deleted'
  views: number
  likes: number
  is_pinned: boolean
  replies_count: number
}

export interface ForumComment {
  id: number
  topic: number
  content: string
  user: number
  created_at: string
  updated_at: string
  parent: number | null
  likes: number
  status: 'active' | 'deleted'
  is_best_answer: boolean
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

// ─── Forums ───────────────────────────────────────────────────────────────────

export async function getForums(
  params?: { course_id?: number; forum_id?: number; page?: number; page_size?: number }
): Promise<PaginatedResponse<Forum>> {
  const q: Record<string, string | number> = {}
  if (params?.course_id) q.course_id = params.course_id
  if (params?.forum_id) q.forum_id = params.forum_id
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<Forum>>('/forums/', q)
}

export async function getForumById(forumId: number): Promise<Forum> {
  return http.get<Forum>('/forums/', { forum_id: forumId })
}

export async function getAllForums(): Promise<Forum[]> {
  const res = await getForums({ page_size: 1000 })
  return res.results
}

export async function createForum(data: {
  course?: number | null
  title: string
  description?: string
  user_id: number
  status?: string
}): Promise<Forum> {
  return http.post<Forum>('/forums/create/', data)
}

export async function updateForum(
  forumId: number,
  data: Partial<{ title: string; description: string; status: string }>
): Promise<Forum> {
  return http.patch<Forum>(`/forums/${forumId}/update/`, data)
}

export async function deleteForum(forumId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/forums/${forumId}/delete/`)
}

// ─── Forum Topics ─────────────────────────────────────────────────────────────

export async function getForumTopics(
  params?: { forum_id?: number; user_id?: number; topic_id?: number; page?: number; page_size?: number }
): Promise<PaginatedResponse<ForumTopic>> {
  const q: Record<string, string | number> = {}
  if (params?.forum_id) q.forum_id = params.forum_id
  if (params?.user_id) q.user_id = params.user_id
  if (params?.topic_id) q.topic_id = params.topic_id
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<ForumTopic>>('/forum_topics/', q)
}

export async function getForumTopicById(topicId: number): Promise<ForumTopic> {
  return http.get<ForumTopic>('/forum_topics/', { topic_id: topicId })
}

export async function getAllForumTopics(forumId?: number): Promise<ForumTopic[]> {
  const q: { forum_id?: number; page_size: number } = { page_size: 1000 }
  if (forumId) q.forum_id = forumId
  const res = await getForumTopics(q)
  return res.results
}

export async function createForumTopic(data: {
  forum: number
  title: string
  content: string
  user: number
}): Promise<ForumTopic> {
  return http.post<ForumTopic>('/forum_topics/create/', data)
}

export async function updateForumTopic(
  topicId: number,
  data: Partial<{ title: string; content: string; status: string }>
): Promise<ForumTopic> {
  return http.patch<ForumTopic>(`/forum_topics/${topicId}/update/`, data)
}

export async function deleteForumTopic(topicId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/forum_topics/${topicId}/delete/`)
}

// ─── Forum Comments ───────────────────────────────────────────────────────────

export async function getForumComments(
  params?: { topic_id?: number; user_id?: number; comment_id?: number; page?: number; page_size?: number }
): Promise<PaginatedResponse<ForumComment>> {
  const q: Record<string, string | number> = {}
  if (params?.topic_id) q.topic_id = params.topic_id
  if (params?.user_id) q.user_id = params.user_id
  if (params?.comment_id) q.comment_id = params.comment_id
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<ForumComment>>('/forum_comments/', q)
}

export async function getForumCommentById(commentId: number): Promise<ForumComment> {
  return http.get<ForumComment>('/forum_comments/', { comment_id: commentId })
}

export async function getAllForumComments(topicId: number): Promise<ForumComment[]> {
  const res = await getForumComments({ topic_id: topicId, page_size: 1000 })
  return res.results
}

export async function createForumComment(data: {
  topic: number
  content: string
  user: number
  parent?: number | null
}): Promise<ForumComment> {
  return http.post<ForumComment>('/forum_comments/create/', data)
}

export async function updateForumComment(
  commentId: number,
  data: Partial<{ content: string; status: string; is_best_answer: boolean }>
): Promise<ForumComment> {
  return http.patch<ForumComment>(`/forum_comments/${commentId}/update/`, data)
}

export async function deleteForumComment(commentId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/forum_comments/${commentId}/delete/`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatForumDate(dateStr: string): string {
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

export function getTopicStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Hoạt động'
    case 'locked': return 'Đã khóa'
    case 'deleted': return 'Đã xóa'
    default: return status
  }
}

export function getForumStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Hoạt động'
    case 'archived': return 'Lưu trữ'
    case 'deleted': return 'Đã xóa'
    default: return status
  }
}
