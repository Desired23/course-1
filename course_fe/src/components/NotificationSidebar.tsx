import { useState, useEffect, useRef } from "react"
import { Bell, X, Check, Trash2, Settings } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "./Router"
import { markNotificationAsRead as apiMarkAsRead, markAllNotificationsAsRead } from "../services/notification.api"
import { useAuth } from "../contexts/AuthContext"
import { useNotifications } from "../contexts/NotificationContext"
import { useTranslation } from "react-i18next"
import { cn } from "./ui/utils"
import { getErrorMessage } from "../lib/apiError"

interface NotificationSidebarProps {
  onHover?: (isHovered: boolean) => void
  buttonClassName?: string
  viewAllPath?: string | null
  settingsPath?: string | null
}

export function NotificationSidebar({
  onHover,
  buttonClassName,
  viewAllPath = '/notifications',
  settingsPath = '/notifications/settings',
}: NotificationSidebarProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const { user } = useAuth()
  const { navigate } = useRouter()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()




  const { state: notifState } = useNotifications() as any


  useEffect(() => {

  }, [])


  useEffect(() => {
    setNotifications(notifState.notifications)
    setUnreadCount(notifState.unreadCount)
  }, [notifState])


  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true)
      onHover?.(true)
    }, 300)
  }


  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      onHover?.(false)
    }, 300)
  }

  const handleBellClick = () => {
    if (viewAllPath) {
      navigate(viewAllPath)
      return
    }

    setIsOpen(open => {
      const nextOpen = !open
      onHover?.(nextOpen)
      return nextOpen
    })
  }


  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const markAsRead = (notificationId: number) => {
    const prevNotifs = [...notifications]
    const prevCount = unreadCount
    setNotifications(notifs =>
      notifs.map(n =>
        (n.notification_id ?? Number(n.id)) === notificationId ? { ...n, is_read: true, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    apiMarkAsRead(notificationId).catch((e) => {
      setNotifications(prevNotifs)
      setUnreadCount(prevCount)
      toast.error(getErrorMessage(e, 'Không thể đánh dấu đã đọc.'))
    })
  }

  const markAllAsRead = () => {
    const prevNotifs = [...notifications]
    const prevCount = unreadCount
    setNotifications(notifs => notifs.map(n => ({ ...n, is_read: true, read: true })))
    setUnreadCount(0)
    if (user?.id) {
      markAllNotificationsAsRead(parseInt(user.id)).catch((e) => {
        setNotifications(prevNotifs)
        setUnreadCount(prevCount)
        toast.error(getErrorMessage(e, 'Không thể đánh dấu tất cả đã đọc.'))
      })
    }
  }

  const deleteNotification = (notificationId: number) => {
    setNotifications(notifs => notifs.filter(n => (n.notification_id ?? Number(n.id)) !== notificationId))
    const notification = notifications.find(n => (n.notification_id ?? Number(n.id)) === notificationId)
    if (notification && !(notification.is_read ?? notification.read)) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const getNotificationLink = (notification: any): string | null => {
    const actionUrl = notification.action_url ?? notification.actionUrl
    if (actionUrl) return actionUrl

    const code = notification.notification_code ?? notification.notificationCode
    const relatedId = notification.related_id ?? notification.relatedId
    const type = notification.type

    // Route by notification_code. related_id is NOT always a course id (it can be a
    // certificate / review / answer / payment id), so we never blindly link to /course/:id.
    switch (code) {
      // Instructor application
      case 'application_approved':
      case 'application_rejected':
      case 'application_changes_requested':
        return '/instructor/onboarding'
      case 'application_submitted':
      case 'application_resubmitted':
        return '/admin/instructor-applications'

      // Payouts (instructor)
      case 'payout_processed':
      case 'payout_rejected':
        return '/instructor/payouts'

      // Refund request -> admin queue
      case 'refund_requested':
        return '/admin/refunds'

      // Copyright workflow (admin-managed; reporter/instructor in-app flow removed)
      case 'copyright_instructor_responded':
      case 'copyright_reporter_info_submitted':
        return relatedId ? `/admin/reports?tab=copyright&case=${relatedId}` : '/admin/reports?tab=copyright'
      case 'copyright_case_decision':
        if (notification.actionUrl) return notification.actionUrl
        return null

      // Payments & refund results (student)
      case 'payment_completed':
      case 'payment_failed':
      case 'refund_processed':
      case 'refund_failed':
      case 'refund_rejected':
        return '/user/transactions'

      // Subscriptions (student)
      case 'subscription_renewed':
      case 'subscription_expired':
      case 'subscription_cancelled':
      case 'plan_course_removal_scheduled':
        return '/user/subscriptions'

      // Certificates & enrollment (student) -> shown on My Learning
      case 'certificate_issued':
      case 'certificate_revoked':
      case 'enrollment_created':
        return '/my-learning'

      // New enrollment (instructor)
      case 'new_enrollment_received':
        return '/instructor/students'

      // Course moderation (instructor) -> deep link to the course (related_id = course id)
      case 'course_moderated':
      case 'course_status_changed_by_admin':
        return relatedId ? `/instructor/courses/${relatedId}` : '/instructor/courses'

      // Lesson/module moderation (instructor) -> no deep id available
      case 'lesson_status_changed_by_admin':
      case 'module_status_changed_by_admin':
        return '/instructor/courses'

      // Reviews
      case 'review_received':       // instructor
        return '/instructor/courses'
      case 'review_moderated':      // review owner (student)
        return '/user/my-reviews'
      case 'review_reported':       // admin
        return '/admin/reviews'

      // Q&A
      case 'answer_received':
      case 'answer_accepted':
      case 'answer_moderated':
        return '/qa'
      case 'question_reported':     // admin
        return '/admin/qa'

      // Blog
      case 'blog_comment_received':
      case 'blog_comment_moderated':
      case 'blog_post_moderated':
        return '/blog'
    }

    // Safety net for any future payment-type code; otherwise no navigation
    // (better than navigating to a wrong page).
    if (type === 'payment') return '/user/transactions'
    return null
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

  const formatTimeAgo = (value: Date | string | number | undefined | null) => {
    if (!value) return t('notification_sidebar.time.just_now')
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return t('notification_sidebar.time.just_now')

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('notification_sidebar.time.just_now')
    if (minutes < 60) return t('notification_sidebar.time.minutes_ago', { count: minutes })
    if (hours < 24) return t('notification_sidebar.time.hours_ago', { count: hours })
    if (days < 7) return t('notification_sidebar.time.days_ago', { count: days })
    return date.toLocaleDateString()
  }

  return (
    <div
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >

      <button
        className={cn("relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors", buttonClassName)}
        onClick={handleBellClick}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>


      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[400px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t('notification_sidebar.title')}
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1">
                {settingsPath && (
                  <button
                    onClick={() => {
                      navigate(settingsPath)
                      setIsOpen(false)
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title={t('notification_sidebar.settings')}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>


            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                {t('notification_sidebar.mark_all_as_read')}
              </button>
            )}
          </div>


          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-sm">{t('notification_sidebar.empty_title')}</p>
                <p className="text-xs mt-2">{t('notification_sidebar.empty_description')}</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={String(notification.notification_id ?? notification.id)}
                    className={`flex gap-3 p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                      !(notification.is_read ?? notification.read) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => {
                      const notificationId = Number(notification.notification_id ?? notification.id)
                      markAsRead(notificationId)
                      const link = getNotificationLink(notification)
                      if (link) {
                        navigate(link)
                        setIsOpen(false)
                      }
                    }}
                  >

                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>


                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium mb-1">{notification.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.created_at ?? notification.timestamp)}
                        </span>
                        {!(notification.is_read ?? notification.read) && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                    </div>


                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!(notification.is_read ?? notification.read) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(Number(notification.notification_id ?? notification.id))
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                          title={t('notification_sidebar.mark_as_read')}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(Number(notification.notification_id ?? notification.id))
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title={t('notification_sidebar.delete_notification')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          {notifications.length > 0 && viewAllPath && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  navigate(viewAllPath)
                  setIsOpen(false)
                }}
                className="w-full text-sm text-center text-primary hover:underline"
              >
                {t('notification_sidebar.view_all')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
