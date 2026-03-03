import { useEffect } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { realtimeNotificationService, RealtimeNotification } from '../utils/realtimeNotifications'
import { toast } from 'sonner@2.0.3'

/**
 * Component that listens for realtime notifications
 * and displays them to the user
 */
export function RealtimeNotificationListener() {
  const { addNotification } = useNotifications()
  const { user, hasRole } = useAuth()

  useEffect(() => {
    // Only enable for instructors and admins
    if (!hasRole('instructor') && !hasRole('admin')) {
      return
    }

    console.log('🎧 Realtime notification listener initialized')

    // Subscribe to realtime notifications
    const unsubscribe = realtimeNotificationService.subscribe((notification: RealtimeNotification) => {
      // Add to notification center
      addNotification({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl
      })

      // Show toast notification
      toast.info(notification.title, {
        description: notification.message,
        action: notification.actionUrl ? {
          label: 'View',
          onClick: () => window.location.href = notification.actionUrl
        } : undefined,
        duration: 5000
      })
    })

    // Start simulation (every 30 seconds)
    // In production, this would be replaced with WebSocket or SSE
    realtimeNotificationService.startSimulation(30000)

    // Cleanup
    return () => {
      unsubscribe()
      realtimeNotificationService.stopSimulation()
    }
  }, [addNotification, hasRole])

  return null // This component doesn't render anything
}
