import { http } from './http'

export interface ReviewUserInfo {
  user_id: number
  full_name: string
  avatar: string | null
}

export interface ReviewCourseDetail {
  course_id: number
  title: string
  thumbnail: string | null
}

export interface Review {
  review_id: number
  course: number
  user: number
  user_info: ReviewUserInfo
  course_detail: ReviewCourseDetail
  rating: number
  comment: string | null
  review_date: string
  updated_date: string
  status: 'pending' | 'approved' | 'rejected'
  likes: number
  report_count: number
  last_report_reason: string | null
  last_reported_at: string | null
  instructor_response: string | null
  response_date: string | null
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export async function getReviewsByCourse(
  courseId: number,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Review>> {
  return http.get<PaginatedResponse<Review>>('/reviews/', {
    course_id: courseId,
    page,
    page_size: pageSize,
  })
}

export async function getAllReviews(): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await http.get<PaginatedResponse<Review>>('/reviews/', { page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page += 1
  }
  return all
}

export async function getAllReviewsByCourse(courseId: number): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await getReviewsByCourse(courseId, page, 100)
    all.push(...res.results)
    if (!res.next) break
    page += 1
  }
  return all
}

export async function getReviewsByUser(
  userId: number,
  page = 1,
  pageSize = 20,
  params?: {
    search?: string
    rating?: string
    sort_by?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc'
  }
): Promise<PaginatedResponse<Review>> {
  return http.get<PaginatedResponse<Review>>('/reviews/', {
    user_id: userId,
    page,
    page_size: pageSize,
    search: params?.search,
    rating: params?.rating,
    sort_by: params?.sort_by,
  })
}

export async function getAllReviewsByUser(userId: number): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await getReviewsByUser(userId, page, 100)
    all.push(...res.results)
    if (!res.next) break
    page += 1
  }
  return all
}

export async function getReviewsByInstructor(
  instructorId: number,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Review>> {
  return http.get<PaginatedResponse<Review>>('/reviews/', {
    instructor_id: instructorId,
    page,
    page_size: pageSize,
  })
}

export async function getAllReviewsByInstructor(instructorId: number): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await getReviewsByInstructor(instructorId, page, 100)
    all.push(...res.results)
    if (!res.next) break
    page += 1
  }
  return all
}

export async function getReviewById(reviewId: number): Promise<Review> {
  return http.get<Review>(`/reviews/${reviewId}/`)
}

export async function createReview(data: {
  course: number
  rating: number
  comment?: string
}): Promise<Review> {
  return http.post<Review>('/reviews/create/', data)
}

export async function updateReview(
  reviewId: number,
  data: Partial<{
    rating: number
    comment: string
    status: 'pending' | 'approved' | 'rejected'
    instructor_response: string
  }>
): Promise<Review> {
  return http.patch<Review>(`/reviews/update/${reviewId}/`, data)
}

export async function deleteReview(reviewId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/reviews/delete/${reviewId}/`)
}

export async function reportReview(reviewId: number, reason?: string): Promise<Review> {
  return http.post<Review>(`/reviews/${reviewId}/report/`, { reason })
}

export async function moderateReview(
  reviewId: number,
  data: { action: 'approve' | 'dismiss' | 'hide' | 'delete'; reason?: string }
): Promise<Review> {
  return http.post<Review>(`/reviews/${reviewId}/moderate/`, data)
}

export function formatReviewDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function calcAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

export function isEdited(review: Review): boolean {
  if (!review.updated_date || !review.review_date) return false
  const diff = Math.abs(
    new Date(review.updated_date).getTime() - new Date(review.review_date).getTime()
  )
  return diff > 1000
}
