/**
 * Applications API Service
 * Instructor onboarding applications
 *
 * Endpoints:
 *   POST   /api/applications/submit/                   — Submit application
 *   GET    /api/applications/me/                       — Get current user's application
 *   PUT    /api/applications/:id/resubmit/             — Resubmit after changes_requested
 *   GET    /api/applications/admin/                    — Admin list
 *   PATCH  /api/applications/:id/review/               — Admin review
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────

export interface ApplicationResponse {
  question: number
  value: string
}

export interface Application {
  id: number
  user: number
  form: number
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: number | null
  admin_notes: string | null
  rejection_reason: string | null
  updated_at: string
  user_email: string
  user_full_name: string
  form_title: string
  reviewed_by_name: string | null
  responses: Array<{
    id: number
    value: string
    question_detail?: {
      id: number
      question_text: string
      question_type: string
    }
  }>
}

export interface SubmitApplicationData {
  form_id: number
  responses: ApplicationResponse[]
}

// ─── API Functions ────────────────────────────────────────────

/** Submit an instructor application */
export async function submitApplication(data: SubmitApplicationData): Promise<Application> {
  return http.post<Application>('/applications/submit/', data)
}

/** Get current user's application status */
export async function getMyApplication(): Promise<Application> {
  return http.get<Application>('/applications/me/')
}

/** Resubmit after changes requested */
export async function resubmitApplication(
  applicationId: number,
  data: SubmitApplicationData
): Promise<Application> {
  return http.put<Application>(`/applications/${applicationId}/resubmit/`, data)
}

// ─── Helpers ──────────────────────────────────────────────────

export function getApplicationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Đang chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
    changes_requested: 'Cần chỉnh sửa',
  }
  return labels[status] || status
}

export function getApplicationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
    changes_requested: 'text-orange-600',
  }
  return colors[status] || ''
}
