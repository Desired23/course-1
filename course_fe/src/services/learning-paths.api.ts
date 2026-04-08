import { API_BASE_URL, getAccessToken, http } from './http'
import type { PaginatedResponse } from './common/pagination'

export interface AdvisorMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AdvisorMeta {
  provider_used?: string
  model?: string
  attempt_count?: number
  max_attempts?: number
  fallback_triggered?: boolean
  fallback_reason?: string
  fallback_provider?: string
  conversation_state?: {
    mode?: 'clarify' | 'course_search' | 'path' | 'out_of_scope'
    missing_slots?: string[]
  }
  suggested_actions?: string[]
}

export interface LearningPathItem {
  id?: number
  course_id: number
  course_title?: string
  course_level?: string
  duration_hours?: number | null
   course_price?: string | null
   course_discount_price?: string | null
   course_discount_start_date?: string | null
   course_discount_end_date?: string | null
  skills_taught?: string[]
  order: number
  reason: string
  is_skippable: boolean
  skippable_reason?: string | null
}

export interface LearningPathSummary {
  id: number
  goal_text: string
  summary: string
  estimated_weeks: number
  is_archived?: boolean
  created_at: string
  updated_at: string
  conversation_count: number
  advisor_meta?: AdvisorMeta
  items: LearningPathItem[]
}

export interface LearningPathAdvisorStats {
  total_paths: number
  gemini_paths: number
  rule_based_paths: number
  fallback_paths: number
  fallback_rate: number
  average_attempt_count: number
  recent_paths: Array<{
    id: number
    user_id: number
    user_name: string
    goal_text: string
    summary: string
    estimated_weeks: number
    is_archived?: boolean
    course_count: number
    updated_at: string
    advisor_meta?: AdvisorMeta
  }>
}

export interface LearningPathAdvisorStatsQuery {
  provider?: 'gemini' | 'rule_based'
  fallback_only?: boolean
  limit?: number
}

export interface LearningPathAdminActionResponse {
  ok: boolean
  action: 'delete' | 'archive' | 'restore'
  path_id?: number
  deleted_count?: number
  deleted_ids?: number[]
  affected_count?: number
  affected_ids?: number[]
}

export interface LearningPathDetail {
  id: number
  goal_text: string
  summary: string
  estimated_weeks: number
  is_archived?: boolean
  created_at: string
  updated_at: string
  items: LearningPathItem[]
  messages: AdvisorMessage[]
  advisor_meta?: AdvisorMeta
}

export interface AdvisorChatRequest {
  goal_text: string
  weekly_hours?: number
  messages?: AdvisorMessage[]
  known_skills?: string[]
  path_id?: number
  persist_conversation?: boolean
}

export type AdvisorChatResponse =
  | { type: 'question'; message: string; advisor_meta?: AdvisorMeta; path_id?: number }
  | { type: 'path'; path: LearningPathItem[]; estimated_weeks: number; summary: string; advisor_meta?: AdvisorMeta; path_id?: number }

export interface CreateLearningPathRequest {
  goal_text: string
  summary: string
  estimated_weeks: number
  path: LearningPathItem[]
  messages: AdvisorMessage[]
  advisor_meta?: AdvisorMeta
}

export interface AdvisorStreamCallbacks {
  onDelta?: (delta: string) => void
  onFinal?: (result: AdvisorChatResponse) => void
}

interface AdvisorSsePayload {
  version?: 'v2'
  event?: string
  data?: AdvisorSsePayload
  delta?: string
  attempt?: number
  result?: AdvisorChatResponse
  message?: string
}

function unwrapAdvisorSsePayload(payload: AdvisorSsePayload): AdvisorSsePayload {
  if (payload?.version === 'v2' && payload.data && typeof payload.data === 'object') {
    return payload.data
  }
  return payload
}

export async function chatWithLearningAdvisor(payload: AdvisorChatRequest): Promise<AdvisorChatResponse> {
  return http.post<AdvisorChatResponse>('/learning-paths/advisor/chat', payload)
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const trimmed = block.trim()
  if (!trimmed) return null

  const lines = trimmed.split('\n')
  let event = 'message'
  const dataLines: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  return { event, data: dataLines.join('\n') }
}

export async function chatWithLearningAdvisorStream(
  payload: AdvisorChatRequest,
  callbacks?: AdvisorStreamCallbacks
): Promise<AdvisorChatResponse> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/learning-paths/advisor/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Advisor stream failed with status ${response.status}`)
  }
  if (!response.body) {
    throw new Error('Advisor stream body is empty.')
  }

  const decoder = new TextDecoder('utf-8')
  const reader = response.body.getReader()
  let buffer = ''
  let streamedText = ''
  let finalResult: AdvisorChatResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, '\n')

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      const parsed = parseSseBlock(block)
      if (parsed) {
        const rawData: AdvisorSsePayload = parsed.data ? JSON.parse(parsed.data) : {}
        const data = unwrapAdvisorSsePayload(rawData)
        if (parsed.event === 'delta' && data.delta) {
          streamedText += data.delta
          callbacks?.onDelta?.(data.delta)
        } else if (parsed.event === 'final' && data.result) {
          finalResult = data.result
          callbacks?.onFinal?.(data.result)
        } else if (parsed.event === 'error') {
          throw new Error(data.message || 'Advisor stream failed.')
        }
      }

      boundary = buffer.indexOf('\n\n')
    }
  }

  const trailingBlock = buffer.trim()
  if (!finalResult && trailingBlock) {
    const parsed = parseSseBlock(trailingBlock)
    if (parsed) {
      const rawData: AdvisorSsePayload = parsed.data ? JSON.parse(parsed.data) : {}
      const data = unwrapAdvisorSsePayload(rawData)
      if (parsed.event === 'final' && data.result) {
        finalResult = data.result
        callbacks?.onFinal?.(data.result)
      } else if (parsed.event === 'error') {
        throw new Error(data.message || 'Advisor stream failed.')
      }
    }
  }

  if (!finalResult) {
    const fallbackMessage = streamedText.trim()
    if (fallbackMessage) {
      return {
        type: 'question',
        message: fallbackMessage,
        advisor_meta: {
          provider_used: 'stream_partial',
          fallback_triggered: true,
          fallback_reason: 'stream_missing_final',
        },
      }
    }
    throw new Error('Advisor stream ended without final result.')
  }

  return finalResult
}

export async function createLearningPath(payload: CreateLearningPathRequest): Promise<LearningPathDetail> {
  return http.post<LearningPathDetail>('/learning-paths/', payload)
}

export async function getLearningPaths(page = 1, pageSize = 20): Promise<PaginatedResponse<LearningPathSummary>> {
  return http.get<PaginatedResponse<LearningPathSummary>>('/learning-paths/', {
    page,
    page_size: pageSize,
  })
}

export async function getLearningPathDetail(pathId: number): Promise<LearningPathDetail> {
  return http.get<LearningPathDetail>(`/learning-paths/${pathId}`)
}

export async function deleteLearningPath(pathId: number): Promise<void> {
  return http.delete<void>(`/learning-paths/${pathId}`)
}

export async function getAdminLearningPathDetail(pathId: number): Promise<LearningPathDetail> {
  return http.get<LearningPathDetail>(`/learning-paths/admin/${pathId}`)
}

export async function adminActionLearningPath(pathId: number, action: 'delete' | 'archive' | 'restore'): Promise<LearningPathAdminActionResponse> {
  return http.post<LearningPathAdminActionResponse>(`/learning-paths/admin/${pathId}/action`, { action })
}

export async function adminBulkActionLearningPaths(action: 'delete' | 'archive' | 'restore', pathIds: number[]): Promise<LearningPathAdminActionResponse> {
  return http.post<LearningPathAdminActionResponse>('/learning-paths/admin/bulk-action', {
    action,
    path_ids: pathIds,
  })
}

export async function recalculateLearningPath(pathId: number, payload: AdvisorChatRequest): Promise<LearningPathDetail | AdvisorChatResponse> {
  return http.post<LearningPathDetail | AdvisorChatResponse>(`/learning-paths/${pathId}/recalculate`, payload)
}

export async function getLearningPathAdvisorStats(query?: LearningPathAdvisorStatsQuery): Promise<LearningPathAdvisorStats> {
  return http.get<LearningPathAdvisorStats>('/learning-paths/advisor/stats', {
    provider: query?.provider,
    fallback_only: query?.fallback_only ? 'true' : undefined,
    limit: query?.limit,
  })
}
