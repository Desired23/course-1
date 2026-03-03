import { createContext, useContext, useReducer, ReactNode } from 'react'

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
}

type ChatAction =
  | { type: 'TOGGLE_CHAT' }
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SEND_MESSAGE'; payload: { conversationId: string; message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'> } }
  | { type: 'RECEIVE_MESSAGE'; payload: { conversationId: string; message: ChatMessage } }
  | { type: 'MARK_CONVERSATION_AS_READ'; payload: string }
  | { type: 'CREATE_CONVERSATION'; payload: ChatConversation }

const initialState: ChatState = {
  conversations: [
    {
      id: '1',
      participants: [
        {
          id: 'current-user',
          name: 'You',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          online: true
        },
        {
          id: 'instructor-1',
          name: 'Jonas Schmedtmann',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
          online: true
        }
      ],
      unreadCount: 2,
      updatedAt: new Date(Date.now() - 1800000), // 30 minutes ago
      type: 'direct'
    },
    {
      id: '2',
      participants: [
        {
          id: 'current-user',
          name: 'You',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          online: true
        },
        {
          id: 'student-1',
          name: 'Sarah Johnson',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=40&h=40&fit=crop&crop=face',
          online: false,
          lastSeen: new Date(Date.now() - 3600000) // 1 hour ago
        }
      ],
      unreadCount: 0,
      updatedAt: new Date(Date.now() - 7200000), // 2 hours ago
      type: 'direct'
    },
    {
      id: '3',
      participants: [
        {
          id: 'current-user',
          name: 'You',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          online: true
        },
        {
          id: 'instructor-2',
          name: 'Maximilian Schwarzmüller',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
          online: false,
          lastSeen: new Date(Date.now() - 1800000) // 30 minutes ago
        }
      ],
      unreadCount: 1,
      updatedAt: new Date(Date.now() - 300000), // 5 minutes ago
      type: 'direct'
    }
  ],
  activeConversationId: null,
  messages: {
    '1': [
      {
        id: '1',
        senderId: 'instructor-1',
        senderName: 'Jonas Schmedtmann',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
        content: 'Hi! I saw your question about async/await. Let me help you with that.',
        timestamp: new Date(Date.now() - 1800000),
        read: false,
        type: 'text'
      },
      {
        id: '2',
        senderId: 'instructor-1',
        senderName: 'Jonas Schmedtmann',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
        content: 'Here\'s a great resource that explains promises and async/await: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
        timestamp: new Date(Date.now() - 1740000),
        read: false,
        type: 'text'
      }
    ],
    '2': [
      {
        id: '3',
        senderId: 'current-user',
        senderName: 'You',
        content: 'Thanks for the help with the React hooks!',
        timestamp: new Date(Date.now() - 7200000),
        read: true,
        type: 'text'
      },
      {
        id: '4',
        senderId: 'student-1',
        senderName: 'Sarah Johnson',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=40&h=40&fit=crop&crop=face',
        content: 'You\'re welcome! Feel free to ask if you have more questions.',
        timestamp: new Date(Date.now() - 7140000),
        read: true,
        type: 'text'
      }
    ],
    '3': [
      {
        id: '5',
        senderId: 'instructor-2',
        senderName: 'Maximilian Schwarzmüller',
        senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
        content: 'Great progress on the Redux section! Keep it up.',
        timestamp: new Date(Date.now() - 300000),
        read: false,
        type: 'text'
      }
    ]
  },
  isOpen: false,
  totalUnreadCount: 3
}

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

    case 'SEND_MESSAGE':
      const { conversationId, message } = action.payload
      const newMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date(),
        read: true
      }
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), newMessage]
        },
        conversations: state.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, lastMessage: newMessage, updatedAt: new Date() }
            : conv
        )
      }

    case 'RECEIVE_MESSAGE':
      const { conversationId: convId, message: receivedMessage } = action.payload
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [convId]: [...(state.messages[convId] || []), receivedMessage]
        },
        conversations: state.conversations.map(conv =>
          conv.id === convId
            ? { 
                ...conv, 
                lastMessage: receivedMessage, 
                updatedAt: new Date(),
                unreadCount: conv.unreadCount + (receivedMessage.read ? 0 : 1)
              }
            : conv
        ),
        totalUnreadCount: state.totalUnreadCount + (receivedMessage.read ? 0 : 1)
      }

    case 'MARK_CONVERSATION_AS_READ':
      const conversation = state.conversations.find(c => c.id === action.payload)
      if (!conversation) return state
      
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload
            ? { ...conv, unreadCount: 0 }
            : conv
        ),
        messages: {
          ...state.messages,
          [action.payload]: (state.messages[action.payload] || []).map(msg => ({
            ...msg,
            read: true
          }))
        },
        totalUnreadCount: Math.max(0, state.totalUnreadCount - conversation.unreadCount)
      }

    case 'CREATE_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        messages: {
          ...state.messages,
          [action.payload.id]: []
        }
      }

    default:
      return state
  }
}

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  const toggleChat = () => {
    dispatch({ type: 'TOGGLE_CHAT' })
  }

  const openChat = () => {
    dispatch({ type: 'OPEN_CHAT' })
  }

  const closeChat = () => {
    dispatch({ type: 'CLOSE_CHAT' })
  }

  const setActiveConversation = (id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id })
    if (id) {
      markConversationAsRead(id)
    }
  }

  const sendMessage = (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>) => {
    dispatch({ type: 'SEND_MESSAGE', payload: { conversationId, message } })
  }

  const receiveMessage = (conversationId: string, message: ChatMessage) => {
    dispatch({ type: 'RECEIVE_MESSAGE', payload: { conversationId, message } })
  }

  const markConversationAsRead = (conversationId: string) => {
    dispatch({ type: 'MARK_CONVERSATION_AS_READ', payload: conversationId })
  }

  const createConversation = (conversation: ChatConversation) => {
    dispatch({ type: 'CREATE_CONVERSATION', payload: conversation })
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
    createConversation
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