/**
 * Course Modules API Service
 * CRUD operations for course modules (sections)
 *
 * Endpoints:
 *   GET    /api/course_modules/                         Ã¢â‚¬â€ List all modules (paginated)
 *   POST   /api/course_modules/create                   Ã¢â‚¬â€ Create module
 *   GET    /api/course_modules/:id                      Ã¢â‚¬â€ Get module detail
 *   PATCH  /api/course_modules/:id/update               Ã¢â‚¬â€ Update module
 *   DELETE /api/course_modules/:id/delete               Ã¢â‚¬â€ Delete module
 */

import { http } from './http'

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
  // Optional moderation metadata (primarily for admin status changes)
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ API Functions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** List modules Ã¢â‚¬â€ optionally filter by course */
export async function getCourseModules(courseId?: number, page = 1, pageSize = 100): Promise<PaginatedModules> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (courseId) params.set('course_id', String(courseId))
  return http.get<PaginatedModules>(`/course_modules/?${params}`)
}

/** Get all modules for a course (auto-paginate) */
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
    // Guard against accidental infinite pagination loops
    if (safety > 1000) break
  }
  return all.sort((a, b) => a.order_number - b.order_number)
}

/** Get single module */
export async function getCourseModuleById(moduleId: number): Promise<CourseModule> {
  return http.get<CourseModule>(`/course_modules/${moduleId}`)
}

/** Create module */
export async function createCourseModule(data: CourseModuleCreateData): Promise<CourseModule> {
  return http.post<CourseModule>('/course_modules/create', data)
}

/** Update module */
export async function updateCourseModule(moduleId: number, data: CourseModuleUpdateData): Promise<CourseModule> {
  return http.patch<CourseModule>(`/course_modules/${moduleId}/update`, data)
}

/** Delete module */
export async function deleteCourseModule(moduleId: number): Promise<void> {
  return http.delete(`/course_modules/${moduleId}/delete`)
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function getModuleStatusLabel(status: string): string {
  return status === 'Published' ? 'Đã xuất bản' : 'Bản nháp'
}
