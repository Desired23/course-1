/**
 * Course API Service
 * 
 * BE endpoints:
 *   GET  /api/courses/              — public, paginated list (filters via query params)
 *   GET  /api/courses/{courseId}     — public, full detail with modules/lessons/enrollment
 *   POST /api/courses/create         — instructor/admin, create course
 *   PATCH /api/courses/{courseId}/update — instructor/admin, update course
 *   DELETE /api/courses/{courseId}/delete — instructor/admin, soft-delete
 * 
 * Pagination response format:
 *   { count, next, previous, page, total_pages, page_size, results }
 */

import { http } from './http'
import { buildListQuery, type PaginatedResponse } from './common/pagination'

// ─── Types ──────────────────────────────────────────────────

/** Course item returned in list endpoint (CourseSerializer) */
export interface CourseListItem {
  id: number
  title: string
  shortdescription: string | null
  description: string | null
  instructor: number | null          // instructor FK id
  category: number | null            // category FK id
  subcategory: number | null         // subcategory FK id
  thumbnail: string | null
  price: string                      // decimal as string from DRF
  discount_price: string | null
  discount_start_date: string | null
  discount_end_date: string | null
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
  language: string
  duration: number | null            // minutes
  total_lessons: number
  total_modules: number
  requirements: string | null
  learning_objectives: string[]      // JSON array of learning objective strings
  target_audience: string[]          // JSON array of target audience strings
  tags: string[]                     // JSON array of tag strings
  promotional_video: string | null   // URL of promotional video
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived'
  is_featured: boolean
  is_public: boolean
  created_at: string
  updated_at: string
  published_date: string | null
  rating: string                     // decimal as string
  total_reviews: number
  total_students: number
  certificate: boolean
  // Denormalized names (SerializerMethodField on BE)
  instructor_name: string | null
  instructor_avatar: string | null
  category_name: string | null
  subcategory_name: string | null
}

export interface CourseUpdateData extends Partial<CourseListItem> {
  // Optional moderation metadata (primarily for admin status changes)
  status_reason?: string
  send_notification?: boolean
  notify_title?: string
  notify_message?: string
}

/** Instructor summary in course detail */
export interface InstructorSummary {
  instructor_id: number
  user_id: number
  full_name: string
  avatar: string | null
  bio: string | null
  specialization: string | null
  rating: string
  total_students: number
  total_courses: number
}

/** Category summary in course detail */
export interface CategorySummary {
  category_id: number
  name: string
}

/** Lesson summary inside a module */
export interface LessonSummary {
  lesson_id: number
  title: string
  content_type: string
  video_url?: string | null
  video_public_id?: string | null
  signed_video_url?: string | null
  signed_video_expires_at?: string | null
  duration: number | null
  is_free: boolean
  order: number
  has_quiz: boolean
  quiz_count: number
}

/** Module summary with nested lessons */
export interface ModuleSummary {
  module_id: number
  title: string
  description: string | null
  order_number: number
  duration: number | null
  lessons: LessonSummary[]
}

/** User's enrollment info */
export interface UserEnrollment {
  enrollment_id: number
  enrollment_date: string
  progress: string
  status: string
  last_access_date: string | null
  completion_date: string | null
}

/** Access info for the current user */
export interface AccessInfo {
  has_access: boolean
  access_type: 'admin' | 'instructor' | 'purchase' | 'subscription' | null
  in_subscription: boolean
}

/** Full course detail (CourseDetailSerializer) */
export interface CourseDetail {
  id: number
  title: string
  shortdescription: string | null
  description: string | null
  instructor: InstructorSummary | null
  category: CategorySummary | null
  subcategory: CategorySummary | null
  thumbnail: string | null
  price: string
  discount_price: string | null
  discount_start_date: string | null
  discount_end_date: string | null
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
  language: string
  duration: number | null
  total_lessons: number
  total_modules: number
  requirements: string | null
  learning_objectives: string[]
  target_audience: string[]
  tags: string[]
  promotional_video: string | null
  status: string
  is_featured: boolean
  is_public: boolean
  created_at: string
  updated_at: string
  published_date: string | null
  rating: string
  total_reviews: number
  total_students: number
  certificate: boolean
  modules: ModuleSummary[]
  user_enrollment: UserEnrollment | null
  access_info: AccessInfo | null
}

// ─── Query params ───────────────────────────────────────────

export interface CourseListParams {
  page?: number
  page_size?: number
  instructor_id?: number
  category_id?: number
  subcategory_id?: number
  subcategory_ids?: string
  status?: string
  is_featured?: boolean
  level?: string
  levels?: string
  search?: string
  ordering?: string
  rating_min?: number
  language?: string
  languages?: string
  price_min?: number
  price_max?: number
  duration_buckets?: string
  certificate?: boolean
}

// ─── API functions ──────────────────────────────────────────

/**
 * Get paginated course list (public, no auth required)
 * GET /api/courses/?page=1&page_size=20
 * 
 * Note: BE currently returns ALL non-deleted courses without filtering.
 * Filtering (category, level, search, price) is done client-side for now.
 * When BE adds filter params, we can pass them directly.
 */
export async function getCourses(
  params?: CourseListParams
): Promise<PaginatedResponse<CourseListItem>> {
  const query = buildListQuery({
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 20,
    instructor_id: params?.instructor_id,
    category_id: params?.category_id,
    subcategory_id: params?.subcategory_id,
    subcategory_ids: params?.subcategory_ids,
    status: params?.status,
    is_featured: params?.is_featured !== undefined ? String(params.is_featured) : undefined,
    level: params?.level,
    levels: params?.levels,
    search: params?.search,
    ordering: params?.ordering,
    rating_min: params?.rating_min,
    language: params?.language,
    languages: params?.languages,
    price_min: params?.price_min,
    price_max: params?.price_max,
    duration_buckets: params?.duration_buckets,
    certificate: params?.certificate !== undefined ? String(params.certificate) : undefined,
  })
  return http.get<PaginatedResponse<CourseListItem>>('/courses/', query)
}

/**
 * Get all courses (no pagination limit) — useful for search/filter client-side.
 * Optionally pass params like instructor_id to narrow down.
 */
export async function getAllCourses(
  params?: Omit<CourseListParams, 'page' | 'page_size'>
): Promise<CourseListItem[]> {
  const all: CourseListItem[] = []
  let page = 1
  while (true) {
    const res = await getCourses({ ...params, page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/**
 * Get course detail by ID (public, no auth required)
 * GET /api/courses/{courseId}
 * 
 * Returns full detail with nested instructor, category, modules/lessons,
 * user_enrollment (if logged in), and access_info.
 */
export async function getCourseById(courseId: number): Promise<CourseDetail> {
  return http.get<CourseDetail>(`/courses/${courseId}`)
}

/**
 * Create a new course (instructor/admin only)
 * POST /api/courses/create
 */
export async function createCourse(
  data: Partial<CourseListItem>
): Promise<CourseListItem> {
  return http.post<CourseListItem>('/courses/create', data)
}

/**
 * Update an existing course (instructor/admin only)
 * PATCH /api/courses/{courseId}/update
 */
export async function updateCourse(
  courseId: number,
  data: CourseUpdateData
): Promise<CourseListItem> {
  return http.patch<CourseListItem>(`/courses/${courseId}/update`, data)
}

/**
 * Soft-delete a course (instructor/admin only)
 * DELETE /api/courses/{courseId}/delete
 */
export async function deleteCourse(
  courseId: number
): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/courses/${courseId}/delete`)
}

// ─── Helpers ────────────────────────────────────────────────

/** Parse a decimal string to number, defaulting to 0 */
export function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

/** Get effective price (discount or regular) */
export function getEffectivePrice(course: CourseListItem | CourseDetail): number {
  const now = new Date()
  const discountPrice = parseDecimal(course.discount_price)
  const regularPrice = parseDecimal(course.price)

  if (
    discountPrice > 0 &&
    course.discount_start_date &&
    course.discount_end_date &&
    new Date(course.discount_start_date) <= now &&
    new Date(course.discount_end_date) >= now
  ) {
    return discountPrice
  }
  return regularPrice
}

/** Check if course has active discount */
export function hasActiveDiscount(course: CourseListItem | CourseDetail): boolean {
  const now = new Date()
  return !!(
    course.discount_price &&
    parseDecimal(course.discount_price) > 0 &&
    course.discount_start_date &&
    course.discount_end_date &&
    new Date(course.discount_start_date) <= now &&
    new Date(course.discount_end_date) >= now
  )
}

/** Format price to VND */
export function formatPrice(amount: number): string {
  if (amount === 0) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Get level display label */
export function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: 'Người mới',
    intermediate: 'Trung cấp',
    advanced: 'Nâng cao',
    all_levels: 'Tất cả trình độ',
  }
  return labels[level] || level
}

/** Format duration (minutes to readable string) */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return '0 phút'
  if (minutes < 60) return `${minutes} phút`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`
}

// ─── Public stats ───────────────────────────────────────────

export interface PublicStats {
  total_courses: number
  total_students: number
  total_instructors: number
  avg_rating: number
}

/**
 * Get aggregate platform stats for the homepage.
 * GET /api/courses/stats/
 */
// simple cache for public stats (refresh every 30s)
let __publicStatsCache: Promise<PublicStats> | null = null
let __publicStatsCacheTime = 0
export async function getPublicStats(): Promise<PublicStats> {
  const now = Date.now()
  if (__publicStatsCache && now - __publicStatsCacheTime < 30000) {
    return __publicStatsCache
  }
  const promise = http.get<PublicStats>('/courses/stats/')
  __publicStatsCache = promise
  __publicStatsCacheTime = now
  return promise
}

export function clearCoursePublicStatsCache(): void {
  __publicStatsCache = null
  __publicStatsCacheTime = 0
}
