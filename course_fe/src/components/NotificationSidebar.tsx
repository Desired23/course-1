import { useState, useEffect, useRef } from "react"
import { Bell, X, Check, Trash2, Settings } from "lucide-react"
import { Button } from "./ui/button"
import { useRouter } from "./Router"
import { getNotificationsByUser, markNotificationAsRead as apiMarkAsRead, markAllNotificationsAsRead, type Notification as ApiNotification } from "../services/notification.api"
import { useAuth } from "../contexts/AuthContext"

interface NotificationSidebarProps {
  onHover?: (isHovered: boolean) => void
}

export function NotificationSidebar({ onHover }: NotificationSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()
  const { navigate } = useRouter()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  // Load notifications from API
  useEffect(() => {
    if (user?.id) {
      const userId = parseInt(user.id)
      getNotificationsByUser(userId, 1, 20)
        .then(res => {
          // Map API notification to component format
          const mapped = res.results.map((n: ApiNotification) => ({
            notification_id: n.id,
            title: n.title,
            message: n.message,
            is_read: n.is_read,
            type: n.type,
            related_id: n.related_id,
            created_at: new Date(n.created_at),
          }))
          setNotifications(mapped)
          setUnreadCount(mapped.filter((n: any) => !n.is_read).length)
        })
        .catch(() => {
          setNotifications([])
          setUnreadCount(0)
        })
    }
  }, [user])

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
      onHover?.(true)
    }, 300)
  }

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      onHover?.(false)
    }, 300)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const markAsRead = (notificationId: number) => {
    apiMarkAsRead(notificationId).catch(() => {})
    setNotifications(notifs =>
      notifs.map(n =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    if (user?.id) {
      markAllNotificationsAsRead(parseInt(user.id)).catch(() => {})
    }
    setNotifications(notifs => notifs.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const deleteNotification = (notificationId: number) => {
    setNotifications(notifs => notifs.filter(n => n.notification_id !== notificationId))
    const notification = notifications.find(n => n.notification_id === notificationId)
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'promotion':
        return '🎁'
      case 'course':
        return '📚'
      case 'social':
        return '👥'
      case 'system':
        return '⚙️'
      default:
        return '🔔'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {/* Notification Icon Button */}
      <button
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        onClick={() => navigate('/notifications')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Sidebar Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[400px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    navigate('/notifications/settings')
                    setIsOpen(false)
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Notification settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mark all as read button */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-2">We'll notify you when something arrives!</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    className={`flex gap-3 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.notification_id)
                      if (notification.related_id) {
                        navigate(`/course/${notification.related_id}`)
                        setIsOpen(false)
                      }
                    }}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium mb-1">{notification.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.notification_id)
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.notification_id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  navigate('/notifications')
                  setIsOpen(false)
                }}
                className="w-full text-sm text-center text-primary hover:underline"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}