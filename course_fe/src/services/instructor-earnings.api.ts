/**
 * Instructor Earnings API Service
 *
 * BE endpoints:
 *   GET /api/instructor-earnings/?instructor_id=X&status=X&source=X  — paginated earnings list
 *   GET /api/instructor-earnings/summary/?instructor_id=X             — earnings summary
 *
 * Pagination response: { count, next, previous, page, total_pages, page_size, results }
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstructorEarning {
  id: number
  instructor: number
  course: number | null
  payment: number | null
  user_subscription: number | null
  amount: string            // Decimal from BE
  net_amount: string        // Decimal from BE
  status: 'pending' | 'available' | 'paid' | 'cancelled'
  earning_date: string
  instructor_payout: number | null
  instructor_name: string
  course_title: string | null
  payment_transaction_id: string | null
  plan_name: string | null
  earning_source: 'retail' | 'subscription'
  created_at: string
}

export interface StatusBreakdown {
  count: number
  net_amount: string
}

export interface EarningSourceSummary {
  count: number
  total_amount: string
  total_net_amount: string
  by_status: Record<string, StatusBreakdown>
}

export interface EarningsSummary {
  instructor_id: number
  instructor_name: string
  total: {
    count: number
    total_amount: string
    total_net_amount: string
  }
  retail: EarningSourceSummary
  subscription: EarningSourceSummary
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

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface EarningsListParams {
  instructor_id?: number
  status?: string
  source?: string
  page?: number
  page_size?: number
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Get paginated list of instructor earnings.
 * GET /api/instructor-earnings/?instructor_id=X&status=X&source=X
 */
export async function getInstructorEarnings(
  params?: EarningsListParams
): Promise<PaginatedResponse<InstructorEarning>> {
  const query: Record<string, string | number> = {}
  if (params?.instructor_id) query.instructor_id = params.instructor_id
  if (params?.status) query.status = params.status
  if (params?.source) query.source = params.source
  if (params?.page) query.page = params.page
  if (params?.page_size) query.page_size = params.page_size
  return http.get<PaginatedResponse<InstructorEarning>>('/instructor-earnings/', query)
}

/**
 * Get all earnings (no pagination limit).
 */
export async function getAllInstructorEarnings(
  params?: Omit<EarningsListParams, 'page' | 'page_size'>
): Promise<InstructorEarning[]> {
  const res = await getInstructorEarnings({ ...params, page: 1, page_size: 1000 })
  return res.results
}

/**
 * Get instructor earnings summary (breakdown by retail/subscription and status).
 * GET /api/instructor-earnings/summary/?instructor_id=X
 */
export async function getInstructorEarningsSummary(
  instructorId?: number
): Promise<EarningsSummary> {
  const query: Record<string, number> = {}
  if (instructorId) query.instructor_id = instructorId
  return http.get<EarningsSummary>('/instructor-earnings/summary/', query)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse decimal string to number */
export function parseEarningAmount(val: string | null | undefined): number {
  if (!val) return 0
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

/** Format amount to VND currency */
export function formatEarningVND(amount: number): string {
  if (amount === 0) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Get status color class */
export function getEarningStatusColor(status: string): string {
  switch (status) {
    case 'available': return 'text-green-600'
    case 'paid': return 'text-blue-600'
    case 'pending': return 'text-yellow-600'
    case 'cancelled': return 'text-red-600'
    default: return 'text-muted-foreground'
  }
}

/** Get status badge variant */
export function getEarningStatusBadge(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'available': return 'default'
    case 'paid': return 'default'
    case 'pending': return 'secondary'
    case 'cancelled': return 'destructive'
    default: return 'outline'
  }
}
