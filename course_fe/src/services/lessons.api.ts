/**
 * Lessons API Service
 * CRUD operations for course lessons
 *
 * Endpoints:
 *   GET    /api/lessons/                   — List all lessons (paginated)
 *   POST   /api/lessons/create             — Create lesson
 *   GET    /api/lessons/:id                — Get lesson detail
 *   PATCH  /api/lessons/:id/update         — Update lesson
 *   DELETE /api/lessons/:id/delete         — Delete lesson
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────

export type LessonContentType = 'video' | 'text' | 'quiz' | 'assignment' | 'file' | 'link'
export type LessonStatus = 'draft' | 'published'

export interface Lesson {
  id: number
  coursemodule: number
  title: string
  description: string | null
  content_type: LessonContentType
  content: string | null
  video_url: string | null
  file_path: string | null
  duration: number | null
  is_free: boolean
  order: number
  status: LessonStatus
  created_at: string
  updated_at: string
}

export interface LessonCreateData {
  coursemodule: number
  title: string
  description?: string
  content_type: LessonContentType
  content?: string
  video_url?: string
  file_path?: string
  duration?: number
  is_free?: boolean
  order: number
  status?: LessonStatus
}

export interface LessonUpdateData {
  title?: string
  description?: string
  content_type?: LessonContentType
  content?: string
  video_url?: string
  file_path?: string
  duration?: number
  is_free?: boolean
  order?: number
  status?: LessonStatus
}

export interface PaginatedLessons {
  count: number
  next: string | null
  previous: string | null
  results: Lesson[]
}

// ─── API Functions ────────────────────────────────────────────

/** List lessons (paginated) */
export async function getLessons(params?: { coursemodule_id?: number; content_type?: LessonContentType; instructor_id?: number; page?: number }): Promise<PaginatedLessons> {
  const search = new URLSearchParams()
  if (params?.coursemodule_id) search.set('coursemodule_id', String(params.coursemodule_id))
  if (params?.content_type) search.set('content_type', params.content_type)
  if (params?.instructor_id) search.set('instructor_id', String(params.instructor_id))
  if (params?.page) search.set('page', String(params.page))
  const qs = search.toString()
  return http.get<PaginatedLessons>(`/lessons/${qs ? `?${qs}` : ''}`)
}

/** Get all lessons for a module (auto-paginate) */
export async function getAllLessons(coursemoduleId: number): Promise<Lesson[]> {
  const all: Lesson[] = []
  let page = 1
  while (true) {
    const res = await getLessons({ coursemodule_id: coursemoduleId, page })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all.sort((a, b) => a.order - b.order)
}

/** Get single lesson */
export async function getLessonById(lessonId: number): Promise<Lesson> {
  return http.get<Lesson>(`/lessons/${lessonId}`)
}

/** Create lesson */
export async function createLesson(data: LessonCreateData): Promise<Lesson> {
  return http.post<Lesson>('/lessons/create', data)
}

/** Update lesson */
export async function updateLesson(lessonId: number, data: LessonUpdateData): Promise<Lesson> {
  return http.patch<Lesson>(`/lessons/${lessonId}/update`, data)
}

/** Delete lesson */
export async function deleteLesson(lessonId: number): Promise<void> {
  return http.delete(`/lessons/${lessonId}/delete`)
}

// ─── Helpers ──────────────────────────────────────────────────

export function getContentTypeLabel(type: LessonContentType): string {
  const labels: Record<LessonContentType, string> = {
    video: 'Video',
    text: 'Bài viết',
    quiz: 'Bài kiểm tra',
    assignment: 'Bài tập',
    file: 'Tệp đính kèm',
    link: 'Liên kết',
  }
  return labels[type] || type
}

export function getContentTypeIcon(type: LessonContentType): string {
  const icons: Record<LessonContentType, string> = {
    video: 'Play',
    text: 'FileText',
    quiz: 'HelpCircle',
    assignment: 'Edit',
    file: 'Paperclip',
    link: 'ExternalLink',
  }
  return icons[type] || 'File'
}
