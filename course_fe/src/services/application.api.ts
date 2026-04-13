import { http } from './http'

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested'

export interface RegistrationFormQuestion {
  id: number
  form: number
  order: number
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'file' | 'url'
  placeholder?: string | null
  help_text?: string | null
  required: boolean
  options?: any
  validation_regex?: string | null
  file_config?: any
}

export interface RegistrationForm {
  id: number
  type: string
  title: string
  description: string | null
  is_active: boolean
  version: number
  questions: RegistrationFormQuestion[]
}

export interface ApplicationResponseItem {
  id: number
  value: any
  question_detail?: RegistrationFormQuestion
}

export interface Application {
  id: number
  user: number
  form: number
  status: ApplicationStatus
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: number | null
  admin_notes: string | null
  rejection_reason: string | null
  updated_at: string
  user_email?: string
  user_full_name?: string
  form_title?: string
  reviewed_by_name?: string | null
  responses: ApplicationResponseItem[]
}

export interface ApplicationListItem {
  id: number
  user: number
  form: number
  status: ApplicationStatus
  submitted_at: string
  reviewed_at: string | null
  user_email?: string
  user_full_name?: string
  form_title?: string
}

export interface SubmitApplicationData {
  form_id: number
  responses: Array<{
    question_id: number
    value: any
  }>
}

export async function getActiveRegistrationForm(type: 'instructor_application' | 'user_registration'): Promise<RegistrationForm | null> {
  return http.get<RegistrationForm | null>('/registration-forms/active/', { type })
}

export async function submitApplication(data: SubmitApplicationData): Promise<Application> {
  return http.post<Application>('/applications/submit/', data)
}

export async function getMyApplications(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<ApplicationListItem>> {
  return http.get<PaginatedResponse<ApplicationListItem>>('/applications/me/', params)
}

export async function getMyApplicationDetail(applicationId: number): Promise<Application> {
  return http.get<Application>('/applications/me/', { application_id: applicationId })
}

export async function resubmitApplication(applicationId: number, data: SubmitApplicationData): Promise<Application> {
  return http.put<Application>(`/applications/${applicationId}/resubmit/`, data)
}

export async function getAdminApplications(params?: {
  page?: number
  page_size?: number
  status?: ApplicationStatus | 'all'
  form_id?: number
  user_id?: number
}): Promise<PaginatedResponse<ApplicationListItem>> {
  const query = {
    page: params?.page,
    page_size: params?.page_size,
    status: params?.status && params.status !== 'all' ? params.status : undefined,
    form_id: params?.form_id,
    user_id: params?.user_id,
  }
  return http.get<PaginatedResponse<ApplicationListItem>>('/applications/admin/', query)
}

export async function getAdminApplicationDetail(applicationId: number): Promise<Application> {
  return http.get<Application>('/applications/admin/', { application_id: applicationId })
}

export async function reviewApplication(applicationId: number, data: {
  action: 'approve' | 'reject' | 'request_changes'
  admin_notes?: string
  rejection_reason?: string
}): Promise<Application> {
  return http.post<Application>(`/applications/${applicationId}/review/`, data)
}

export function getApplicationStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    pending: 'Đang chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
    changes_requested: 'Cần chỉnh sửa',
  }
  return labels[status] || status
}
