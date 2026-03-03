import { createContext, useContext, useReducer, ReactNode } from 'react'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'course_update' | 'promotion' | 'discussion' | 'review' | 'qna_response' | 'review_response' | 'new_question' | 'new_review'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  icon?: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp' | 'read'> }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }

const initialState: NotificationState = {
  notifications: [
    {
      id: '1',
      type: 'course_update',
      title: 'New lesson added',
      message: 'A new lesson has been added to "React Complete Guide"',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      read: false,
      actionUrl: '/course/1'
    },
    {
      id: '2',
      type: 'promotion',
      title: 'Special offer!',
      message: '50% off all courses - Limited time only',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      read: false,
      actionUrl: '/courses'
    },
    {
      id: '3',
      type: 'discussion',
      title: 'New reply',
      message: 'Someone replied to your question in JavaScript course',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      read: true,
      actionUrl: '/qna/1'
    }
  ],
  unreadCount: 2
}

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      const newNotification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
        read: false
      }
      return {
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }

    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }

    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true
        })),
        unreadCount: 0
      }

    case 'REMOVE_NOTIFICATION':
      const notificationToRemove = state.notifications.find(n => n.id === action.payload)
      return {
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
        unreadCount: notificationToRemove && !notificationToRemove.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount
      }

    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        notifications: [],
        unreadCount: 0
      }

    default:
      return state
  }
}

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

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
  }

  const markAsRead = (id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id })
  }

  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_AS_READ' })
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
    clearAllNotifications
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