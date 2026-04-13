











import { http } from './http'



export interface CourseModule {
  id: number
  course: number | null
  title: string
  description: string | null
  order_number: number
  duration: number | null
  status: 'Draft' | 'Published'
  created_at: string
  updated_at: string
}

export type ModuleStatus = 'Draft' | 'Published'

export interface CourseModuleCreateData {
  course: number
  title: string
  description?: string
  order_number: number
  duration?: number
  status?: ModuleStatus
}

export interface CourseModuleUpdateData {
  title?: string
  description?: string
  order_number?: number
  duration?: number
  status?: ModuleStatus

  status_reason?: string
  send_notification?: boolean
  notify_title?: string
  notify_message?: string
}

export interface PaginatedModules {
  count: number
  next: string | null
  previous: string | null
  results: CourseModule[]
}




export async function getCourseModules(courseId?: number, page = 1, pageSize = 100): Promise<PaginatedModules> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (courseId) params.set('course_id', String(courseId))
  return http.get<PaginatedModules>(`/course_modules/?${params}`)
}


export async function getAllCourseModules(courseId: number): Promise<CourseModule[]> {
  const all: CourseModule[] = []
  let page = 1
  let safety = 0
  while (true) {
    const res = await getCourseModules(courseId, page)
    all.push(...res.results)
    if (!res.next) break
    page++
    safety++

    if (safety > 1000) break
  }
  return all.sort((a, b) => a.order_number - b.order_number)
}


export async function getCourseModuleById(moduleId: number): Promise<CourseModule> {
  return http.get<CourseModule>(`/course_modules/${moduleId}`)
}


export async function createCourseModule(data: CourseModuleCreateData): Promise<CourseModule> {
  return http.post<CourseModule>('/course_modules/create', data)
}


export async function updateCourseModule(moduleId: number, data: CourseModuleUpdateData): Promise<CourseModule> {
  return http.patch<CourseModule>(`/course_modules/${moduleId}/update`, data)
}


export async function deleteCourseModule(moduleId: number): Promise<void> {
  return http.delete(`/course_modules/${moduleId}/delete`)
}



export function getModuleStatusLabel(status: string): string {
  return status === 'Published' ? 'Đã xuất bản' : 'Bản nháp'
}
