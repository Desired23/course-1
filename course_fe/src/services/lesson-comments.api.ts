










import { http } from './http'



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








export async function createLessonComment(data: {
  lesson: number
  content: string
  parent_comment?: number | null
}): Promise<LessonComment> {
  return http.post<LessonComment>('/comments/create', data)
}





export async function getLessonComments(
  lessonId: number,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<LessonComment>> {
  const q: Record<string, string | number> = {}
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<LessonComment>>(`/comments/lesson/${lessonId}/`, q)
}


export async function getAllLessonComments(lessonId: number): Promise<LessonComment[]> {
  const all: LessonComment[] = []
  let page = 1
  while (true) {
    const res = await getLessonComments(lessonId, { page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}





export async function getLessonCommentById(commentId: number): Promise<LessonComment> {
  return http.get<LessonComment>(`/comments/${commentId}`)
}


export async function getLessonCommentReplies(
  commentId: number,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<LessonComment>> {
  const q: Record<string, string | number> = { replies: 1 }
  if (params?.page) q.page = params.page
  if (params?.page_size) q.page_size = params.page_size
  return http.get<PaginatedResponse<LessonComment>>(`/comments/${commentId}`, q)
}


export async function getAllReplies(commentId: number): Promise<LessonComment[]> {
  const all: LessonComment[] = []
  let page = 1
  while (true) {
    const res = await getLessonCommentReplies(commentId, { page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}


export async function updateLessonComment(
  commentId: number,
  data: Partial<{ content: string; votes: number }>
): Promise<LessonComment> {
  return http.patch<LessonComment>(`/comments/${commentId}/update`, data)
}


export async function deleteLessonComment(commentId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/comments/${commentId}/manage/`)
}



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
