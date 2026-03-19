import { http } from './http'

// ── Types ──────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number
  room: number
  sender: number
  sender_name: string
  content: string
  is_read: boolean
  created_at: string // ISO
}

export interface ChatRoom {
  id: number
  other_user_id: number
  other_user_name: string
  last_message: ChatMessage | null
  unread_count: number
  created_at: string
  updated_at: string
}

interface PaginatedMessages {
  count: number
  next: string | null
  previous: string | null
  results: ChatMessage[]
}

// ── API ────────────────────────────────────────────────────────────

/** Get all chat rooms for the current authenticated user */
export async function getChatRooms(): Promise<ChatRoom[]> {
  return http.get<ChatRoom[]>('/chat/rooms/')
}

/** Create (or get existing) chat room between two users */
export async function getOrCreateChatRoom(user1Id: number, user2Id: number): Promise<ChatRoom> {
  return http.post<ChatRoom>('/chat/rooms/', { user1_id: user1Id, user2_id: user2Id })
}

/** Get messages for a room (paginated, newest first) */
export async function getChatMessages(
  roomId: number,
  page = 1,
  pageSize = 50,
): Promise<PaginatedMessages> {
  return http.get<PaginatedMessages>(
    `/chat/rooms/${roomId}/messages/?page=${page}&page_size=${pageSize}`,
  )
}

/** Send a message via REST (fallback when WS unavailable) */
export async function sendChatMessageRest(roomId: number, senderId: number, content: string): Promise<ChatMessage> {
  return http.post<ChatMessage>(`/chat/rooms/${roomId}/messages/`, {
    sender_id: senderId,
    content,
  })
}

/** Mark all messages in a room as read for the given user */
export async function markChatRoomRead(roomId: number, userId: number): Promise<void> {
  await http.put<{ status: string }>(`/chat/rooms/${roomId}/read/`, { user_id: userId })
}
