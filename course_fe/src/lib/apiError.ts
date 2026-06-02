import type { ApiError } from '../services/http'

const NETWORK_ERROR_MSG = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.'
const SERVER_ERROR_MSG = 'Lỗi hệ thống. Vui lòng thử lại sau.'
const UNKNOWN_ERROR_MSG = 'Đã xảy ra lỗi. Vui lòng thử lại.'

/**
 * Extract a human-readable error message from an ApiError or unknown thrown value.
 * - status 0      → network error message
 * - status >= 500 → server error message
 * - otherwise     → error.message from backend, or fallback
 */
export function getErrorMessage(err: unknown, fallback?: string): string {
  if (isApiError(err)) {
    if (err.status === 0) return NETWORK_ERROR_MSG
    if (err.status >= 500) return SERVER_ERROR_MSG
    return err.message || fallback || UNKNOWN_ERROR_MSG
  }
  if (err instanceof Error) return err.message || fallback || UNKNOWN_ERROR_MSG
  return fallback || UNKNOWN_ERROR_MSG
}

/**
 * Extract field-level errors from an ApiError for use in form validation.
 * Returns a flat Record<string, string> mapping field name → first error message.
 */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (!isApiError(err) || !err.errors) return {}
  return Object.fromEntries(
    Object.entries(err.errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : String(messages),
    ])
  )
}

function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as ApiError).status === 'number'
  )
}
