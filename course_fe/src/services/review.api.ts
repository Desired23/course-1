import { http } from './http'

// ── Types ──────────────────────────────────────────────────────────

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
  course: number          // FK id (write)
  user: number            // FK id (write)
  user_info: ReviewUserInfo
  course_detail: ReviewCourseDetail
  rating: number          // 1-5
  comment: string | null
  review_date: string     // ISO datetime
  updated_date: string    // ISO datetime
  status: 'pending' | 'approved' | 'rejected'
  likes: number
  report_count: number
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

// ── API Functions ──────────────────────────────────────────────────

/**
 * Get reviews for a specific course (public, paginated).
 */
export async function getReviewsByCourse(
  courseId: number,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Review>> {
  const res = await http.get<PaginatedResponse<Review>>(
    `/reviews/?course_id=${courseId}&page=${page}&page_size=${pageSize}`
  )
  return res
}

/**
 * Get ALL reviews across all courses (admin, auto-paginate).
 */
export async function getAllReviews(): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await http.get<PaginatedResponse<Review>>(`/reviews/?page=${page}&page_size=100`)
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/**
 * Get ALL reviews for a course (auto-paginate).
 */
export async function getAllReviewsByCourse(courseId: number): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await getReviewsByCourse(courseId, page, 100)
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/**
 * Get reviews written by a specific user (paginated).
 */
export async function getReviewsByUser(
  userId: number,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Review>> {
  const res = await http.get<PaginatedResponse<Review>>(
    `/reviews/?user_id=${userId}&page=${page}&page_size=${pageSize}`
  )
  return res
}

/**
 * Get ALL reviews by a user (auto-paginate).
 */
export async function getAllReviewsByUser(userId: number): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await getReviewsByUser(userId, page, 100)
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/**
 * Get reviews for all courses taught by an instructor (public, paginated).
 */
export async function getReviewsByInstructor(
  instructorId: number,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Review>> {
  const res = await http.get<PaginatedResponse<Review>>(
    `/reviews/?instructor_id=${instructorId}&page=${page}&page_size=${pageSize}`
  )
  return res
}

/**
 * Get ALL reviews for an instructor (auto-paginate).
 */
export async function getAllReviewsByInstructor(instructorId: number): Promise<Review[]> {
  const all: Review[] = []
  let page = 1
  while (true) {
    const res = await getReviewsByInstructor(instructorId, page, 100)
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}

/**
 * Get a single review by ID.
 */
export async function getReviewById(reviewId: number): Promise<Review> {
  return http.get<Review>(`/reviews/${reviewId}/`)
}

/**
 * Create a new review (requires enrollment).
 */
export async function createReview(data: {
  course: number
  rating: number
  comment?: string
}): Promise<Review> {
  return http.post<Review>('/reviews/create/', data)
}

/**
 * Update an existing review (owner or admin).
 */
export async function updateReview(
  reviewId: number,
  data: Partial<{ rating: number; comment: string }>
): Promise<Review> {
  return http.patch<Review>(`/reviews/update/${reviewId}/`, data)
}

/**
 * Delete a review (owner or admin).
 */
export async function deleteReview(reviewId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/reviews/delete/${reviewId}/`)
}

/**
 * Like / upvote a review — not exposed as a URL yet, placeholder.
 */
// export async function likeReview(reviewId: number) { ... }

// ── Helpers ────────────────────────────────────────────────────────

/** Format review date to locale string. */
export function formatReviewDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Calculate average rating from a list of reviews. */
export function calcAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

/** Check if a review was edited (updated_date differs from review_date). */
export function isEdited(review: Review): boolean {
  if (!review.updated_date || !review.review_date) return false
  // Allow 1 second tolerance for auto-set timestamps
  const diff = Math.abs(
    new Date(review.updated_date).getTime() - new Date(review.review_date).getTime()
  )
  return diff > 1000
}
