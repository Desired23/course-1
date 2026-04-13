import { useEffect, useRef } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'





export function RealtimeNotificationListener() {
  const { state } = useNotifications()
  const { isAuthenticated } = useAuth()
  const prevCountRef = useRef(state.notifications.length)

  useEffect(() => {
    if (!isAuthenticated) return


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

