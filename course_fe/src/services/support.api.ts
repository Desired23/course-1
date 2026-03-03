/**
 * Support API Service — Tickets & Replies
 *
 * BE endpoints (all under /api/):
 *   Support Tickets:
 *     GET    /supports/                              — list tickets (filter by user)
 *     POST   /supports/create/                       — create ticket
 *     PATCH  /supports/<support_id>/update/           — update ticket (user)
 *     PATCH  /supports/<support_id>/admin_update/     — update ticket (admin)
 *     DELETE /supports/<support_id>/delete/           — delete ticket
 *
 *   Support Replies:
 *     GET    /replies/                                — list all replies
 *     GET    /replies/support/<support_id>/           — list replies for a ticket
 *     POST   /replies/                                — create reply
 *     PATCH  /replies/<reply_id>/                     — update reply
 *     DELETE /replies/<reply_id>/delete/              — delete reply
 */

import { http } from './http'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupportTicket {
  id: number
  user: number | null
  name: string | null
  email: string
  subject: string
  message: string
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

// ─── Support Tickets ──────────────────────────────────────────────────────────

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const res = await http.get<PaginatedResponse<SupportTicket> | SupportTicket[]>('/supports/')
  return Array.isArray(res) ? res : res.results
}

export async function createSupportTicket(data: {
  user?: number
  name?: string
  email: string
  subject: string
  message: string
  priority?: string
}): Promise<SupportTicket> {
  return http.post<SupportTicket>('/supports/create/', data)
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

// ─── Support Replies ──────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTicketStatusLabel(status: string): string {
  switch (status) {
    case 'open': return 'Mở'
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
