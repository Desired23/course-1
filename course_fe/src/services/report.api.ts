import { http } from './http'

export type ReportTargetType =
  | 'review'
  | 'question'
  | 'answer'
  | 'blog_post'
  | 'blog_comment'
  | 'lesson_comment'
  | 'lesson'
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
export type CopyrightCaseStatus =
  | 'under_review'
  | 'needs_reporter_info'
  | 'awaiting_instructor_response'
  | 'instructor_responded'
  | 'awaiting_instructor_fix'
  | 'insufficient_info'
  | 'resolved_valid'
  | 'resolved_rejected'
  | 'takedown'
  | 'restored'
  | 'escalated_legal'
export type CopyrightSeverity = 'low' | 'medium' | 'high' | 'confirmed' | 'legal'
export type CopyrightAdminAction =
  | 'request_reporter_info'
  | 'request_instructor_response'
  | 'suspend_sale_hold'
  | 'hide_lesson_hold'
  | 'suspend_access_hold'
  | 'confirm_takedown'
  | 'reject_restore'
  | 'close_insufficient'
  | 'escalate_legal'
  | 'restore_release'

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
  copyright_case_id: number | null
  copyright_overdue: boolean
}

export interface IndividualReport {
  report_id: number
  reporter_name: string | null
  reporter_email: string | null
  reason: ReportReason
  reason_label: string
  description: string
  metadata?: Record<string, any>
  attachments?: Array<Record<string, any>>
  status: ReportStatus
  created_at: string
}

// Navigation hint for content that lives inside a course (e.g. lesson comments),
// letting admins jump straight to the reported item in the course player.
export interface ReportCaseContext {
  course_id: number | null
  lesson_id: number | null
  comment_id: number | null
}

export interface CopyrightCaseMessage {
  id: number
  actor: number | null
  actor_name: string | null
  actor_role: 'reporter' | 'instructor' | 'admin' | 'system'
  message: string
  response_type: string
  attachments: Array<Record<string, any>>
  metadata: Record<string, any>
  visibility: 'admin_only' | 'shared_with_reporter' | 'shared_with_instructor'
  created_at: string
}

export interface CopyrightCase {
  id: number
  target_type: 'course' | 'lesson'
  target_id: number
  target_label: string
  title: string
  course: number | null
  course_title: string | null
  lesson: number | null
  lesson_title: string | null
  instructor: number | null
  instructor_name: string | null
  created_by: number | null
  reporter_name: string | null
  reporter_email: string | null
  status: CopyrightCaseStatus
  severity: CopyrightSeverity
  content_action: string
  financial_action: string
  reporter_deadline_at: string | null
  instructor_deadline_at: string | null
  is_reporter_deadline_overdue: boolean
  is_instructor_deadline_overdue: boolean
  reporter_count: number
  held_amount: string
  active_hold_count: number
  manual_follow_up: boolean
  resolved_at: string | null
  created_at: string
  updated_at: string
  messages?: CopyrightCaseMessage[]
  reports?: IndividualReport[]
}

export interface ReportCaseDetail {
  target_type: ReportTargetType
  target_id: number
  title: string | null
  owner_name: string | null
  snippet: string | null
  reports: IndividualReport[]
  context?: ReportCaseContext
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
  metadata?: Record<string, any>
  attachments?: Array<Record<string, any>>
}): Promise<{ message: string; report_id: number; case_id?: number }> {
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

export async function getReporterCopyrightCase(caseId: number): Promise<CopyrightCase> {
  return http.get<CopyrightCase>(`/reports/my/${caseId}/`)
}

export async function submitReporterCopyrightEvidence(
  caseId: number,
  data: { message?: string; metadata?: Record<string, any>; attachments?: Array<Record<string, any>> },
): Promise<CopyrightCase> {
  return http.post<CopyrightCase>(`/reports/my/${caseId}/evidence/`, data)
}

export async function getInstructorCopyrightCases(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<CopyrightCase>> {
  return http.get<PaginatedResponse<CopyrightCase>>('/reports/instructor/cases/', params)
}

export async function getInstructorCopyrightCase(caseId: number): Promise<CopyrightCase> {
  return http.get<CopyrightCase>(`/reports/instructor/cases/${caseId}/`)
}

export async function submitInstructorCopyrightResponse(
  caseId: number,
  data: {
    response_type: 'dispute' | 'accept_and_fix' | 'request_clarification'
    message?: string
    metadata?: Record<string, any>
    attachments?: Array<Record<string, any>>
  },
): Promise<CopyrightCase> {
  return http.post<CopyrightCase>(`/reports/instructor/cases/${caseId}/responses/`, data)
}

export async function submitInstructorCopyrightFix(
  caseId: number,
  data: { message?: string },
): Promise<CopyrightCase> {
  return http.post<CopyrightCase>(`/reports/instructor/cases/${caseId}/submit-fix/`, data)
}

export async function getAdminCopyrightCases(params?: {
  status?: CopyrightCaseStatus
  severity?: CopyrightSeverity
  search?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<CopyrightCase>> {
  return http.get<PaginatedResponse<CopyrightCase>>('/reports/admin/copyright-cases/', params)
}

export async function getAdminCopyrightCase(caseId: number): Promise<CopyrightCase> {
  return http.get<CopyrightCase>(`/reports/admin/copyright-cases/${caseId}/`)
}

export async function runAdminCopyrightAction(
  caseId: number,
  data: {
    action: CopyrightAdminAction
    message?: string
    severity?: CopyrightSeverity
    deadline_days?: number
    share_reporter_evidence?: boolean
  },
): Promise<CopyrightCase> {
  return http.post<CopyrightCase>(`/reports/admin/copyright-cases/${caseId}/action/`, data)
}
