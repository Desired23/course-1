import { API_BASE_URL, http } from './http'

export interface IssuedCertificate {
  id: number
  verification_code: string
  certificate_url: string | null
  student_name: string
  course_title: string
  instructor_name: string | null
  completion_date: string | null
}

export async function issueCertificate(courseId: number): Promise<IssuedCertificate> {
  return http.post<IssuedCertificate>('/certificates/issue/', { course_id: courseId })
}

/** Public URL that streams the certificate PDF (generated on the fly). */
export function getCertificateDownloadUrl(verificationCode: string): string {
  return `${API_BASE_URL}/certificates/public/${verificationCode}/download/`
}
