/**
 * Subscription API Service Ã¢â‚¬â€ Plans, User Subscriptions
 *
 * BE endpoints (all under /api/):
 *   Public:
 *     GET    /subscription-plans/                              Ã¢â‚¬â€ list active plans
 *     GET    /subscription-plans/<plan_id>/courses/            Ã¢â‚¬â€ list plan courses
 *
 *   User:
 *     POST   /subscriptions/subscribe/                         Ã¢â‚¬â€ subscribe to a plan
 *     GET    /subscriptions/me/                                Ã¢â‚¬â€ get my subscriptions
 *     GET    /subscriptions/me/courses/                        Ã¢â‚¬â€ list courses from my subscription
 *     POST   /subscriptions/<subscription_id>/cancel/          Ã¢â‚¬â€ cancel subscription
 *     GET    /subscriptions/access/                            Ã¢â‚¬â€ check course access
 *
 *   Admin:
 *     GET/POST /subscription-plans/admin/                      Ã¢â‚¬â€ list / create plans
 *     PATCH/DEL /subscription-plans/admin/<plan_id>/           Ã¢â‚¬â€ update / delete plan
 *     GET/POST  /subscription-plans/admin/<plan_id>/courses/   Ã¢â‚¬â€ manage plan courses
 *     GET    /subscription-plans/admin/<plan_id>/subscribers/  Ã¢â‚¬â€ list subscribers
 *     POST   /subscription-plans/admin/expire/                 Ã¢â‚¬â€ expire old subscriptions
 *
 *   Instructor:
 *     GET/POST /subscriptions/consents/me/                     Ã¢â‚¬â€ manage course consents
 *     POST     /subscriptions/usage/track/                     Ã¢â‚¬â€ track usage
 */

import { http } from './http'

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export interface PlanCourse {
  id: number
  plan: number
  course: number
  status: 'active' | 'removed'
  added_at: string
  added_reason: string | null
  removed_at: string | null
  course_title: string
  course_thumbnail: string | null
  course_instructor: string | null
  course_price: string
  course_rating: string | null
}

export interface SubscriptionPlan {
  id: number
  name: string
  description: string | null
  price: string
  discount_price: string | null
  duration_type: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'lifetime'
  duration_days: number
  status: 'active' | 'inactive' | 'archived'
  is_featured: boolean
  max_subscribers: number | null
  instructor_share_percent: string
  yearly_discount_percent: string
  thumbnail: string | null
  features: string[]
  not_included: string[]
  badge_text: string | null
  icon: string | null
  highlight_color: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  effective_price: string
  current_subscribers: number
  course_count: number
  courses?: PlanCourse[]
}

export interface SubscriptionPlanListItem {
  id: number
  name: string
  description: string | null
  price: string
  discount_price: string | null
  duration_type: string
  duration_days: number
  status: string
  is_featured: boolean
  yearly_discount_percent?: string
  thumbnail: string | null
  features: string[]
  not_included: string[]
  badge_text: string | null
  icon: string | null
  highlight_color: string | null
  effective_price: string
  course_count: number
}

export interface UserSubscription {
  id: number
  user: number
  plan: number
  payment: number | null
  status: 'active' | 'expired' | 'cancelled'
  start_date: string
  end_date: string | null
  auto_renew: boolean
  cancelled_at: string | null
  created_at: string
  plan_name: string
  plan_detail?: SubscriptionPlanListItem
  is_active: boolean
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Public Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export async function getSubscriptionPlans(): Promise<SubscriptionPlanListItem[]> {
  const res = await http.get<PaginatedResponse<SubscriptionPlanListItem> | SubscriptionPlanListItem[]>('/subscription-plans/')
  return Array.isArray(res) ? res : res.results
}

export async function getPlanCourses(planId: number): Promise<PlanCourse[]> {
  const res = await http.get<PaginatedResponse<PlanCourse> | PlanCourse[]>(`/subscription-plans/${planId}/courses/`)
  return Array.isArray(res) ? res : res.results
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ User Subscriptions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export async function subscribe(data: {
  plan_id: number
  payment_id?: number
  auto_renew?: boolean
}): Promise<UserSubscription> {
  return http.post<UserSubscription>('/subscriptions/subscribe/', data)
}

export async function getMySubscriptions(params?: {
  page?: number
  page_size?: number
  status?: 'active' | 'cancelled' | 'expired' | 'all'
  search?: string
  sort_by?: 'newest' | 'oldest' | 'end_date_desc' | 'end_date_asc'
}): Promise<PaginatedResponse<UserSubscription>> {
  const searchParams = new URLSearchParams()
  if (params?.page !== undefined) searchParams.set('page', String(params.page))
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size))
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by)
  const qs = searchParams.toString()
  return http.get<PaginatedResponse<UserSubscription>>(`/subscriptions/me/${qs ? `?${qs}` : ''}`)
}

export async function getMySubscriptionCourses(): Promise<PlanCourse[]> {
  const res = await http.get<PaginatedResponse<PlanCourse> | PlanCourse[]>('/subscriptions/me/courses/')
  return Array.isArray(res) ? res : res.results
}

export async function cancelSubscription(subscriptionId: number): Promise<{ message: string }> {
  return http.post<{ message: string }>(`/subscriptions/${subscriptionId}/cancel/`, {})
}

export async function checkCourseAccess(courseId: number): Promise<{ has_access: boolean }> {
  return http.get<{ has_access: boolean }>('/subscriptions/access/', { course_id: courseId })
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function getDurationLabel(type: string): string {
  switch (type) {
    case 'monthly': return 'Hàng tháng'
    case 'quarterly': return '3 tháng'
    case 'semi_annual': return '6 tháng'
    case 'annual': return 'Hàng năm'
    case 'lifetime': return 'Trọn đời'
    default: return type
  }
}

export function getSubscriptionStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Đang hoạt động'
    case 'expired': return 'Hết hạn'
    case 'cancelled': return 'Đã hủy'
    default: return status
  }
}

export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}
