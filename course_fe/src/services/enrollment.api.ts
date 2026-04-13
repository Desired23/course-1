














import { http } from './http'



export interface CourseSummary {
  course_id: number
  title: string
  thumbnail: string | null
  instructor_name: string | null
  total_lessons: number
  duration: number | null
  rating: string
}

export interface Enrollment {
  enrollment_id: number
  user: number
  course: CourseSummary
  enrollment_date: string
  status: 'active' | 'complete' | 'expired' | 'cancelled' | 'suspended'
  source: 'purchase' | 'subscription'
  subscription: number | null
  progress: string
  certificate_issue_date: string | null
  completion_date: string | null
  last_access_date: string | null
}

export interface EnrollmentCreateData {
  course_id: number
  source?: 'purchase' | 'subscription'
  expiry_date?: string
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


export interface LessonProgress {
  progress_id: number
  user_id: number
  lesson_id: number
  course_id: number
  progress_percentage: string
  time_spent: number | null
  is_completed: boolean
  last_position: number | null
  notes?: string | null
  last_access_date: string | null
  completion_date: string | null
}

export interface CourseProgress {
  course_id: number
  overall_progress: number
  total_lessons: number
  completed_lessons: number
  total_time_spent: number
  lessons: LessonProgress[]
}

export interface StudentStats {
  total_courses_enrolled: number
  courses_in_progress: number
  courses_completed: number
  total_time_spent: number
  certificates_earned: number
  total_quizzes_taken: number
  average_quiz_score: number
  recent_activity: Array<{
    lesson_title: string
    course_title: string
    completed_at: string
  }>
  learning_streak: {
    current_streak: number
  }
}




export async function getMyEnrollments(params?: {
  page?: number
  page_size?: number
  status?: string
  source?: string
  search?: string
  enrollment_date_from?: string
  enrollment_date_to?: string
  purchase_date_from?: string
  purchase_date_to?: string
  sort_by?: string
}): Promise<PaginatedResponse<Enrollment>> {
  const searchParams = new URLSearchParams()
  if (params?.page !== undefined) searchParams.set('page', String(params.page))
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size))
  if (params?.status) searchParams.set('status', params.status)
  if (params?.source) searchParams.set('source', params.source)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.enrollment_date_from) searchParams.set('enrollment_date_from', params.enrollment_date_from)
  if (params?.enrollment_date_to) searchParams.set('enrollment_date_to', params.enrollment_date_to)
  if (params?.purchase_date_from) searchParams.set('purchase_date_from', params.purchase_date_from)
  if (params?.purchase_date_to) searchParams.set('purchase_date_to', params.purchase_date_to)
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by)
  const qs = searchParams.toString()
  return http.get<PaginatedResponse<Enrollment>>(
    `/enrollments/${qs ? `?${qs}` : ''}`
  )
}


export async function getAllMyEnrollments(): Promise<Enrollment[]> {
  const all: Enrollment[] = []
  let page = 1
  while (true) {
    const res = await getMyEnrollments({ page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}


export async function getEnrollmentById(
  enrollmentId: number
): Promise<Enrollment> {
  return http.get<Enrollment>(`/enrollments/${enrollmentId}/`)
}


export async function createEnrollment(
  data: EnrollmentCreateData
): Promise<any> {
  return http.post('/enrollments/create/', data)
}




export async function updateLessonProgress(data: {
  lesson_id: number
  progress_percentage?: number
  time_spent?: number
  is_completed?: boolean
  last_position?: number
  notes?: string | null
}): Promise<any> {
  return http.post('/learning-progress/update/', data)
}


export async function updateLessonProgressById(
  lessonId: number,
  data: {
    progress_percentage?: number
    time_spent?: number
    is_completed?: boolean
    last_position?: number
    notes?: string | null
  }
): Promise<any> {
  return http.put(`/learning-progress/${lessonId}/`, data)
}


export async function getCourseProgress(
  courseId: number
): Promise<CourseProgress> {
  return http.get<CourseProgress>(
    `/learning-progress/course/${courseId}/`
  )
}


export async function getStudentStats(): Promise<StudentStats> {
  return http.get<StudentStats>('/students/my-stats/')
}




export function parseProgress(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(n) ? 0 : n
}


export function formatTimeSpent(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 phút'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`
  if (hours > 0) return `${hours} giờ`
  return `${mins} phút`
}
