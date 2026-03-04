/**
 * Promotion API Service — Coupon / Discount Validation
 *
 * BE endpoints (all under /api/):
 *   POST /promotions/validate/  — validate a promotion code against cart courses
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromotionInfo {
  id: number
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  max_discount: string | null
  min_purchase: string
  type: 'admin' | 'instructor'
}

export interface PromotionCourseResult {
  course_id: number
  course_title: string
  original_price: string
  discount: string
  final_price: string
  applicable: boolean
}

export interface ValidatePromotionResponse {
  promotion: PromotionInfo
  courses: PromotionCourseResult[]
  total_original: string
  total_discount: string
  total_amount: string
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function validatePromotionCode(
  code: string,
  courseIds: number[]
): Promise<ValidatePromotionResponse> {
  return http.post<ValidatePromotionResponse>('/promotions/validate/', {
    code,
    course_ids: courseIds,
  })
}
