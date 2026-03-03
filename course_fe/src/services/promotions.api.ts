/**
 * Promotions API Service
 * CRUD for discount codes / promotions
 *
 * Endpoints:
 *   GET    /api/promotions/                           — List promotions (?promotion_id=, ?instructor_id=, ?admin_id=)
 *   POST   /api/promotions/create                     — Create promotion
 *   PATCH  /api/promotions/:id/update                 — Update promotion
 *   DELETE /api/promotions/:id/delete                 — Delete promotion
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────

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

// ─── API Functions ────────────────────────────────────────────

/** List promotions */
export async function getPromotions(params?: {
  promotion_id?: number
  instructor_id?: number
  admin_id?: number
}): Promise<Promotion[]> {
  const search = new URLSearchParams()
  if (params?.promotion_id) search.set('promotion_id', String(params.promotion_id))
  if (params?.instructor_id) search.set('instructor_id', String(params.instructor_id))
  if (params?.admin_id) search.set('admin_id', String(params.admin_id))
  const qs = search.toString()
  return http.get<Promotion[]>(`/promotions/${qs ? `?${qs}` : ''}`)
}

/** Get promotions for an instructor */
export async function getInstructorPromotions(instructorId: number): Promise<Promotion[]> {
  return getPromotions({ instructor_id: instructorId })
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

// ─── Helpers ──────────────────────────────────────────────────

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
