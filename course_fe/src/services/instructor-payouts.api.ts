/**
 * Instructor Payouts API Service
 * Payout request & management
 *
 * Endpoints:
 *   GET    /api/instructor-payouts/                    — List payouts (?status=, ?period=, ?instructor_id=, ?payout_id=)
 *   POST   /api/instructor/payouts/request/            — Request payout
 *   PATCH  /api/instructor-payouts/                    — Admin update payout
 *   DELETE /api/instructor-payouts/delete/:id/         — Delete payout
 *   PUT    /api/admin/payouts/:id/approve/             — Admin approve
 *   PUT    /api/admin/payouts/:id/reject/              — Admin reject
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'processed' | 'cancelled' | 'failed'

export interface InstructorPayout {
  id: number
  instructor: number
  amount: string // decimal
  fee: string
  net_amount: string | null
  payment_method: string
  transaction_id: string | null
  status: PayoutStatus
  request_date: string
  created_at: string
  updated_at: string
  processed_date: string | null
  notes: string | null
  period: string
  processed_by: number | null
}

export interface PayoutRequestData {
  amount: number
  payout_method_id: number
  notes?: string
  period: string // e.g. "2025-07"
}

export interface PaginatedPayoutResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

// ─── API Functions ────────────────────────────────────────────

/** List payouts */
export async function getInstructorPayouts(params?: {
  status?: PayoutStatus
  period?: string
  instructor_id?: number
  payout_id?: number
}): Promise<InstructorPayout[]> {
  const query: Record<string, string | number> = {}
  if (params?.status) query.status = params.status
  if (params?.period) query.period = params.period
  if (params?.instructor_id) query.instructor_id = params.instructor_id
  if (params?.payout_id) query.payout_id = params.payout_id

  const all: InstructorPayout[] = []
  let page = 1
  while (true) {
    const res: any = await http.get<any>('/instructor-payouts/', {
      ...query,
      page,
      page_size: 100,
    })

    if (Array.isArray(res)) return res

    if (res && typeof res === 'object' && Array.isArray(res.results)) {
      all.push(...(res.results as InstructorPayout[]))
      if (!res.next) break
      page++
      continue
    }

    console.warn('getInstructorPayouts returned unexpected data', res)
    break
  }

  return all
}

/** List payouts with server pagination */
export async function getInstructorPayoutsPage(params?: {
  status?: PayoutStatus
  period?: string
  instructor_id?: number
  payout_id?: number
  page?: number
  page_size?: number
}): Promise<PaginatedPayoutResponse<InstructorPayout>> {
  const query: Record<string, string | number> = {}
  if (params?.status) query.status = params.status
  if (params?.period) query.period = params.period
  if (params?.instructor_id) query.instructor_id = params.instructor_id
  if (params?.payout_id) query.payout_id = params.payout_id
  if (params?.page) query.page = params.page
  if (params?.page_size) query.page_size = params.page_size

  const res: any = await http.get<any>('/instructor-payouts/', query)
  if (Array.isArray(res)) {
    const page = params?.page ?? 1
    const pageSize = params?.page_size ?? res.length
    return {
      count: res.length,
      next: null,
      previous: null,
      page,
      total_pages: 1,
      page_size: pageSize,
      results: res as InstructorPayout[],
    }
  }
  return res as PaginatedPayoutResponse<InstructorPayout>
}

/** Get my payouts (for current instructor) */
export async function getMyPayouts(instructorId: number): Promise<InstructorPayout[]> {
  return getInstructorPayouts({ instructor_id: instructorId })
}

/** Request a new payout */
export async function requestPayout(data: PayoutRequestData): Promise<InstructorPayout> {
  return http.post<InstructorPayout>('/instructor/payouts/request/', data)
}

/** Delete payout */
export async function deletePayout(payoutId: number): Promise<void> {
  return http.delete(`/instructor-payouts/delete/${payoutId}/`)
}

// ─── Helpers ──────────────────────────────────────────────────

export function parseDecimal(value: string | null | undefined): number {
  if (!value) return 0
  return parseFloat(value) || 0
}

export function formatPayoutAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseDecimal(amount) : amount
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

export function getPayoutStatusLabel(status: PayoutStatus): string {
  const labels: Record<PayoutStatus, string> = {
    pending: 'Chờ xử lý',
    processed: 'Đã xử lý',
    cancelled: 'Đã hủy',
    failed: 'Thất bại',
  }
  return labels[status] || status
}

export function getPayoutStatusColor(status: PayoutStatus): string {
  const colors: Record<PayoutStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
  }
  return colors[status] || ''
}
