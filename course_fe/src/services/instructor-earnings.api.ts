



import { http } from './http'
import { buildListQuery, type PaginatedResponse } from './common/pagination'

export interface InstructorEarning {
  id: number
  instructor: number
  course: number | null
  payment: number | null
  user_subscription: number | null
  amount: string
  net_amount: string
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

export interface EarningsListParams {
  instructor_id?: number
  status?: string
  source?: string
  search?: string
  sort_by?: 'newest' | 'oldest' | 'earnings_desc' | 'earnings_asc' | 'course_asc' | 'course_desc'
  page?: number
  page_size?: number
}

export interface SubscriptionRevenueBreakdownParams {
  instructor_id?: number
  search?: string
  sort_by?: 'earnings_desc' | 'earnings_asc' | 'course_asc' | 'course_desc' | 'share_desc' | 'share_asc'
  page?: number
  page_size?: number
}

export interface SubscriptionRevenueBreakdownRow {
  course_id: number
  course_title: string
  earnings: string
  records_count: number
  total_minutes: number
  share_pct: string
}

export async function getInstructorEarnings(
  params?: EarningsListParams
): Promise<PaginatedResponse<InstructorEarning>> {
  const query = buildListQuery({
    instructor_id: params?.instructor_id,
    status: params?.status,
    source: params?.source,
    search: params?.search,
    sort_by: params?.sort_by,
    page: params?.page,
    page_size: params?.page_size,
  })
  return http.get<PaginatedResponse<InstructorEarning>>('/instructor-earnings/', query)
}

export async function getAllInstructorEarnings(
  params?: Omit<EarningsListParams, 'page' | 'page_size'>
): Promise<InstructorEarning[]> {
  const all: InstructorEarning[] = []
  let page = 1

  while (true) {
    const res = await getInstructorEarnings({ ...params, page, page_size: 100 })
    all.push(...res.results)
    if (!res.next) break
    page++
  }

  return all
}

export async function getInstructorEarningsSummary(
  instructorId?: number
): Promise<EarningsSummary> {
  const query: Record<string, number> = {}
  if (instructorId) query.instructor_id = instructorId
  return http.get<EarningsSummary>('/instructor-earnings/summary/', query)
}

export async function getInstructorSubscriptionRevenueBreakdown(
  params?: SubscriptionRevenueBreakdownParams
): Promise<PaginatedResponse<SubscriptionRevenueBreakdownRow>> {
  const query = buildListQuery({
    instructor_id: params?.instructor_id,
    search: params?.search,
    sort_by: params?.sort_by,
    page: params?.page,
    page_size: params?.page_size,
  })
  return http.get<PaginatedResponse<SubscriptionRevenueBreakdownRow>>('/instructor-earnings/subscription-breakdown/', query)
}

export function parseEarningAmount(val: string | null | undefined): number {
  if (!val) return 0
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

export function formatEarningVND(amount: number): string {
  if (amount === 0) return '0 ?'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getEarningStatusColor(status: string): string {
  switch (status) {
    case 'available': return 'text-green-600'
    case 'paid': return 'text-blue-600'
    case 'pending': return 'text-yellow-600'
    case 'cancelled': return 'text-red-600'
    default: return 'text-muted-foreground'
  }
}

export function getEarningStatusBadge(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'available': return 'default'
    case 'paid': return 'default'
    case 'pending': return 'secondary'
    case 'cancelled': return 'destructive'
    default: return 'outline'
  }
}
