












import { API_BASE_URL, http } from './http'



export interface LessonAttachment {
  id: number
  lesson: number | null
  lesson_title?: string | null
  course_id?: number | null
  course_title?: string | null
  title: string | null
  file_path: string
  file_type: string | null
  file_size: number | null
  download_count: number
  created_at: string
}

export interface PaginatedAttachments {
  count: number
  next: string | null
  previous: string | null
  page?: number
  total_pages?: number
  page_size?: number
  results: LessonAttachment[]
}

export interface AttachmentListParams {
  instructor_id?: number
  course_id?: number
  file_type?: string
  search?: string
  sort_by?: 'newest' | 'downloads' | 'title'
  page?: number
  page_size?: number
}

export interface AttachmentCreateData {
  lesson: number
  title?: string
  file_path: string
  file_type?: string
  file_size?: number
}

export interface AttachmentUpdateData {
  title?: string
  file_path?: string
  file_type?: string
  file_size?: number
}




export async function getAttachmentsPage(params?: AttachmentListParams): Promise<PaginatedAttachments> {
  const query: Record<string, string | number> = {}
  if (params?.instructor_id) query.instructor_id = params.instructor_id
  if (params?.course_id) query.course_id = params.course_id
  if (params?.file_type) query.file_type = params.file_type
  if (params?.search) query.search = params.search
  if (params?.sort_by) query.sort_by = params.sort_by
  if (params?.page) query.page = params.page
  if (params?.page_size) query.page_size = params.page_size
  return http.get<PaginatedAttachments>('/attachments/', query)
}


export async function getAttachments(params?: Omit<AttachmentListParams, 'page' | 'page_size'>): Promise<LessonAttachment[]> {
  const all: LessonAttachment[] = []
  let page = 1
  while (true) {
    const res = await getAttachmentsPage({ ...(params || {}), page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}


export async function getAttachmentsByLesson(lessonId: number): Promise<LessonAttachment[]> {
  const all: LessonAttachment[] = []
  let page = 1
  while (true) {
    const res = await http.get<PaginatedAttachments | LessonAttachment[]>(
      `/attachments/lesson/${lessonId}/?page=${page}&page_size=100`
    )
    if (Array.isArray(res)) {
      all.push(...res)
      break
    }
    all.push(...(res.results || []))
    if (!res.next) break
    page++
  }
  return all
}


export async function getAttachmentById(attachmentId: number): Promise<LessonAttachment> {
  return http.get<LessonAttachment>(`/attachments/detail/${attachmentId}/`)
}


export async function createAttachment(data: AttachmentCreateData): Promise<LessonAttachment> {
  return http.post<LessonAttachment>('/attachments/create/', data)
}


export async function updateAttachment(attachmentId: number, data: AttachmentUpdateData): Promise<LessonAttachment> {
  return http.patch<LessonAttachment>(`/attachments/update/${attachmentId}/`, data)
}


export async function deleteAttachment(attachmentId: number): Promise<void> {
  return http.delete(`/attachments/delete/${attachmentId}/`)
}



export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileTypeIcon(fileType: string | null): string {
  if (!fileType) return 'File'
  if (fileType.includes('pdf')) return 'FileText'
  if (fileType.includes('image')) return 'Image'
  if (fileType.includes('video')) return 'Video'
  if (fileType.includes('zip') || fileType.includes('rar')) return 'Archive'
  if (fileType.includes('doc') || fileType.includes('word')) return 'FileText'
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return 'Table'
  return 'File'
}

export function resolveAttachmentUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null
  if (/^https?:\/\//i.test(filePath)) return filePath
  if (filePath.startsWith('//')) return `https:${filePath}`

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '')
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`
  return `${apiOrigin}${normalizedPath}`
}
