/**
 * HTTP Service - Centralized API client
 * 
 * Features:
 * - Auto-attach Bearer token from auth store
 * - Auto-refresh expired access tokens using refresh token
 * - Request queue during token refresh (prevents race conditions)
 * - Typed error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// ─── Types ────────────────────────────────────────────────────

export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string[]>
}

// ─── Token helpers (interact with localStorage directly) ──────

const TOKEN_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.access)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.refresh)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEYS.access, access)
  localStorage.setItem(TOKEN_KEYS.refresh, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEYS.access)
  localStorage.removeItem(TOKEN_KEYS.refresh)
}

// ─── Token refresh logic ──────────────────────────────────────

let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

function processQueue(error: any, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token!)
    }
  })
  refreshQueue = []
}

async function refreshAccessToken(): Promise<string> {
  const refreshTkn = getRefreshToken()
  if (!refreshTkn) {
    throw { message: 'No refresh token available', status: 401 } as ApiError
  }

  const response = await fetch(`${API_BASE_URL}/users/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshTkn }),
  })

  if (!response.ok) {
    clearTokens()
    throw { message: 'Session expired. Please login again.', status: 401 } as ApiError
  }

  const data = await response.json()
  const newAccessToken = data.access_token

  localStorage.setItem(TOKEN_KEYS.access, newAccessToken)
  return newAccessToken
}

// ─── HTTP Service class ───────────────────────────────────────

class HttpService {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const token = getAccessToken()

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      // Handle 401 → try refresh
      if (response.status === 401 && retry) {
        const newToken = await this.handleTokenRefresh()
        if (newToken) {
          return this.request<T>(
            endpoint,
            {
              ...options,
              headers: {
                ...defaultHeaders,
                Authorization: `Bearer ${newToken}`,
                ...options.headers,
              },
            },
            false
          )
        }
      }

      // Handle other errors
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }))

        throw {
          message: error.message || error.errors?.error || 'An error occurred',
          status: response.status,
          errors: error.errors,
        } as ApiError
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      return await response.json()
    } catch (error) {
      if ((error as ApiError).status !== undefined) {
        throw error
      }
      throw {
        message: error instanceof Error ? error.message : 'Network error',
        status: 0,
      } as ApiError
    }
  }

  private async handleTokenRefresh(): Promise<string | null> {
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      })
    }

    isRefreshing = true
    try {
      const newToken = await refreshAccessToken()
      processQueue(null, newToken)
      return newToken
    } catch (error) {
      processQueue(error, null)
      return null
    } finally {
      isRefreshing = false
    }
  }

  // ─── Public methods ──────────────────────────────────────

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let queryString = ''
    if (params) {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
      if (Object.keys(filtered).length > 0) {
        queryString = '?' + new URLSearchParams(filtered as Record<string, string>).toString()
      }
    }
    return this.request<T>(endpoint + queryString, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const token = getAccessToken()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw {
        message: error.message || 'Upload failed',
        status: response.status,
        errors: error.errors,
      } as ApiError
    }

    return response.json()
  }
}

// ─── Singleton export ─────────────────────────────────────────

export const http = new HttpService(API_BASE_URL)
export { HttpService }
