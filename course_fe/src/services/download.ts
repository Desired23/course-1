import { API_BASE_URL, getApiTransportHeaders, getAccessToken } from './http'

function exportTimestamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export function filenameFromContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) return decodeURIComponent(encodedMatch[1].replace(/"/g, ''))
  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1] || null
}

export function timestampedFilename(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0) return `${filename}_${exportTimestamp()}`
  return `${filename.slice(0, lastDot)}_${exportTimestamp()}${filename.slice(lastDot)}`
}

export async function downloadBlob(
  endpoint: string,
  fallbackFilename: string,
  options: { timestampFallback?: boolean; errorMessage?: string } = {},
): Promise<void> {
  const token = getAccessToken()
  const response = await fetch(endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`, {
    headers: {
      ...getApiTransportHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    let message = options.errorMessage || 'Download failed'
    try {
      const error = await response.json()
      message = error.error || error.message || message
    } catch {

    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  const timestampFallback = options.timestampFallback ?? true
  link.href = url
  link.download =
    filenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
    (timestampFallback ? timestampedFilename(fallbackFilename) : fallbackFilename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
