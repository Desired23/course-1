/**
 * Enrollment API Service
 *
 * BE endpoints:
 *   GET  /api/enrollments/               — list current user's enrollments (paginated)
 *   POST /api/enrollments/create/         — create enrollment
 *   GET  /api/enrollments/:enrollmentId/  — single enrollment detail
 *
 * Learning-progress endpoints:
 *   POST /api/learning-progress/update/          — create/update lesson progress
 *   PUT  /api/learning-progress/:lessonId/       — update lesson progress
 *   GET  /api/learning-progress/course/:courseId/ — course-level progress
 *   GET  /api/students/my-stats/                  — aggregated learning stats
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseSummary {
  course_id: number
  title: string
  thumbnail: string | null
  instructor_name: string | null
  total_lessons: number
  duration: number | null
  rating: string // decimal string
}

export interface Enrollment {
  enrollment_id: number
  user: number
  course: CourseSummary
  enrollment_date: string
  status: 'active' | 'complete' | 'expired' | 'cancelled' | 'suspended'
  source: 'purchase' | 'subscription'
  subscription: number | null
  progress: string // decimal string "0.00" – "100.00"
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

// Learning Progress types
export interface LessonProgress {
  progress_id: number
  user_id: number
  lesson_id: number
  course_id: number
  progress_percentage: string // decimal string
  time_spent: number | null
  is_completed: boolean
  last_position: number | null
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
  total_time_spent: number // seconds
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

// ─── Enrollment API functions ─────────────────────────────────────────────────

/** List current user's enrollments (paginated). */
export async function getMyEnrollments(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<Enrollment>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  const qs = searchParams.toString()
  return http.get<PaginatedResponse<Enrollment>>(
    `/enrollments/${qs ? `?${qs}` : ''}`
  )
}

/** Get ALL enrollments for current user (no pagination limit). */
export async function getAllMyEnrollments(): Promise<Enrollment[]> {
  const res = await getMyEnrollments({ page_size: 1000 })
  return res.results
}

/** Get single enrollment by ID. */
export async function getEnrollmentById(
  enrollmentId: number
): Promise<Enrollment> {
  return http.get<Enrollment>(`/enrollments/${enrollmentId}/`)
}

/** Create a new enrollment (enroll in course). */
export async function createEnrollment(
  data: EnrollmentCreateData
): Promise<any> {
  return http.post('/enrollments/create/', data)
}

// ─── Learning Progress API functions ──────────────────────────────────────────

/** Create or update lesson progress. */
export async function updateLessonProgress(data: {
  lesson_id: number
  progress_percentage?: number
  time_spent?: number
  is_completed?: boolean
  last_position?: number
}): Promise<any> {
  return http.post('/learning-progress/update/', data)
}

/** Update existing lesson progress (PUT). */
export async function updateLessonProgressById(
  lessonId: number,
  data: {
    progress_percentage?: number
    time_spent?: number
    is_completed?: boolean
    last_position?: number
  }
): Promise<any> {
  return http.put(`/learning-progress/${lessonId}/`, data)
}

/** Get course-level progress overview. */
export async function getCourseProgress(
  courseId: number
): Promise<CourseProgress> {
  return http.get<CourseProgress>(
    `/learning-progress/course/${courseId}/`
  )
}

/** Get aggregated student stats (my-stats). */
export async function getStudentStats(): Promise<StudentStats> {
  return http.get<StudentStats>('/students/my-stats/')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a decimal string (e.g. "45.50") to a number. */
export function parseProgress(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(n) ? 0 : n
}

/** Format time spent in seconds to a human readable string. */
export function formatTimeSpent(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 phút'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && mins > 0) return `${hours} giờ ${mins} phút`
  if (hours > 0) return `${hours} giờ`
  return `${mins} phút`
}
