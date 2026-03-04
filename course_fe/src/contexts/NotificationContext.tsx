import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import {
  getNotificationsByUser,
  markNotificationAsRead as apiMarkRead,
  markAllNotificationsAsRead as apiMarkAllRead,
  type Notification as ApiNotification,
} from '../services/notification.api'

// ─── Types (keep the same external interface) ─────────────────────

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'course_update' | 'promotion' | 'discussion' | 'system' | 'course' | 'payment' | 'other' | 'chat'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  icon?: string
  relatedId?: number | null
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loaded: boolean
}

type NotificationAction =
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp' | 'read'> & { id?: string } }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loaded: false,
}

// ─── Helpers ──────────────────────────────────────────────────────

function mapApiNotification(n: ApiNotification): Notification {
  return {
    id: String(n.id),
    type: n.type as Notification['type'],
    title: n.title,
    message: n.message,
    timestamp: new Date(n.created_at),
    read: n.is_read,
    relatedId: n.related_id,
  }
}

// ─── Reducer ──────────────────────────────────────────────────────

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'SET_NOTIFICATIONS': {
      const unread = action.payload.filter(n => !n.read).length
      return { notifications: action.payload, unreadCount: unread, loaded: true }
    }

    case 'ADD_NOTIFICATION': {
      const newNotification: Notification = {
        ...action.payload,
        id: action.payload.id ?? Date.now().toString(),
        timestamp: new Date(),
        read: false,
      }
      // Deduplicate by id
      if (state.notifications.some(n => n.id === newNotification.id)) return state
      return {
        ...state,
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }
    }

    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - (state.notifications.find(n => n.id === action.payload && !n.read) ? 1 : 0)),
      }

    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }

    case 'REMOVE_NOTIFICATION': {
      const toRemove = state.notifications.find(n => n.id === action.payload)
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: toRemove && !toRemove.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    }

    case 'CLEAR_ALL_NOTIFICATIONS':
      return { notifications: [], unreadCount: 0, loaded: true }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────

interface NotificationContextType {
  state: NotificationState
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState)
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id ? Number(user.id) : null

  // ── Fetch initial notifications from REST API ──────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await getNotificationsByUser(userId, 1, 50)
        if (!cancelled) {
          dispatch({ type: 'SET_NOTIFICATIONS', payload: res.results.map(mapApiNotification) })
        }
      } catch (err) {
        console.error('[Notification] Failed to fetch:', err)
      }
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, userId])

  // ── WebSocket for real-time push ──────────────────────────────
  const handleWsMessage = useCallback((data: any) => {
    if (data.type === 'notification' && data.data) {
      const d = data.data
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: d.id ? String(d.id) : undefined,
          type: d.type || 'other',
          title: d.title || 'Thông báo mới',
          message: d.message || '',
          relatedId: d.related_id,
        },
      })
    }
  }, [])

  useWebSocket({
    path: '/ws/notifications/',
    onMessage: handleWsMessage,
    enabled: isAuthenticated,
    onOpen: () => console.log('[WS] Notification connected'),
    onClose: () => console.log('[WS] Notification disconnected'),
  })

  // ── Actions ───────────────────────────────────────────────────
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
  }

  const markAsRead = async (id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id })
    try {
      await apiMarkRead(Number(id))
    } catch { /* API call is best-effort */ }
  }

  const markAllAsRead = async () => {
    dispatch({ type: 'MARK_ALL_AS_READ' })
    if (userId) {
      try {
        await apiMarkAllRead(userId)
      } catch { /* best-effort */ }
    }
  }

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' })
  }

  const value: NotificationContextType = {
    state,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
