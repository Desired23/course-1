













import { http } from './http'
import { buildListQuery, type PaginatedResponse } from './common/pagination'




export interface CourseListItem {
  id: number
  title: string
  shortdescription: string | null
  description: string | null
  instructor: number | null
  category: number | null
  subcategory: number | null
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
  skills_taught: string[]
  prerequisites: string[]
  tags: string[]
  promotional_video: string | null
  duration_hours?: number | null
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived'
  is_featured: boolean
  is_public: boolean
  created_at: string
  updated_at: string
  published_date: string | null
  content_changed_since_publish: boolean
  rating: string
  total_reviews: number
  total_students: number
  certificate: boolean

  instructor_name: string | null
  instructor_avatar: string | null
  category_name: string | null
  subcategory_name: string | null
}

export interface CourseUpdateData extends Partial<CourseListItem> {

  status_reason?: string
  send_notification?: boolean
  notify_title?: string
  notify_message?: string
}


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


export interface CategorySummary {
  category_id: number
  name: string
}


export interface LessonSummary {
  lesson_id: number
  title: string
  content_type: string
  video_url?: string | null
  video_public_id?: string | null
  signed_video_url?: string | null
  signed_video_expires_at?: string | null
  transcript_status?: 'queued' | 'processing' | 'failed' | 'draft' | 'reviewed' | 'published' | 'stale' | null
  has_published_transcript?: boolean
  transcript_language_codes?: string[]
  latest_transcript_version?: number | null
  transcript_last_generated_at?: string | null
  duration: number | null
  is_free: boolean
  order: number
  has_quiz: boolean
  quiz_count: number
}


export interface ModuleSummary {
  module_id: number
  title: string
  description: string | null
  order_number: number
  duration: number | null
  lessons: LessonSummary[]
}


export interface UserEnrollment {
  enrollment_id: number
  enrollment_date: string
  progress: string
  status: string
  last_access_date: string | null
  completion_date: string | null
}


export interface AccessInfo {
  has_access: boolean
  access_type: 'admin' | 'instructor' | 'purchase' | 'subscription' | null
  in_subscription: boolean
}


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
  skills_taught: string[]
  prerequisites: string[]
  tags: string[]
  promotional_video: string | null
  duration_hours?: number | null
  status: string
  is_featured: boolean
  is_public: boolean
  created_at: string
  updated_at: string
  published_date: string | null
  content_changed_since_publish: boolean
  rating: string
  total_reviews: number
  total_students: number
  certificate: boolean
  modules: ModuleSummary[]
  user_enrollment: UserEnrollment | null
  access_info: AccessInfo | null
}

export interface CourseStudentRow {
  student_id: number
  full_name: string
  email: string
  avatar: string | null
  status: string
  enrolled_at: string | null
  last_access_date: string | null
  average_progress: number
  study_time_minutes: number
  rating: number | null
}



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








export async function getCourseById(courseId: number): Promise<CourseDetail> {
  return http.get<CourseDetail>(`/courses/${courseId}`)
}

export async function getCourseStudents(
  courseId: number,
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<CourseStudentRow>> {
  return http.get<PaginatedResponse<CourseStudentRow>>(
    `/courses/${courseId}/students/`,
    buildListQuery({ page, page_size: pageSize }),
  )
}





export async function createCourse(
  data: Partial<CourseListItem>
): Promise<CourseListItem> {
  return http.post<CourseListItem>('/courses/create', data)
}





export async function updateCourse(
  courseId: number,
  data: CourseUpdateData
): Promise<CourseListItem> {
  return http.patch<CourseListItem>(`/courses/${courseId}/update`, data)
}





export async function deleteCourse(
  courseId: number
): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/courses/${courseId}/delete`)
}




export function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}


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


export function formatPrice(amount: number): string {
  if (amount === 0) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}


export function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: 'Người mới',
    intermediate: 'Trung cấp',
    advanced: 'Nâng cao',
    all_levels: 'Tất cả trình độ',
  }
  return labels[level] || level
}


export function formatDuration(minutes: number | null): string {
  if (!minutes) return '0 phút'
  if (minutes < 60) return `${minutes} phút`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`
}



export interface PublicStats {
  total_courses: number
  total_students: number
  total_instructors: number
  avg_rating: number
}






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
