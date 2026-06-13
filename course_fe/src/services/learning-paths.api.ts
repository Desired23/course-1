import { API_BASE_URL, getAccessToken, getApiTransportHeaders, http } from './http'
import type { PaginatedResponse } from './common/pagination'

export interface AdvisorMessage {
  role: 'user' | 'assistant'
  content: string
  artifact?: AdvisorMessageArtifact
}

export interface AdvisorMessageArtifact {
  type: 'course_list' | 'path' | 'comparison'
  course_ids?: number[]
  retrieval_plan?: unknown
}

export interface AdvisorMeta {
  suggested_actions?: string[]
  retrieval_plan?: unknown
  retrieved_count?: number
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
  items: LearningPathItem[]
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
}

export interface AdvisorChatRequest {
  goal_text: string
  weekly_hours?: number
  messages?: AdvisorMessage[]
  known_skills?: string[]
}

export type AdvisorChatResponse =
  | { type: 'question'; message: string; advisor_meta?: AdvisorMeta }
  | { type: 'course_list'; courses: LearningPathItem[]; summary: string; advisor_meta?: AdvisorMeta }
  | { type: 'path'; path: LearningPathItem[]; estimated_weeks: number; summary: string; advisor_meta?: AdvisorMeta }

export interface CreateLearningPathRequest {
  goal_text: string
  summary: string
  estimated_weeks: number
  path: LearningPathItem[]
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
      ...getApiTransportHeaders(),
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

export async function recalculateLearningPath(pathId: number, payload: AdvisorChatRequest): Promise<LearningPathDetail | AdvisorChatResponse> {
  return http.post<LearningPathDetail | AdvisorChatResponse>(`/learning-paths/${pathId}/recalculate`, payload)
}
