








import { http } from './http'



export interface WishlistCourseDetail {
  id: number
  title: string
  thumbnail: string | null
  instructor_name: string | null
  original_price: string | null
  discount_price: string | null
  discount_start_date: string | null
  discount_end_date: string | null
  rating: string
  enrollment_count: number
  duration: number | null
  level: string
  short_description: string | null
  status: string
}

export interface WishlistItem {
  id: number
  user: number
  course: number
  course_detail: WishlistCourseDetail
  created_at: string
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




export async function getWishlistByUser(
  userId: number,
  params?: {
    page?: number
    page_size?: number
    search?: string
    level?: string
    sort_by?: string
  }
): Promise<PaginatedResponse<WishlistItem>> {
  const searchParams = new URLSearchParams()
  searchParams.set('user_id', String(userId))
  if (params?.page !== undefined) searchParams.set('page', String(params.page))
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size))
  if (params?.search) searchParams.set('search', params.search)
  if (params?.level) searchParams.set('level', params.level)
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by)
  return http.get<PaginatedResponse<WishlistItem>>(
    `/wishlists/?${searchParams.toString()}`
  )
}


export async function getAllWishlistByUser(userId: number): Promise<WishlistItem[]> {
  const all: WishlistItem[] = []
  let page = 1
  while (true) {
    const res = await getWishlistByUser(userId, { page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}


export async function addToWishlist(data: {
  user: number
  course: number
}): Promise<WishlistItem> {
  return http.post<WishlistItem>('/wishlists/create/', data)
}


export async function removeFromWishlist(
  wishlistId: number
): Promise<{ message: string }> {
  return http.delete<{ message: string }>(
    `/wishlists/${wishlistId}/delete/`
  )
}




export function parseDecimal(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(n) ? 0 : n
}


export function getWishlistEffectivePrice(course: WishlistCourseDetail): number {
  const now = new Date()
  const discountPrice = parseDecimal(course.discount_price)
  const originalPrice = parseDecimal(course.original_price)
  if (
    discountPrice > 0 &&
    course.discount_start_date &&
    course.discount_end_date
  ) {
    const start = new Date(course.discount_start_date)
    const end = new Date(course.discount_end_date)
    if (now >= start && now <= end) return discountPrice
  }
  return originalPrice
}
