import { http } from './http'

export type AdminReportType = 'forum_post' | 'review' | 'qa_question' | 'message'
export type AdminReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'
export type AdminReportPriority = 'low' | 'medium' | 'high' | 'critical'
export type AdminReportAction = 'approve' | 'dismiss' | 'lock' | 'delete' | 'hide' | 'close' | 'revoke'

export interface AdminReport {
  id: string
  reported_type: AdminReportType
  reported_id: number
  report_count: number
  reporter_name: string | null
  reporter_email: string | null
  reported_user_name: string | null
  reported_content_title: string | null
  reason: string | null
  description: string | null
  status: 'pending'
  priority: AdminReportPriority
  created_at: string | null
  updated_at: string | null
  resolution: string | null
  action_taken: string | null
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

export async function getAdminReports(params?: {
  type?: AdminReportType
  status?: string
  priority?: AdminReportPriority
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<AdminReport>> {
  return http.get<PaginatedResponse<AdminReport>>('/reports/admin/', params)
}

export async function resolveAdminReport(
  reportedType: AdminReportType,
  reportedId: number,
  data: {
    action: AdminReportAction
    reason?: string
    resolution_notes?: string
  }
): Promise<unknown> {
  return http.post(`/reports/admin/${reportedType}/${reportedId}/resolve/`, data)
}
