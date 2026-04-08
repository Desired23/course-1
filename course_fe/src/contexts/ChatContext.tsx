import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  getChatConversations,
  getConversationMessages,
  getOrCreateConversation,
  getConversationById,
  sendConversationMessage,
  markConversationRead,
  updateConversationMessage,
  addMessageReaction,
  removeMessageReaction,
  getChatRooms,
  getChatMessages,
  getOrCreateChatRoom,
  sendChatMessageRest,
  markChatRoomRead,
  type LegacyChatRoom as ApiRoom,
  type LegacyChatMessage as ApiMsg,
  type Conversation as ApiConversation,
  type ConversationMessage as ApiConversationMessage,
} from '../services/chat.api'

// ─── Types (keep same external interface for Chat / ChatWidget) ───

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: Date
  read: boolean
  type: 'text' | 'image' | 'file' | 'video'
  fileUrl?: string
  fileName?: string
  mimeType?: string
  status?: 'active' | 'edited' | 'revoked' | 'deleted'
  replyTo?: {
    id: string
    senderName: string
    content: string
  }
  reactions?: Array<{
    emoji: string
    count: number
    reactedByMe: boolean
  }>
  attachments?: Array<{
    kind: 'image' | 'video' | 'file'
    fileUrl: string
    fileName: string
    mimeType: string
    fileSize: number
    thumbnailUrl?: string
  }>
}

interface ChatConversation {
  id: string
  participants: {
    id: string
    name: string
    avatar?: string
    online: boolean
    lastSeen?: Date
    role?: 'owner' | 'admin' | 'member'
  }[]
  lastMessage?: ChatMessage
  unreadCount: number
  updatedAt: Date
  type: 'direct' | 'group'
  title?: string
}

interface ChatState {
  conversations: ChatConversation[]
  activeConversationId: string | null
  messages: { [conversationId: string]: ChatMessage[] }
  messageMeta: {
    [conversationId: string]: {
      page: number
      hasMore: boolean
      loadingOlder: boolean
    }
  }
  isOpen: boolean
  totalUnreadCount: number
  loading: boolean
}

type ChatAction =
  | { type: 'TOGGLE_CHAT' }
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_CONVERSATIONS'; payload: ChatConversation[] }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: ChatMessage[]; page?: number; hasMore?: boolean } }
  | { type: 'PREPEND_MESSAGES'; payload: { conversationId: string; messages: ChatMessage[]; page: number; hasMore: boolean } }
  | { type: 'SET_LOADING_OLDER'; payload: { conversationId: string; loadingOlder: boolean } }
  | { type: 'SEND_MESSAGE'; payload: { conversationId: string; message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'> } }
  | { type: 'RECEIVE_MESSAGE'; payload: { conversationId: string; message: ChatMessage } }
  | { type: 'UPDATE_MESSAGE'; payload: { conversationId: string; messageId: string; updates: Partial<ChatMessage> } }
  | { type: 'SET_MESSAGE_REACTIONS'; payload: { conversationId: string; messageId: string; reactions: ChatMessage['reactions'] } }
  | { type: 'UPDATE_CONVERSATION'; payload: ChatConversation }
  | { type: 'MARK_CONVERSATION_AS_READ'; payload: string }
  | { type: 'CREATE_CONVERSATION'; payload: ChatConversation }
  | { type: 'SET_LOADING'; payload: boolean }

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  messageMeta: {},
  isOpen: false,
  totalUnreadCount: 0,
  loading: false,
}

// ─── Helpers ──────────────────────────────────────────────────────

function mapApiMsgToLocal(m: ApiMsg, currentUserId: string): ChatMessage {
  return {
    id: String(m.id),
    senderId: String(m.sender),
    senderName: m.sender_name,
    content: m.content,
    timestamp: new Date(m.created_at),
    read: m.is_read,
    type: 'text',
    status: 'active',
    reactions: [],
  }
}

function aggregateReactions(
  reactions: ApiConversationMessage['reactions'],
  currentUserId: string,
): ChatMessage['reactions'] {
  const grouped = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>()
  for (const reaction of reactions || []) {
    const existing = grouped.get(reaction.reaction)
    if (existing) {
      existing.count += 1
      existing.reactedByMe = existing.reactedByMe || String(reaction.user_id) === currentUserId
      continue
    }
    grouped.set(reaction.reaction, {
      emoji: reaction.reaction,
      count: 1,
      reactedByMe: String(reaction.user_id) === currentUserId,
    })
  }
  return Array.from(grouped.values())
}

function mapConversationMessageToLocal(
  m: ApiConversationMessage,
  currentUserId: string,
  unknownLabel = 'Unknown',
): ChatMessage {
  return {
    id: String(m.id),
    senderId: String(m.sender?.id ?? ''),
    senderName: m.sender?.name || unknownLabel,
    senderAvatar: m.sender?.avatar || undefined,
    content: m.text_content || '',
    timestamp: new Date(m.created_at),
    read: String(m.sender?.id ?? '') === currentUserId,
    type: m.type === 'file' ? 'file' : m.type === 'image' ? 'image' : m.type === 'video' ? 'video' : 'text',
    fileUrl: m.attachments[0]?.file_url,
    fileName: m.attachments[0]?.file_name,
    mimeType: m.attachments[0]?.mime_type,
    status: m.status,
    replyTo: m.reply_to
      ? {
          id: String(m.reply_to.id),
          senderName: m.reply_to.sender_name,
          content: m.reply_to.text_preview,
        }
      : undefined,
    reactions: aggregateReactions(m.reactions || [], currentUserId),
    attachments: (m.attachments || []).map((attachment) => ({
      kind: attachment.kind,
      fileUrl: attachment.file_url,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
      thumbnailUrl: attachment.thumbnail_url || undefined,
    })),
  }
}

function mapApiRoomToConv(r: ApiRoom, currentUserId: string, currentUserName = 'You'): ChatConversation {
  const lastMsg = r.last_message
    ? mapApiMsgToLocal(r.last_message, currentUserId)
    : undefined
  return {
    id: String(r.id),
    participants: [
      { id: currentUserId, name: currentUserName, online: true },
      { id: String(r.other_user_id), name: r.other_user_name, online: false },
    ],
    lastMessage: lastMsg,
    unreadCount: r.unread_count,
    updatedAt: new Date(r.updated_at),
    type: 'direct',
  }
}

function mapConversationToLocal(c: ApiConversation, currentUserId: string, currentUserName = 'You'): ChatConversation {
  const otherParticipants = c.participants.filter((participant) => String(participant.user.id) !== currentUserId)
  const participantList = c.type === 'direct' && otherParticipants.length > 0
    ? [
        { id: currentUserId, name: currentUserName, online: true, role: c.my_membership?.role },
        ...otherParticipants.map((participant) => ({
          id: String(participant.user.id),
          name: participant.nickname || participant.user.name,
          avatar: participant.user.avatar || undefined,
          online: false,
          role: participant.role,
        })),
      ]
    : c.participants.map((participant) => ({
        id: String(participant.user.id),
        name: participant.nickname || participant.user.name,
        avatar: participant.user.avatar || undefined,
        online: false,
        role: participant.role,
      }))

  const lastMessage = c.last_message_preview
    ? {
        id: String(c.last_message_preview.id),
        senderId: String(c.last_message_preview.sender_id),
        senderName: c.last_message_preview.sender_name,
        content: c.last_message_preview.text,
        timestamp: new Date(c.last_message_preview.created_at),
        read: false,
        type: 'text' as const,
      }
    : undefined

  const unreadCount = c.my_membership?.last_read_at
    ? 0
    : (lastMessage && lastMessage.senderId !== currentUserId ? 1 : 0)

  return {
    id: String(c.id),
    participants: participantList,
    lastMessage,
    unreadCount,
    updatedAt: new Date(c.last_message_at || c.updated_at),
    type: c.type === 'group' ? 'group' : 'direct',
    title: c.title || undefined,
  }
}

// ─── Reducer ──────────────────────────────────────────────────────

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'TOGGLE_CHAT':
      return { ...state, isOpen: !state.isOpen }
    case 'OPEN_CHAT':
      return { ...state, isOpen: true }
    case 'CLOSE_CHAT':
      return { ...state, isOpen: false, activeConversationId: null }
    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload }
    case 'SET_CONVERSATIONS': {
      const total = action.payload.reduce((acc, c) => acc + c.unreadCount, 0)
      return { ...state, conversations: action.payload, totalUnreadCount: total }
    }
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: { ...state.messages, [action.payload.conversationId]: action.payload.messages },
        messageMeta: {
          ...state.messageMeta,
          [action.payload.conversationId]: {
            page: action.payload.page ?? 1,
            hasMore: action.payload.hasMore ?? false,
            loadingOlder: false,
          },
        },
      }
    case 'PREPEND_MESSAGES': {
      const existing = state.messages[action.payload.conversationId] || []
      const existingIds = new Set(existing.map((message) => message.id))
      const prepended = action.payload.messages.filter((message) => !existingIds.has(message.id))
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: [...prepended, ...existing],
        },
        messageMeta: {
          ...state.messageMeta,
          [action.payload.conversationId]: {
            page: action.payload.page,
            hasMore: action.payload.hasMore,
            loadingOlder: false,
          },
        },
      }
    }
    case 'SET_LOADING_OLDER':
      return {
        ...state,
        messageMeta: {
          ...state.messageMeta,
          [action.payload.conversationId]: {
            page: state.messageMeta[action.payload.conversationId]?.page ?? 1,
            hasMore: state.messageMeta[action.payload.conversationId]?.hasMore ?? true,
            loadingOlder: action.payload.loadingOlder,
          },
        },
      }
    case 'SEND_MESSAGE': {
      const { conversationId, message } = action.payload
      const newMsg: ChatMessage = { ...message, id: `tmp-${Date.now()}`, timestamp: new Date(), read: true }
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), newMsg],
        },
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, lastMessage: newMsg, updatedAt: new Date() } : c,
        ),
      }
    }
    case 'RECEIVE_MESSAGE': {
      const { conversationId, message } = action.payload
      // Deduplicate
      const existing = state.messages[conversationId] || []
      if (existing.some(m => m.id === message.id)) return state
      const isActive = state.activeConversationId === conversationId
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: [...existing, message] },
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: message,
                updatedAt: new Date(),
                unreadCount: isActive ? c.unreadCount : c.unreadCount + (message.read ? 0 : 1),
              }
            : c,
        ),
        totalUnreadCount: isActive ? state.totalUnreadCount : state.totalUnreadCount + (message.read ? 0 : 1),
      }
    }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: (state.messages[action.payload.conversationId] || []).map((message) =>
            message.id === action.payload.messageId
              ? { ...message, ...action.payload.updates }
              : message,
          ),
        },
      }
    case 'SET_MESSAGE_REACTIONS':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: (state.messages[action.payload.conversationId] || []).map((message) =>
            message.id === action.payload.messageId
              ? { ...message, reactions: action.payload.reactions || [] }
              : message,
          ),
        },
      }
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.some((conversation) => conversation.id === action.payload.id)
          ? state.conversations.map((conversation) =>
              conversation.id === action.payload.id ? { ...conversation, ...action.payload } : conversation,
            )
          : [action.payload, ...state.conversations],
      }
    case 'MARK_CONVERSATION_AS_READ': {
      const conv = state.conversations.find(c => c.id === action.payload)
      if (!conv) return state
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.payload ? { ...c, unreadCount: 0 } : c,
        ),
        messages: {
          ...state.messages,
          [action.payload]: (state.messages[action.payload] || []).map(m => ({ ...m, read: true })),
        },
        totalUnreadCount: Math.max(0, state.totalUnreadCount - conv.unreadCount),
      }
    }
    case 'CREATE_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        messages: { ...state.messages, [action.payload.id]: [] },
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────

interface ChatContextType {
  state: ChatState
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
  setActiveConversation: (id: string | null) => void
  sendMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'> & { replyToMessageId?: string }) => void
  receiveMessage: (conversationId: string, message: ChatMessage) => void
  markConversationAsRead: (conversationId: string) => void
  createConversation: (conversation: ChatConversation) => void
  openChatWithUser: (otherUserId: number, otherUserName?: string) => Promise<void>
  editMessage: (conversationId: string, messageId: string, content: string) => Promise<void>
  revokeMessage: (conversationId: string, messageId: string) => Promise<void>
  toggleReaction: (conversationId: string, messageId: string, reaction: string) => Promise<void>
  refreshConversation: (conversationId: string) => Promise<void>
  loadOlderMessages: (conversationId: string) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const { user, isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const userId = user?.id ?? null
  const currentUserDisplayName = user?.name || t('chat.you')
  const unknownSenderLabel = t('chat_widget.unknown')
  const wsRoomRef = useRef<string | null>(null)

  // ── Fetch rooms on mount ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId) return
    let cancelled = false
    ;(async () => {
      try {
        let mappedConversations: ChatConversation[] = []
        try {
          const conversationsResp = await getChatConversations({ page: 1, page_size: 100 })
          mappedConversations = (conversationsResp.results || []).map((conversation) =>
            mapConversationToLocal(conversation, userId, currentUserDisplayName),
          )
        } catch (conversationErr) {
          console.warn('[Chat] Falling back to legacy rooms:', conversationErr)
          const roomsResp = await getChatRooms()
          const roomsList = Array.isArray(roomsResp) ? roomsResp : (roomsResp && (roomsResp as any).results) ? (roomsResp as any).results : []
          mappedConversations = roomsList.map((r: any) => mapApiRoomToConv(r, userId, currentUserDisplayName))
        }
        if (!cancelled) {
          dispatch({
            type: 'SET_CONVERSATIONS',
            payload: mappedConversations,
          })
        }
      } catch (err) {
        console.error('[Chat] Failed to fetch rooms:', err)
      }
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, userId, currentUserDisplayName])

  // ── Load messages when active conversation changes ────────────
  useEffect(() => {
    if (!state.activeConversationId || !userId) return
    const conversationId = Number(state.activeConversationId)
    let cancelled = false
    ;(async () => {
      try {
        let msgs: ChatMessage[] = []
        try {
          const res = await getConversationMessages(conversationId, 1, 30)
          msgs = res.results.map(m => mapConversationMessageToLocal(m, userId, unknownSenderLabel)).reverse()
          if (!cancelled) {
            dispatch({
              type: 'SET_MESSAGES',
              payload: {
                conversationId: String(conversationId),
                messages: msgs,
                page: 1,
                hasMore: Boolean(res.next) || (res.page ?? 1) < (res.total_pages ?? 1),
              },
            })
          }
        } catch (conversationErr) {
          console.warn('[Chat] Falling back to legacy messages:', conversationErr)
          const res = await getChatMessages(conversationId, 1, 30)
          msgs = res.results.map(m => mapApiMsgToLocal(m, userId)).reverse()
          if (!cancelled) {
            dispatch({
              type: 'SET_MESSAGES',
              payload: {
                conversationId: String(conversationId),
                messages: msgs,
                page: 1,
                hasMore: Boolean(res.next) || (res.page ?? 1) < (res.total_pages ?? 1),
              },
            })
          }
        }
      } catch (err) {
        console.error('[Chat] Failed to fetch messages:', err)
      }
    })()
    return () => { cancelled = true }
  }, [state.activeConversationId, userId, unknownSenderLabel])

  // ── WebSocket per active room ─────────────────────────────────
  const handleChatWsMessage = useCallback(
    (data: any) => {
      if (data.type === 'chat_message' && data.data) {
        const d = data.data
        const roomId = String(d.room)
        const msg: ChatMessage = d.conversation_message
          ? mapConversationMessageToLocal(d.conversation_message, String(userId ?? ''), unknownSenderLabel)
          : {
              id: String(d.id),
              senderId: String(d.sender),
              senderName: d.sender_name,
              content: d.content,
              timestamp: new Date(d.created_at),
              read: d.is_read,
              type: 'text',
            }
        dispatch({ type: 'RECEIVE_MESSAGE', payload: { conversationId: roomId, message: msg } })
      }
    },
    [userId, unknownSenderLabel],
  )

  const wsPath = state.activeConversationId ? `/ws/chat/${state.activeConversationId}/` : ''
  const wsEnabled = isAuthenticated && !!state.activeConversationId

  useWebSocket({
    path: wsPath || '/ws/chat/0/', // fallback path won't connect since enabled=false
    onMessage: handleChatWsMessage,
    enabled: wsEnabled,
  })

  // ── Actions ───────────────────────────────────────────────────
  const toggleChat = () => dispatch({ type: 'TOGGLE_CHAT' })
  const openChat = () => dispatch({ type: 'OPEN_CHAT' })
  const closeChat = () => dispatch({ type: 'CLOSE_CHAT' })

  const setActiveConversation = (id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id })
    if (id && userId) {
      markConversationAsRead(id)
    }
  }

  const sendMessage = async (
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'> & { replyToMessageId?: string },
  ) => {
    if (userId) {
      try {
        let localMessage: ChatMessage
        try {
          const inferredType = message.attachments?.[0]?.kind || (message.type === 'video' ? 'video' : message.type === 'image' ? 'image' : message.type === 'file' ? 'file' : 'text')
          const sent = await sendConversationMessage(Number(conversationId), {
            type: inferredType,
            text_content: message.content || undefined,
            client_message_id: `temp-${Date.now()}`,
            reply_to_message_id: message.replyToMessageId ? Number(message.replyToMessageId) : undefined,
            attachments: message.attachments?.map((attachment) => ({
              kind: attachment.kind,
              storage_provider: 'cloudinary',
              file_url: attachment.fileUrl,
              thumbnail_url: attachment.thumbnailUrl,
              file_name: attachment.fileName,
              mime_type: attachment.mimeType,
              file_size: attachment.fileSize,
            })),
          })
          localMessage = mapConversationMessageToLocal(sent, userId, unknownSenderLabel)
        } catch (conversationErr) {
          console.warn('[Chat] Falling back to legacy send:', conversationErr)
          const sent = await sendChatMessageRest(Number(conversationId), Number(userId), message.content)
          localMessage = mapApiMsgToLocal(sent, userId)
        }
        dispatch({
          type: 'RECEIVE_MESSAGE',
          payload: {
            conversationId,
            message: localMessage,
          },
        })
      } catch (err) {
        console.error('[Chat] Failed to send:', err)
      }
    }
  }

  const receiveMessage = (conversationId: string, message: ChatMessage) => {
    dispatch({ type: 'RECEIVE_MESSAGE', payload: { conversationId, message } })
  }

  const markConversationAsRead = async (conversationId: string) => {
    dispatch({ type: 'MARK_CONVERSATION_AS_READ', payload: conversationId })
    if (userId) {
      try {
        const messages = state.messages[conversationId] || []
        const lastMessageId = messages.length > 0 ? Number(messages[messages.length - 1].id) : undefined
        try {
          await markConversationRead(Number(conversationId), { last_read_message_id: lastMessageId })
        } catch (conversationErr) {
          console.warn('[Chat] Falling back to legacy read:', conversationErr)
          await markChatRoomRead(Number(conversationId), Number(userId))
        }
      } catch { /* best effort */ }
    }
  }

  const createConversation = (conversation: ChatConversation) => {
    dispatch({ type: 'CREATE_CONVERSATION', payload: conversation })
  }

  const refreshConversation = async (conversationId: string) => {
    if (!userId) return
    try {
      const conversation = await getConversationById(Number(conversationId))
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: mapConversationToLocal(conversation, userId, currentUserDisplayName),
      })
    } catch (err) {
      console.error('[Chat] Failed to refresh conversation:', err)
    }
  }

  const loadOlderMessages = async (conversationId: string) => {
    if (!userId) return
    const meta = state.messageMeta[conversationId]
    if (meta?.loadingOlder || meta?.hasMore === false) return

    const nextPage = (meta?.page ?? 1) + 1
    dispatch({ type: 'SET_LOADING_OLDER', payload: { conversationId, loadingOlder: true } })
    try {
      try {
        const res = await getConversationMessages(Number(conversationId), nextPage, 30)
        const olderMessages = res.results.map((message) => mapConversationMessageToLocal(message, userId)).reverse()
        dispatch({
          type: 'PREPEND_MESSAGES',
          payload: {
            conversationId,
            messages: olderMessages,
            page: nextPage,
            hasMore: Boolean(res.next) || (res.page ?? 1) < (res.total_pages ?? 1),
          },
        })
        return
      } catch (conversationErr) {
        console.warn('[Chat] Falling back to legacy older messages:', conversationErr)
      }

      const res = await getChatMessages(Number(conversationId), nextPage, 30)
      const olderMessages = res.results.map((message) => mapApiMsgToLocal(message, userId)).reverse()
      dispatch({
        type: 'PREPEND_MESSAGES',
        payload: {
          conversationId,
          messages: olderMessages,
          page: nextPage,
          hasMore: Boolean(res.next) || (res.page ?? 1) < (res.total_pages ?? 1),
        },
      })
    } catch (err) {
      console.error('[Chat] Failed to load older messages:', err)
      dispatch({ type: 'SET_LOADING_OLDER', payload: { conversationId, loadingOlder: false } })
    }
  }

  const editMessage = async (conversationId: string, messageId: string, content: string) => {
    try {
      const updated = await updateConversationMessage(Number(messageId), { text_content: content })
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          messageId,
          updates: mapConversationMessageToLocal(updated, String(userId ?? ''), unknownSenderLabel),
        },
      })
    } catch (err: any) {
      toast.error(err?.message || t('chat_context.edit_message_failed'))
    }
  }

  const revokeMessage = async (conversationId: string, messageId: string) => {
    try {
      const updated = await updateConversationMessage(Number(messageId), { action: 'revoke' })
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          messageId,
          updates: mapConversationMessageToLocal(updated, String(userId ?? ''), unknownSenderLabel),
        },
      })
    } catch (err: any) {
      toast.error(err?.message || t('chat_context.revoke_message_failed'))
    }
  }

  const toggleReaction = async (conversationId: string, messageId: string, reaction: string) => {
    const currentMessage = (state.messages[conversationId] || []).find((message) => message.id === messageId)
    const currentReactions = currentMessage?.reactions || []
    const currentReaction = currentReactions.find((item) => item.emoji === reaction)
    try {
      if (currentReaction?.reactedByMe) {
        await removeMessageReaction(Number(messageId), reaction)
      } else {
        await addMessageReaction(Number(messageId), reaction)
      }
      const nextReactions = (() => {
        const existing = currentReactions.find((item) => item.emoji === reaction)
        if (!existing) {
          return [...currentReactions, { emoji: reaction, count: 1, reactedByMe: true }]
        }
        if (existing.reactedByMe) {
          return currentReactions
            .map((item) => item.emoji === reaction ? { ...item, count: Math.max(0, item.count - 1), reactedByMe: false } : item)
            .filter((item) => item.count > 0)
        }
        return currentReactions.map((item) => item.emoji === reaction ? { ...item, count: item.count + 1, reactedByMe: true } : item)
      })()
      dispatch({
        type: 'SET_MESSAGE_REACTIONS',
        payload: {
          conversationId,
          messageId,
          reactions: nextReactions,
        },
      })
    } catch (err: any) {
      toast.error(err?.message || t('chat_context.reaction_update_failed'))
    }
  }

  /** Open a chat room with a specific user (creates room if needed) */
  const openChatWithUser = async (otherUserId: number, otherUserName?: string) => {
    if (!userId) {
      toast.error(t('chat_context.login_required'))
      return
    }
    try {
      let conv: ChatConversation
      try {
        const conversation = await getOrCreateConversation({
          type: 'direct',
          participant_ids: [otherUserId],
        })
        conv = mapConversationToLocal(conversation, userId)
      } catch (conversationErr) {
        console.warn('[Chat] Falling back to legacy direct open:', conversationErr)
        const room = await getOrCreateChatRoom(Number(userId), otherUserId)
        conv = mapApiRoomToConv(room, userId)
      }
      // Add to conversations if not already there
      if (!state.conversations.find(c => c.id === conv.id)) {
        dispatch({ type: 'CREATE_CONVERSATION', payload: conv })
      }
      dispatch({ type: 'OPEN_CHAT' })
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conv.id })
    } catch (err: any) {
      toast.error(err?.message || t('chat_context.open_chat_failed', { name: otherUserName || t('chat_context.this_user') }))
      console.error('[Chat] Failed to open chat with user:', err)
    }
  }

  const value: ChatContextType = {
    state,
    toggleChat,
    openChat,
    closeChat,
    setActiveConversation,
    sendMessage,
    receiveMessage,
    markConversationAsRead,
    createConversation,
    openChatWithUser,
    editMessage,
    revokeMessage,
    toggleReaction,
    refreshConversation,
    loadOlderMessages,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
