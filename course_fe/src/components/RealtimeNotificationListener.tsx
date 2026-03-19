import { useEffect, useRef } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

/**
 * Shows a toast whenever a new notification arrives in the context.
 * The actual WebSocket is managed inside NotificationContext.
 */
export function RealtimeNotificationListener() {
  const { state } = useNotifications()
  const { isAuthenticated } = useAuth()
  const prevCountRef = useRef(state.notifications.length)

  useEffect(() => {
    if (!isAuthenticated) return

    // When a new notification is prepended, show toast
    const currentCount = state.notifications.length
    if (currentCount > prevCountRef.current && state.notifications.length > 0) {
      const newest = state.notifications[0]
      if (newest && !newest.read) {
        toast.info(newest.title, {
          description: newest.message,
          duration: 5000,
        })
      }
    }
    prevCountRef.current = currentCount
  }, [state.notifications, isAuthenticated])

  return null
}

