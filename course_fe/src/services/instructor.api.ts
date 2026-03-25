import { API_BASE_URL, getAccessToken, http } from './http'
import { buildListQuery, type PaginatedResponse } from './common/pagination'

// ── Types ──────────────────────────────────────────────────────────

export interface InstructorUser {
  id: number
  username: string
  email: string
  full_name: string
  phone: string | null
  avatar: string | null
  address: string | null
  created_at: string
  last_login: string | null
  status: string
  user_type: string[]
}

export interface Instructor {
  id: number
  user: InstructorUser
  bio: string | null
  specialization: string | null
  qualification: string | null
  experience: number | null
  social_links: Record<string, string> | null
  rating: string            // Decimal from BE comes as string
  total_students: number
  total_courses: number
  payment_info: unknown | null
}

// ── API Functions ──────────────────────────────────────────────────

/**
 * Get paginated list of instructors (public).
 */
export async function getInstructors(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Instructor>> {
  return http.get<PaginatedResponse<Instructor>>('/instructors/', buildListQuery({ page, page_size: pageSize }))
}

/**
 * Get ALL instructors (auto-paginate).
 */
export async function getAllInstructors(): Promise<Instructor[]> {
  const all: Instructor[] = []
  let page = 1
  while (true) {
    const res = await getInstructors(page, 100)
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/**
 * Get a single instructor by ID (public).
 */
export async function getInstructorById(instructorId: number): Promise<Instructor> {
  return http.get<Instructor>(`/instructors/${instructorId}/`)
}

// ── Dashboard / Analytics ──────────────────────────────────────────

/** Dashboard stats (returned by GET /api/instructor/dashboard/stats/) */
export interface InstructorDashboardStats {
  total_courses: number
  published_courses: number
  draft_courses: number
  total_students: number
  new_students_this_month: number
  total_earnings: number
  this_month_earnings: number
  average_rating: number
  total_reviews: number
  pending_questions: number
  course_stats: Array<{
    course_id: number
    title: string
    total_students: number
    new_students_this_month: number
    rating: number
    total_reviews: number
    earnings: number
    completion_rate: number
  }>
}

export interface InstructorStudent {
  student_id: number
  full_name: string
  email: string
  avatar: string | null
  status: string
  enrolled_at: string | null
  last_access_date: string | null
  average_progress: number
  completion_count: number
  total_courses: number
  courses: Array<{
    course_id: number
    title: string
    status: string
    progress: number
    enrollment_date: string | null
    last_access_date: string | null
  }>
}

export interface InstructorStudentDetail extends InstructorStudent {
  phone: string | null
  address: string | null
  active_course_count: number
  courses: Array<{
    enrollment_id: number
    course_id: number
    title: string
    status: string
    progress: number
    enrollment_date: string | null
    last_access_date: string | null
    completion_date: string | null
    certificate: string | null
    total_lessons: number
    completed_lessons: number
    avg_lesson_progress: number
    time_spent_minutes: number
  }>
}

/** Course analytics (returned by GET /api/instructor/courses/<id>/analytics/) */
export interface CourseAnalytics {
  course_id: number
  title: string
  enrollment_trend: Array<{ date: string; enrollments: number }>
  revenue_trend: Array<{ date: string; revenue: number }>
  student_progress: {
    not_started: number
    in_progress: number
    completed: number
  }
  popular_lessons: Array<{
    lesson_id: number
    title: string
    views: number
    avg_completion_rate: number
  }>
  rating_distribution: Record<string, number>
}

/**
 * Get instructor dashboard stats.
 * For the authenticated instructor, no ID needed.
 * Admin can pass instructor_id.
 * GET /api/instructor/dashboard/stats/
 */
export async function getInstructorDashboardStats(
  instructorId?: number
): Promise<InstructorDashboardStats> {
  const query: Record<string, number> = {}
  if (instructorId) query.instructor_id = instructorId
  return http.get<InstructorDashboardStats>('/instructor/dashboard/stats/', query)
}

export async function getInstructorStudents(instructorId?: number, courseId?: number): Promise<InstructorStudent[]> {
  const query: Record<string, number> = {}
  if (instructorId) query.instructor_id = instructorId
  if (courseId) query.course_id = courseId
  return http.get<InstructorStudent[]>('/instructor/students/', query)
}

export async function getInstructorStudentDetail(studentId: number, instructorId?: number): Promise<InstructorStudentDetail> {
  const query: Record<string, number> = {}
  if (instructorId) query.instructor_id = instructorId
  return http.get<InstructorStudentDetail>(`/instructor/students/${studentId}/`, query)
}

export async function exportInstructorStudents(instructorId?: number, courseId?: number): Promise<void> {
  const params = new URLSearchParams()
  if (instructorId) params.set('instructor_id', String(instructorId))
  if (courseId) params.set('course_id', String(courseId))

  const token = getAccessToken()
  const response = await fetch(
    `${API_BASE_URL}/instructor/students/export/${params.toString() ? `?${params.toString()}` : ''}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )

  if (!response.ok) {
    let message = 'Failed to export students'
    try {
      const error = await response.json()
      message = error.message || error.error || message
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'instructor-students.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Get detailed analytics for a course.
 * GET /api/instructor/courses/<courseId>/analytics/
 */
export async function getInstructorCourseAnalytics(
  courseId: number
): Promise<CourseAnalytics> {
  return http.get<CourseAnalytics>(`/instructor/courses/${courseId}/analytics/`)
}

// ─── Analytics Time-series ─────────────────────────────────────

export interface AnalyticsTimeseries {
  revenue_trend: Array<{ date: string; revenue: number }>
  enrollment_trend: Array<{ date: string; enrollments: number }>
  engagement_trend: Array<{ date: string; active_learners: number; completions: number }>
  top_courses: Array<{ course_id: number; title: string; students: number; rating: number; revenue: number }>
  rating_distribution: Record<string, number>
}

/**
 * GET /api/instructor/analytics/timeseries/?months=12
 * Returns time-series analytics for all instructor courses.
 */
export async function getInstructorAnalyticsTimeseries(
  months = 12
): Promise<AnalyticsTimeseries> {
  return http.get<AnalyticsTimeseries>(`/instructor/analytics/timeseries/?months=${months}`)
}

// ── Instructor Profile Resolution ──────────────────────────────────

/** Cache for the current user's instructor profile. */
let _myInstructorCache: Instructor | null = null

/**
 * Resolve the current user's Instructor model profile by user ID.
 * Fetches the instructor list and finds the one matching the given userId.
 * Result is cached for the session.
 */
export async function getMyInstructorProfile(userId: number | string): Promise<Instructor> {
  if (_myInstructorCache && _myInstructorCache.user.id === Number(userId)) {
    return _myInstructorCache
  }
  const all = await getAllInstructors()
  const match = all.find(i => i.user.id === Number(userId))
  if (!match) throw new Error('Instructor profile not found for this user.')
  _myInstructorCache = match
  return match
}

/** Clear the cached instructor profile (e.g. on logout). */
export function clearInstructorCache() {
  _myInstructorCache = null
}

// ── Helpers ────────────────────────────────────────────────────────

/** Parse decimal rating string to number. */
export function parseRating(val: string | number | null | undefined): number {
  if (val == null) return 0
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : Math.round(n * 10) / 10
}

/** Get instructor initials for avatar fallback. */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Format student count (e.g. 125430 → "125.430"). */
export function formatStudentCount(count: number): string {
  return count.toLocaleString('vi-VN')
}

