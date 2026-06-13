import { http } from './http'

export type ReportTargetType =
  | 'review'
  | 'question'
  | 'answer'
  | 'blog_post'
  | 'blog_comment'
  | 'lesson_comment'
  | 'course'
  | 'message'

export type ReportReason =
  | 'spam'
  | 'offensive'
  | 'harassment'
  | 'copyright'
  | 'misinformation'
  | 'other'

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  offensive: 'Nội dung phản cảm',
  harassment: 'Quấy rối / bắt nạt',
  copyright: 'Vi phạm bản quyền',
  misinformation: 'Thông tin sai lệch',
  other: 'Khác',
}

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical'
export type ReportAction = 'approve' | 'dismiss' | 'hide' | 'delete' | 'close' | 'revoke'

export interface ReportCase {
  id: string
  target_type: ReportTargetType
  target_id: number
  report_count: number
  priority: ReportPriority
  status: ReportStatus
  title: string | null
  owner_name: string | null
  snippet: string | null
  top_reason: ReportReason | null
  reason_breakdown: Partial<Record<ReportReason, number>>
  last_reported_at: string | null
}

export interface IndividualReport {
  report_id: number
  reporter_name: string | null
  reporter_email: string | null
  reason: ReportReason
  reason_label: string
  description: string
  status: ReportStatus
  created_at: string
}

export interface ReportCaseDetail {
  target_type: ReportTargetType
  target_id: number
  title: string | null
  owner_name: string | null
  snippet: string | null
  reports: IndividualReport[]
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

// User: submit a report
export async function createReport(data: {
  target_type: ReportTargetType
  target_id: number
  reason: ReportReason
  description?: string
}): Promise<{ message: string; report_id: number }> {
  return http.post('/reports/', data)
}

// Admin: list of cases (aggregated)
export async function getAdminReports(params?: {
  type?: ReportTargetType
  status?: ReportStatus | 'open'
  priority?: ReportPriority
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<ReportCase>> {
  return http.get<PaginatedResponse<ReportCase>>('/reports/admin/', params)
}

// Admin: individual reports for one content item
export async function getReportCaseDetail(
  targetType: ReportTargetType,
  targetId: number,
): Promise<ReportCaseDetail> {
  return http.get<ReportCaseDetail>(`/reports/admin/${targetType}/${targetId}/`)
}

// Admin: resolve a case
export async function resolveAdminReport(
  targetType: ReportTargetType,
  targetId: number,
  data: { action: ReportAction; resolution_notes?: string },
): Promise<{ message: string }> {
  return http.post(`/reports/admin/${targetType}/${targetId}/resolve/`, data)
}

// Admin: reopen a resolved/dismissed case
export async function reopenAdminReport(
  targetType: ReportTargetType,
  targetId: number,
): Promise<{ message: string }> {
  return http.post(`/reports/admin/${targetType}/${targetId}/reopen/`, {})
}
