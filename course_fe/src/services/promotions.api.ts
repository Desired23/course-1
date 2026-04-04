/**
 * Promotions API Service
 * CRUD for discount codes / promotions
 *
 * Endpoints:
 *   GET    /api/promotions/                           Ã¢â‚¬â€ List promotions (?promotion_id=, ?instructor_id=, ?admin_id=)
 *   POST   /api/promotions/create                     Ã¢â‚¬â€ Create promotion
 *   PATCH  /api/promotions/:id/update                 Ã¢â‚¬â€ Update promotion
 *   DELETE /api/promotions/:id/delete                 Ã¢â‚¬â€ Delete promotion
 */

import { http } from './http'

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export type DiscountType = 'percentage' | 'fixed'
export type PromotionStatus = 'active' | 'inactive' | 'expired'

export interface Promotion {
  id: number
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: string // decimal string
  start_date: string
  end_date: string
  usage_limit: number | null
  used_count: number
  min_purchase: string // decimal string
  max_discount: string | null // decimal string
  applicable_courses: number[]
  applicable_categories: number[]
  admin: number | null
  instructor: number | null
  status: PromotionStatus
  created_at: string
  updated_at: string
}

export interface PromotionCreateData {
  code: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  start_date: string
  end_date: string
  usage_limit?: number
  min_purchase?: number
  max_discount?: number
  applicable_courses?: number[]
  applicable_categories?: number[]
  instructor?: number
  status?: PromotionStatus
}

export interface PromotionUpdateData {
  code?: string
  description?: string
  discount_type?: DiscountType
  discount_value?: number
  start_date?: string
  end_date?: string
  usage_limit?: number
  min_purchase?: number
  max_discount?: number
  applicable_courses?: number[]
  applicable_categories?: number[]
  status?: PromotionStatus
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page?: number
  total_pages?: number
  page_size?: number
  results: T[]
}

export interface PromotionListParams {
  promotion_id?: number
  instructor_id?: number
  admin_id?: number
  status?: PromotionStatus
  search?: string
  course_id?: number
  page?: number
  page_size?: number
}

function normalizePromotionsPayload(
  payload: Promotion[] | PaginatedResponse<Promotion>,
  page: number,
  pageSize: number
): PaginatedResponse<Promotion> {
  if (Array.isArray(payload)) {
    const totalPages = Math.max(1, Math.ceil(payload.length / pageSize))
    const start = (page - 1) * pageSize
    return {
      count: payload.length,
      next: page < totalPages ? String(page + 1) : null,
      previous: page > 1 ? String(page - 1) : null,
      page,
      total_pages: totalPages,
      page_size: pageSize,
      results: payload.slice(start, start + pageSize),
    }
  }
  return {
    count: payload.count ?? payload.results?.length ?? 0,
    next: payload.next ?? null,
    previous: payload.previous ?? null,
    page: payload.page ?? page,
    total_pages: payload.total_pages ?? Math.max(1, Math.ceil((payload.count ?? 0) / (payload.page_size || pageSize))),
    page_size: payload.page_size ?? pageSize,
    results: Array.isArray(payload.results) ? payload.results : [],
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ API Functions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** List promotions */
export async function getPromotionsPage(params?: PromotionListParams): Promise<PaginatedResponse<Promotion>> {
  const query: Record<string, string | number> = {}
  if (params?.promotion_id) query.promotion_id = params.promotion_id
  if (params?.instructor_id) query.instructor_id = params.instructor_id
  if (params?.admin_id) query.admin_id = params.admin_id
  if (params?.status) query.status = params.status
  if (params?.search) query.search = params.search
  if (params?.course_id) query.course_id = params.course_id

  const page = params?.page ?? 1
  const pageSize = params?.page_size ?? 20
  query.page = page
  query.page_size = pageSize

  const payload = await http.get<Promotion[] | PaginatedResponse<Promotion>>('/promotions/', query)
  return normalizePromotionsPayload(payload, page, pageSize)
}

/** List promotions */
export async function getPromotions(params?: Omit<PromotionListParams, 'page' | 'page_size'>): Promise<Promotion[]> {
  const query = { ...(params || {}) }

  const all: Promotion[] = []
  let page = 1
  while (true) {
    const res = await getPromotionsPage({
      ...query,
      page,
      page_size: 100,
    })
    all.push(...res.results)
    if (!res.next) break
    page++
  }

  return all
}

/** Get promotions for an instructor */
export async function getInstructorPromotions(instructorId: number): Promise<Promotion[]> {
  return getPromotions({ instructor_id: instructorId })
}

/** Get promotions for an instructor (paginated) */
export async function getInstructorPromotionsPage(params: {
  instructor_id: number
  status?: PromotionStatus
  search?: string
  course_id?: number
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<Promotion>> {
  return getPromotionsPage(params)
}

/** Create promotion */
export async function createPromotion(data: PromotionCreateData): Promise<Promotion> {
  return http.post<Promotion>('/promotions/create', data)
}

/** Update promotion */
export async function updatePromotion(promotionId: number, data: PromotionUpdateData): Promise<Promotion> {
  return http.patch<Promotion>(`/promotions/${promotionId}/update`, data)
}

/** Delete promotion */
export async function deletePromotion(promotionId: number): Promise<void> {
  return http.delete(`/promotions/${promotionId}/delete`)
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0
  return parseFloat(value) || 0
}

export function formatDiscountValue(type: DiscountType, value: string): string {
  const num = parseDecimal(value)
  if (type === 'percentage') return `${num}%`
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

export function getPromotionStatusLabel(status: PromotionStatus): string {
  const labels: Record<PromotionStatus, string> = {
    active: 'Đang hoạt động',
    inactive: 'Không hoạt động',
    expired: 'Đã hết hạn',
  }
  return labels[status] || status
}

export function isPromotionActive(promo: Promotion): boolean {
  if (promo.status !== 'active') return false
  const now = new Date()
  return new Date(promo.start_date) <= now && now <= new Date(promo.end_date)
}
