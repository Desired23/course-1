









export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export function getApiTransportHeaders(): Record<string, string> {
  if (API_BASE_URL.includes('.ngrok-free.dev')) {

    return { 'ngrok-skip-browser-warning': 'true' }
  }
  return {}
}


const getCache: Map<string, { expiry: number; data: any }> = new Map()
const CACHE_TTL = 30 * 1000



export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string[] | string>
  data?: unknown
  raw?: unknown
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstString(item)
      if (message) return message
    }
    return undefined
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const message = firstString(item)
      if (message) return message
    }
  }
  return undefined
}

function getBackendErrorMessage(error: any, fallback: string): string {
  const raw = (() => {
    try {
      return JSON.stringify(error)
    } catch {
      return undefined
    }
  })()
  return (
    firstString(error?.message) ||
    firstString(error?.error) ||
    firstString(error?.detail) ||
    firstString(error?.errors?.error) ||
    firstString(error?.errors) ||
    raw ||
    fallback
  )
}

async function readErrorBody(response: Response): Promise<any> {
  const body = await response.text().catch(() => '')
  if (!body) return { message: response.statusText, raw: null }
  try {
    return JSON.parse(body)
  } catch {
    return { message: body, raw: body }
  }
}


const SESSION_EXPIRED_MESSAGE = 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.'



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

export function clearHttpRuntimeState(): void {
  getCache.clear()
  refreshQueue = []
  isRefreshing = false
  http.clearInFlightGets()
}



type SessionExpiredHandler = () => void
let _onSessionExpired: SessionExpiredHandler | null = null





export function onSessionExpired(handler: SessionExpiredHandler): () => void {
  _onSessionExpired = handler
  return () => { _onSessionExpired = null }
}


type RoleMismatchHandler = () => void
let _onRoleMismatch: RoleMismatchHandler | null = null


export function onRoleMismatch(handler: RoleMismatchHandler): () => void {
  _onRoleMismatch = handler
  return () => { _onRoleMismatch = null }
}



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

export async function refreshAccessToken(): Promise<string> {
  const refreshTkn = getRefreshToken()
  if (!refreshTkn) {
    clearTokens()
    _onSessionExpired?.()
    throw { message: 'No refresh token available', status: 401 } as ApiError
  }
  try {
    const response = await fetch(`${API_BASE_URL}/users/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getApiTransportHeaders(),
      },
      body: JSON.stringify({ refresh_token: refreshTkn }),
    })

    if (!response.ok) {
      throw new Error('REFRESH_FAILED')
    }

    const data = await response.json()
    const newAccessToken = data.access_token
    if (data.refresh_token) {
      localStorage.setItem(TOKEN_KEYS.refresh, data.refresh_token)
    }

    localStorage.setItem(TOKEN_KEYS.access, newAccessToken)
    return newAccessToken
  } catch {
    clearTokens()
    _onSessionExpired?.()
    throw { message: 'Session expired. Please login again.', status: 401 } as ApiError
  }
}



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
      ...getApiTransportHeaders(),
      ...(token && { Authorization: `Bearer ${token}` }),
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }
    const method = (config.method || 'GET').toUpperCase()
    const isGetRequest = method === 'GET'

    try {

    if (isGetRequest) {
      const entry = getCache.get(url)
      if (entry && entry.expiry > Date.now()) {
        return entry.data as T
      }
    }
    const response = await fetch(url, config)


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


      if (response.status === 403) {
        const peek = await response.clone().json().catch(() => null)
        if (peek?.message === SESSION_EXPIRED_MESSAGE) {
          if (retry) {
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
        } else {
          _onRoleMismatch?.()
        }
      }


      if (!response.ok) {
        const error = await readErrorBody(response)

        throw {
          message: getBackendErrorMessage(error, 'An error occurred'),
          status: response.status,
          errors: error.errors,
          data: error,
          raw: error,
        } as ApiError
      }


      if (response.status === 204) {
        return undefined as T
      }

      const result = await response.json()

      if (!isGetRequest) {
        getCache.clear()
      }

      if (isGetRequest && response.ok) {
        getCache.set(url, { expiry: Date.now() + CACHE_TTL, data: result })
      }
      return result
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




  private inFlightGets: Map<string, Promise<any>> = new Map()

  clearInFlightGets(): void {
    this.inFlightGets.clear()
  }

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
    const url = endpoint + queryString
    if (this.inFlightGets.has(url)) {
      return this.inFlightGets.get(url) as Promise<T>
    }
    const promise = this.request<T>(url, { method: 'GET' })
      .finally(() => {
        this.inFlightGets.delete(url)
      })
    this.inFlightGets.set(url, promise)
    return promise
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

  async upload<T>(endpoint: string, formData: FormData, retry = true): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const token = getAccessToken()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...getApiTransportHeaders(),
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      })

      if (response.status === 401 && retry) {
        const newToken = await this.handleTokenRefresh()
        if (newToken) {
          return this.upload<T>(endpoint, formData, false)
        }
      }

      if (response.status === 403) {
        const peek = await response.clone().json().catch(() => null)
        if (peek?.message === SESSION_EXPIRED_MESSAGE) {
          if (retry) {
            const newToken = await this.handleTokenRefresh()
            if (newToken) {
              return this.upload<T>(endpoint, formData, false)
            }
          }
        } else {
          _onRoleMismatch?.()
        }
      }

      if (!response.ok) {
        const error = await readErrorBody(response)
        throw {
          message: getBackendErrorMessage(error, 'Upload failed'),
          status: response.status,
          errors: error.errors,
          data: error,
          raw: error,
        } as ApiError
      }

      return response.json().catch(() => undefined as T)
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
}



export const http = new HttpService(API_BASE_URL)
export { HttpService }
