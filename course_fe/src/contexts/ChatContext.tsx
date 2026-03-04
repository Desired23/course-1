import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  getChatRooms,
  getChatMessages,
  getOrCreateChatRoom,
  sendChatMessageRest,
  markChatRoomRead,
  type ChatRoom as ApiRoom,
  type ChatMessage as ApiMsg,
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
  type: 'text' | 'image' | 'file'
  fileUrl?: string
  fileName?: string
}

interface ChatConversation {
  id: string
  participants: {
    id: string
    name: string
    avatar?: string
    online: boolean
    lastSeen?: Date
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
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: ChatMessage[] } }
  | { type: 'SEND_MESSAGE'; payload: { conversationId: string; message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'> } }
  | { type: 'RECEIVE_MESSAGE'; payload: { conversationId: string; message: ChatMessage } }
  | { type: 'MARK_CONVERSATION_AS_READ'; payload: string }
  | { type: 'CREATE_CONVERSATION'; payload: ChatConversation }
  | { type: 'SET_LOADING'; payload: boolean }

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
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
  }
}

function mapApiRoomToConv(r: ApiRoom, currentUserId: string): ChatConversation {
  const lastMsg = r.last_message
    ? mapApiMsgToLocal(r.last_message, currentUserId)
    : undefined
  return {
    id: String(r.id),
    participants: [
      { id: currentUserId, name: 'You', online: true },
      { id: String(r.other_user_id), name: r.other_user_name, online: false },
    ],
    lastMessage: lastMsg,
    unreadCount: r.unread_count,
    updatedAt: new Date(r.updated_at),
    type: 'direct',
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
  sendMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>) => void
  receiveMessage: (conversationId: string, message: ChatMessage) => void
  markConversationAsRead: (conversationId: string) => void
  createConversation: (conversation: ChatConversation) => void
  openChatWithUser: (otherUserId: number, otherUserName?: string) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id ?? null
  const wsRoomRef = useRef<string | null>(null)

  // ── Fetch rooms on mount ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId) return
    let cancelled = false
    ;(async () => {
      try {
        const rooms = await getChatRooms(Number(userId))
        if (!cancelled) {
          dispatch({
            type: 'SET_CONVERSATIONS',
            payload: rooms.map(r => mapApiRoomToConv(r, userId)),
          })
        }
      } catch (err) {
        console.error('[Chat] Failed to fetch rooms:', err)
      }
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, userId])

  // ── Load messages when active conversation changes ────────────
  useEffect(() => {
    if (!state.activeConversationId || !userId) return
    const roomId = Number(state.activeConversationId)
    let cancelled = false
    ;(async () => {
      try {
        const res = await getChatMessages(roomId, 1, 100)
        if (!cancelled) {
          // API returns newest first, reverse to chronological order for display
          const msgs = res.results.map(m => mapApiMsgToLocal(m, userId)).reverse()
          dispatch({ type: 'SET_MESSAGES', payload: { conversationId: String(roomId), messages: msgs } })
        }
      } catch (err) {
        console.error('[Chat] Failed to fetch messages:', err)
      }
    })()
    return () => { cancelled = true }
  }, [state.activeConversationId, userId])

  // ── WebSocket per active room ─────────────────────────────────
  const handleChatWsMessage = useCallback(
    (data: any) => {
      if (data.type === 'chat_message' && data.data) {
        const d = data.data
        const roomId = String(d.room)
        const msg: ChatMessage = {
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
    [],
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
    message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>,
  ) => {
    // Optimistic UI update
    dispatch({ type: 'SEND_MESSAGE', payload: { conversationId, message } })

    // Send via REST (ChatConsumer WS will broadcast to both users)
    if (userId) {
      try {
        await sendChatMessageRest(Number(conversationId), Number(userId), message.content)
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
        await markChatRoomRead(Number(conversationId), Number(userId))
      } catch { /* best effort */ }
    }
  }

  const createConversation = (conversation: ChatConversation) => {
    dispatch({ type: 'CREATE_CONVERSATION', payload: conversation })
  }

  /** Open a chat room with a specific user (creates room if needed) */
  const openChatWithUser = async (otherUserId: number, otherUserName?: string) => {
    if (!userId) return
    try {
      const room = await getOrCreateChatRoom(Number(userId), otherUserId)
      const conv = mapApiRoomToConv(room, userId)
      // Add to conversations if not already there
      if (!state.conversations.find(c => c.id === conv.id)) {
        dispatch({ type: 'CREATE_CONVERSATION', payload: conv })
      }
      dispatch({ type: 'OPEN_CHAT' })
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conv.id })
    } catch (err) {
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
