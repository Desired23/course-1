











import { http } from './http'



export type LessonContentType = 'video' | 'text' | 'quiz' | 'code' | 'assignment' | 'file' | 'link'
export type LessonStatus = 'draft' | 'published'

export interface Lesson {
  id: number
  coursemodule: number
  title: string
  description: string | null
  content_type: LessonContentType
  content: string | null
  video_url: string | null
  video_public_id: string | null
  signed_video_url?: string | null
  signed_video_expires_at?: string | null
  transcript_status?: 'queued' | 'processing' | 'failed' | 'draft' | 'reviewed' | 'published' | 'stale' | null
  has_published_transcript?: boolean
  transcript_language_codes?: string[]
  latest_transcript_version?: number | null
  transcript_last_generated_at?: string | null
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
  video_public_id?: string
  file_path?: string
  duration?: number
  is_free?: boolean
  order: number
  status?: LessonStatus
}

export interface LessonUpdateData {
  coursemodule?: number
  title?: string
  description?: string
  content_type?: LessonContentType
  content?: string
  video_url?: string
  video_public_id?: string
  file_path?: string
  duration?: number
  is_free?: boolean
  order?: number
  status?: LessonStatus

  status_reason?: string
  send_notification?: boolean
  notify_title?: string
  notify_message?: string
}

export interface PaginatedLessons {
  count: number
  next: string | null
  previous: string | null
  page?: number
  total_pages?: number
  page_size?: number
  results: Lesson[]
}




export async function getLessons(params?: {
  coursemodule_id?: number
  content_type?: LessonContentType
  instructor_id?: number
  status?: LessonStatus
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}): Promise<PaginatedLessons> {
  const search = new URLSearchParams()
  if (params?.coursemodule_id) search.set('coursemodule_id', String(params.coursemodule_id))
  if (params?.content_type) search.set('content_type', params.content_type)
  if (params?.instructor_id) search.set('instructor_id', String(params.instructor_id))
  if (params?.status) search.set('status', params.status)
  if (params?.search) search.set('search', params.search)
  if (params?.ordering) search.set('ordering', params.ordering)
  if (params?.page) search.set('page', String(params.page))
  if (params?.page_size) search.set('page_size', String(params.page_size))
  const qs = search.toString()
  return http.get<PaginatedLessons>(`/lessons/${qs ? `?${qs}` : ''}`)
}


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


export async function getLessonById(lessonId: number): Promise<Lesson> {
  return http.get<Lesson>(`/lessons/${lessonId}`)
}


export async function createLesson(data: LessonCreateData): Promise<Lesson> {
  return http.post<Lesson>('/lessons/create', data)
}


export async function updateLesson(lessonId: number, data: LessonUpdateData): Promise<Lesson> {
  return http.patch<Lesson>(`/lessons/${lessonId}/update`, data)
}


export async function deleteLesson(lessonId: number): Promise<void> {
  return http.delete(`/lessons/${lessonId}/delete`)
}



export function getContentTypeLabel(type: LessonContentType): string {
  const labels: Record<LessonContentType, string> = {
    video: 'Video',
    text: 'Article',
    quiz: 'Quiz',
    code: 'Coding Exercise',
    assignment: 'Assignment',
    file: 'Attachment',
    link: 'Link',
  }
  return labels[type] || type
}

export function getContentTypeIcon(type: LessonContentType): string {
  const icons: Record<LessonContentType, string> = {
    video: 'Play',
    text: 'FileText',
    quiz: 'HelpCircle',
    code: 'Code',
    assignment: 'Edit',
    file: 'Paperclip',
    link: 'ExternalLink',
  }
  return icons[type] || 'File'
}


