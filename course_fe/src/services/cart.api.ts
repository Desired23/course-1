








import { http } from './http'



export interface CartCourseDetail {
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
}

export interface CartItem {
  id: number
  user: number
  course: number
  course_detail: CartCourseDetail
  promotion: number | null
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




export async function getCartByUser(
  userId: number,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<CartItem>> {
  const searchParams = new URLSearchParams()
  searchParams.set('user_id', String(userId))
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  return http.get<PaginatedResponse<CartItem>>(
    `/carts/?${searchParams.toString()}`
  )
}


export async function getAllCartByUser(userId: number): Promise<CartItem[]> {
  const all: CartItem[] = []
  let page = 1
  while (true) {
    const res = await getCartByUser(userId, { page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }
  return all
}


export async function addToCart(data: {
  user: number
  course: number
  promotion?: number
}): Promise<CartItem> {
  return http.post<CartItem>('/carts/create/', data)
}


export async function removeFromCart(
  cartId: number
): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/carts/${cartId}/delete/`)
}




function parseDecimal(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(n) ? 0 : n
}


export function getCartEffectivePrice(course: CartCourseDetail): number {
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


export function getCartOriginalPrice(course: CartCourseDetail): number {
  return parseDecimal(course.original_price)
}


export function formatCartPrice(amount: number): string {
  if (amount === 0) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫'
}
