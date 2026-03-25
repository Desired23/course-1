import { http } from './http'

export interface LegacyChatMessage {
  id: number
  room: number
  sender: number
  sender_name: string
  content: string
  is_read: boolean
  created_at: string
}

export interface LegacyChatRoom {
  id: number
  other_user_id: number
  other_user_name: string
  last_message: LegacyChatMessage | null
  unread_count: number
  created_at: string
  updated_at: string
}

export interface ChatUserSummary {
  id: number
  name: string
  avatar?: string | null
}

export interface ChatUserSearchResponse {
  results: ChatUserSummary[]
}

export interface ConversationMembership {
  role: 'owner' | 'admin' | 'member'
  notification_level: 'all' | 'mentions' | 'mute'
  is_pinned: boolean
  last_read_message_id: number | null
  last_read_at: string | null
}

export interface ConversationMessage {
  id: number
  conversation: number
  sender: ChatUserSummary | null
  type: 'text' | 'image' | 'video' | 'file' | 'system'
  text_content: string | null
  status: 'active' | 'edited' | 'revoked' | 'deleted'
  report_count: number
  last_report_reason: string | null
  last_reported_at: string | null
  metadata: Record<string, unknown>
  reply_to: {
    id: number
    sender_name: string
    text_preview: string
  } | null
  forwarded_from: {
    message_id: number
    conversation_id: number | null
  } | null
  attachments: Array<{
    id: number
    kind: 'image' | 'video' | 'file'
    storage_provider: string
    file_url: string
    thumbnail_url: string | null
    file_name: string
    mime_type: string
    file_size: number
  }>
  reactions: Array<{
    id: number
    user_id: number
    reaction: string
    created_at: string
  }>
  created_at: string
  updated_at: string
  edited_at: string | null
  revoked_at: string | null
}

export interface ConversationParticipant {
  id: number
  user: ChatUserSummary
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  is_active: boolean
  nickname: string | null
  mute_until: string | null
  is_pinned: boolean
  last_read_message: number | null
  last_read_at: string | null
  notification_level: 'all' | 'mentions' | 'mute'
  can_send_message: boolean
  can_add_members: boolean
  can_change_group_info: boolean
}

export interface Conversation {
  id: number
  type: 'direct' | 'group' | 'system'
  title: string | null
  avatar: string | null
  description: string | null
  created_by: number | null
  owner: number | null
  is_public: boolean
  is_archived: boolean
  last_message: number | null
  last_message_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  participants: ConversationParticipant[]
  participant_count: number
  my_membership: ConversationMembership | null
  last_message_preview: {
    id: number
    type: string
    text: string
    sender_id: number
    sender_name: string
    created_at: string
    status: string
  } | null
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page: number
  total_pages: number
  page_size: number
  results: T[]
}

export async function getChatRooms(): Promise<LegacyChatRoom[] | PaginatedResponse<LegacyChatRoom>> {
  return http.get<LegacyChatRoom[] | PaginatedResponse<LegacyChatRoom>>('/chat/rooms/')
}

export async function getOrCreateChatRoom(user1Id: number, user2Id: number): Promise<LegacyChatRoom> {
  return http.post<LegacyChatRoom>('/chat/rooms/', { user1_id: user1Id, user2_id: user2Id })
}

export async function getChatMessages(
  roomId: number,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<LegacyChatMessage>> {
  return http.get<PaginatedResponse<LegacyChatMessage>>(
    `/chat/rooms/${roomId}/messages/?page=${page}&page_size=${pageSize}`,
  )
}

export async function sendChatMessageRest(roomId: number, senderId: number, content: string): Promise<LegacyChatMessage> {
  return http.post<LegacyChatMessage>(`/chat/rooms/${roomId}/messages/`, {
    sender_id: senderId,
    content,
  })
}

export async function markChatRoomRead(roomId: number, userId: number): Promise<void> {
  await http.put<{ status: string }>(`/chat/rooms/${roomId}/read/`, { user_id: userId })
}

export async function getChatConversations(params?: {
  type?: 'direct' | 'group' | 'all'
  q?: string
  has_unread?: boolean
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<Conversation>> {
  const searchParams = new URLSearchParams()
  if (params?.type && params.type !== 'all') searchParams.set('type', params.type)
  if (params?.q) searchParams.set('q', params.q)
  if (params?.has_unread !== undefined) searchParams.set('has_unread', params.has_unread ? 'true' : 'false')
  searchParams.set('page', String(params?.page ?? 1))
  searchParams.set('page_size', String(params?.page_size ?? 100))
  return http.get<PaginatedResponse<Conversation>>(`/chat/conversations/?${searchParams.toString()}`)
}

export async function searchChatUsers(
  q: string,
  limit = 8,
): Promise<ChatUserSearchResponse> {
  const searchParams = new URLSearchParams()
  searchParams.set('q', q)
  searchParams.set('limit', String(limit))
  return http.get<ChatUserSearchResponse>(`/chat/users/search/?${searchParams.toString()}`)
}

export async function getOrCreateConversation(data: {
  type: 'direct' | 'group'
  participant_ids: number[]
  title?: string
  description?: string
}): Promise<Conversation> {
  return http.post<Conversation>('/chat/conversations/', data)
}

export async function getConversationById(conversationId: number): Promise<Conversation> {
  return http.get<Conversation>(`/chat/conversations/${conversationId}/`)
}

export async function updateConversation(
  conversationId: number,
  data: {
    title?: string
    description?: string
    avatar?: string
  },
): Promise<Conversation> {
  return http.patch<Conversation>(`/chat/conversations/${conversationId}/`, data)
}

export async function getConversationMessages(
  conversationId: number,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<ConversationMessage>> {
  return http.get<PaginatedResponse<ConversationMessage>>(
    `/chat/conversations/${conversationId}/messages/?page=${page}&page_size=${pageSize}`,
  )
}

export async function sendConversationMessage(
  conversationId: number,
  data: {
    type?: 'text' | 'image' | 'video' | 'file' | 'system'
    text_content?: string
    reply_to_message_id?: number
    client_message_id?: string
    attachments?: Array<{
      kind: 'image' | 'video' | 'file'
      storage_provider?: string
      file_url: string
      thumbnail_url?: string | null
      file_name: string
      mime_type: string
      file_size: number
      width?: number | null
      height?: number | null
      duration_seconds?: number | null
      public_id?: string | null
      checksum?: string | null
    }>
  },
): Promise<ConversationMessage> {
  return http.post<ConversationMessage>(
    `/chat/conversations/${conversationId}/messages/`,
    data,
  )
}

export async function markConversationRead(
  conversationId: number,
  data?: { last_read_message_id?: number },
): Promise<{ conversation_id: number; last_read_message_id: number | null; read_at: string | null }> {
  return http.post<{ conversation_id: number; last_read_message_id: number | null; read_at: string | null }>(
    `/chat/conversations/${conversationId}/read/`,
    data || {},
  )
}

export async function getConversationParticipants(
  conversationId: number,
): Promise<PaginatedResponse<ConversationParticipant>> {
  return http.get<PaginatedResponse<ConversationParticipant>>(
    `/chat/conversations/${conversationId}/participants/`,
  )
}

export async function addConversationParticipants(
  conversationId: number,
  userIds: number[],
): Promise<{ results: ConversationParticipant[] }> {
  return http.post<{ results: ConversationParticipant[] }>(
    `/chat/conversations/${conversationId}/participants/`,
    { user_ids: userIds },
  )
}

export async function updateConversationParticipant(
  conversationId: number,
  userId: number,
  data: Partial<Pick<ConversationParticipant, 'nickname' | 'mute_until' | 'notification_level' | 'can_send_message' | 'can_add_members' | 'can_change_group_info' | 'role'>>,
): Promise<ConversationParticipant> {
  return http.patch<ConversationParticipant>(
    `/chat/conversations/${conversationId}/participants/${userId}/`,
    data,
  )
}

export async function removeConversationParticipant(
  conversationId: number,
  userId: number,
): Promise<{ message: string }> {
  return http.delete<{ message: string }>(
    `/chat/conversations/${conversationId}/participants/${userId}/`,
  )
}

export async function updateConversationMessage(
  messageId: number,
  data: { text_content?: string; action?: 'revoke' },
): Promise<ConversationMessage> {
  return http.patch<ConversationMessage>(
    `/chat/messages/${messageId}/`,
    data,
  )
}

export async function reportConversationMessage(
  messageId: number,
  data: { reason?: string },
): Promise<ConversationMessage> {
  return http.post<ConversationMessage>(`/chat/messages/${messageId}/report/`, data)
}

export async function moderateConversationMessage(
  messageId: number,
  data: { action: 'approve' | 'dismiss' | 'revoke' | 'delete'; reason?: string },
): Promise<ConversationMessage> {
  return http.post<ConversationMessage>(`/chat/messages/${messageId}/moderate/`, data)
}

export async function addMessageReaction(
  messageId: number,
  reaction: string,
): Promise<{ id: number; user_id: number; reaction: string; created_at: string }> {
  return http.post<{ id: number; user_id: number; reaction: string; created_at: string }>(
    `/chat/messages/${messageId}/reactions/`,
    { reaction },
  )
}

export async function removeMessageReaction(
  messageId: number,
  reaction: string,
): Promise<{ deleted: boolean }> {
  return http.delete<{ deleted: boolean }>(
    `/chat/messages/${messageId}/reactions/${encodeURIComponent(reaction)}/`,
  )
}
