


















import { http } from './http'



export type SupportTicketType =
  | 'general'
  | 'course_deletion_request'
  | 'refund'
  | 'copyright'
  | 'other'

export interface SupportTicket {
  id: number
  user: number | null
  name: string | null
  email: string
  subject: string
  message: string
  ticket_type: SupportTicketType
  course: number | null
  course_title: string | null
  metadata: Record<string, any>
  resolution: Record<string, any>
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  admin: number | null
}

export interface SupportReply {
  id: number
  support: number
  user: number
  admin: number | null
  message: string
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}



export async function getSupportTickets(params?: {
  user_id?: number
  page?: number
  page_size?: number
  status?: string
  priority?: string
  search?: string
  sort_by?: 'newest' | 'oldest' | 'updated_desc'
}): Promise<PaginatedResponse<SupportTicket>> {
  const searchParams = new URLSearchParams()
  if (params?.user_id !== undefined) searchParams.set('user_id', String(params.user_id))
  if (params?.page !== undefined) searchParams.set('page', String(params.page))
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size))
  if (params?.status) searchParams.set('status', params.status)
  if (params?.priority) searchParams.set('priority', params.priority)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.sort_by) searchParams.set('sort_by', params.sort_by)
  const qs = searchParams.toString()
  return http.get<PaginatedResponse<SupportTicket>>(`/supports/${qs ? `?${qs}` : ''}`)
}

export async function createSupportTicket(data: {
  user?: number
  name?: string
  email?: string
  subject: string
  message: string
  priority?: string
  category?: string
  ticket_type?: SupportTicketType
  course?: number
  metadata?: Record<string, any>
}): Promise<SupportTicket> {
  return http.post<SupportTicket>('/supports/create/', data)
}

// Admin: list tickets (optionally filter by type, e.g. course_deletion_request)
export async function getAdminSupportTickets(params?: {
  ticket_type?: SupportTicketType
  status?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<SupportTicket>> {
  const searchParams = new URLSearchParams()
  if (params?.ticket_type) searchParams.set('ticket_type', params.ticket_type)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.page !== undefined) searchParams.set('page', String(params.page))
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size))
  const qs = searchParams.toString()
  return http.get<PaginatedResponse<SupportTicket>>(`/supports/${qs ? `?${qs}` : ''}`)
}

// Admin: resolve a ticket; non-reject actions execute the matching course moderation
export async function resolveSupportTicket(
  ticketId: number,
  data: { action: 'reject' | 'archive' | 'hide' | 'hard_block' | 'delete'; notes?: string },
): Promise<SupportTicket> {
  return http.post<SupportTicket>(`/supports/${ticketId}/resolve/`, data)
}

export async function updateSupportTicket(
  ticketId: number,
  data: Partial<{ subject: string; message: string; status: string; priority: string }>
): Promise<SupportTicket> {
  return http.patch<SupportTicket>(`/supports/${ticketId}/update/`, data)
}

export async function deleteSupportTicket(ticketId: number): Promise<{ message: string }> {
  return http.delete<{ message: string }>(`/supports/${ticketId}/delete/`)
}



export async function getSupportReplies(ticketId: number): Promise<SupportReply[]> {
  const res = await http.get<PaginatedResponse<SupportReply> | SupportReply[]>(`/replies/support/${ticketId}/`)
  return Array.isArray(res) ? res : res.results
}

export async function createSupportReply(data: {
  support: number
  user: number
  message: string
}): Promise<SupportReply> {
  return http.post<SupportReply>('/replies/', data)
}

export async function updateSupportReply(
  replyId: number,
  data: Partial<{ message: string }>
): Promise<SupportReply> {
  return http.patch<SupportReply>(`/replies/${replyId}/`, data)
}

export async function deleteSupportReply(replyId: number): Promise<void> {
  return http.delete<void>(`/replies/${replyId}/delete/`)
}



export function getTicketStatusLabel(status: string): string {
  switch (status) {
    case 'open': return 'Mới'
    case 'in_progress': return 'Đang xử lý'
    case 'resolved': return 'Đã giải quyết'
    case 'closed': return 'Đã đóng'
    default: return status
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'low': return 'Thấp'
    case 'medium': return 'Trung bình'
    case 'high': return 'Cao'
    case 'urgent': return 'Khẩn cấp'
    default: return priority
  }
}
