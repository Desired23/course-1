import { API_BASE_URL, getAccessToken, getApiTransportHeaders, http } from './http'

export interface IssuedCertificate {
  id: number
  verification_code: string
  certificate_url: string | null
  student_name: string
  course_title: string
  instructor_name: string | null
  completion_date: string | null
}

export interface MyCertificate {
  id: number
  verification_code: string
  certificate_url: string | null
  student_name: string
  course_title: string
  issued_at: string | null
  revoked: boolean
}

export interface PaginatedCertificates {
  count: number
  page: number
  total_pages: number
  page_size: number
  results: MyCertificate[]
}

export async function issueCertificate(courseId: number): Promise<IssuedCertificate> {
  return http.post<IssuedCertificate>('/certificates/issue/', { course_id: courseId })
}

export async function getMyCertificates(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedCertificates> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.page_size) query.set('page_size', String(params.page_size))
  const qs = query.toString()
  return http.get<PaginatedCertificates>(`/certificates/me/${qs ? `?${qs}` : ''}`)
}

/**
 * Reconcile then list: issues any earned-but-missing certificates (idempotent)
 * and returns the up-to-date page. One request, so no extra network round-trips.
 */
export async function syncMyCertificates(params?: {
  page?: number
  page_size?: number
}): Promise<PaginatedCertificates> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.page_size) query.set('page_size', String(params.page_size))
  const qs = query.toString()
  return http.post<PaginatedCertificates>(`/certificates/sync/${qs ? `?${qs}` : ''}`)
}

/** Link to the (login-required) My Certificates page — no public PDF link (SOL-017). */
export function getCertificateDownloadUrl(_verificationCode?: string): string {
  return '/user/my-certificates'
}

/** Download the certificate PDF via the authenticated owner/admin endpoint. */
export async function downloadMyCertificate(certificateId: number, fileName: string): Promise<void> {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE_URL}/certificates/${certificateId}/download/`, {
    headers: {
      ...getApiTransportHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    throw new Error('Không thể tải chứng chỉ.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Admin-only course certificate preview. Does not issue or persist a certificate. */
export async function getAdminCourseCertificatePreviewBlob(courseId: number): Promise<Blob> {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE_URL}/certificates/admin/courses/${courseId}/preview/`, {
    headers: {
      ...getApiTransportHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    throw new Error('Could not preview certificate.')
  }
  return res.blob()
}
