import { useState, useEffect } from "react"
import { X, Bell, CheckCheck, Filter, Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { cn } from "./ui/utils"
import { useRouter } from "./Router"

interface Notification {
  id: string
  type: 'system' | 'course' | 'instructor' | 'admin' | 'payment' | 'social'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
}

interface NotificationPopupProps {
  isOpen: boolean
  onClose: () => void
  userRole?: 'user' | 'instructor' | 'admin'
}

export function NotificationPopup({ isOpen, onClose, userRole = 'user' }: NotificationPopupProps) {
  const { navigate } = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    // Mock notifications based on user role
    const mockNotifications: Notification[] = []

    if (userRole === 'user') {
      mockNotifications.push(
        {
          id: '1',
          type: 'course',
          title: 'New Lesson Available',
          message: 'React Advanced Patterns - Module 5 is now available',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          isRead: false,
          priority: 'medium',
          actionUrl: '/my-learning'
        },
        {
          id: '2',
          type: 'system',
          title: 'Certificate Ready',
          message: 'Your certificate for "Web Development Bootcamp" is ready to download',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          isRead: false,
          priority: 'high',
          actionUrl: '/profile'
        },
        {
          id: '3',
          type: 'course',
          title: 'Course Update',
          message: 'Instructor updated the course materials',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
          isRead: true,
          priority: 'low',
          actionUrl: '/my-learning'
        }
      )
    }

    if (userRole === 'instructor') {
      mockNotifications.push(
        {
          id: '4',
          type: 'instructor',
          title: 'New Student Enrolled',
          message: '5 new students enrolled in your course "React Mastery"',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          isRead: false,
          priority: 'medium',
          actionUrl: '/instructor/courses'
        },
        {
          id: '5',
          type: 'instructor',
          title: 'New Review',
          message: 'John Doe left a 5-star review on your course',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          isRead: false,
          priority: 'medium',
        },
        {
          id: '6',
          type: 'payment',
          title: 'Payout Processed',
          message: '$1,234.56 has been transferred to your account',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
          isRead: true,
          priority: 'high',
        },
        {
          id: '7',
          type: 'instructor',
          title: 'Q&A Question',
          message: '3 new questions from students require your attention',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
          isRead: false,
          priority: 'high',
          actionUrl: '/qna/course-1'
        }
      )
    }

    if (userRole === 'admin') {
      mockNotifications.push(
        {
          id: '8',
          type: 'admin',
          title: 'Course Pending Approval',
          message: '12 courses are waiting for your review',
          timestamp: new Date(Date.now() - 1000 * 60 * 20),
          isRead: false,
          priority: 'high',
          actionUrl: '/admin/courses'
        },
        {
          id: '9',
          type: 'admin',
          title: 'Reported Content',
          message: '3 forum posts have been flagged for review',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          isRead: false,
          priority: 'high',
          actionUrl: '/forum'
        },
        {
          id: '10',
          type: 'system',
          title: 'System Update',
          message: 'Platform will undergo maintenance on Oct 15',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          isRead: true,
          priority: 'medium',
          actionUrl: '/admin/settings'
        },
        {
          id: '11',
          type: 'payment',
          title: 'Refund Request',
          message: '5 refund requests need your attention',
          timestamp: new Date(Date.now() - 1000 * 60 * 90),
          isRead: false,
          priority: 'high',
          actionUrl: '/admin/payments'
        }
      )
    }

    setNotifications(mockNotifications)
  }, [userRole])

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.isRead)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      onClose()
      navigate(notification.actionUrl)
    }
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getNotificationIcon = (type: string) => {
    const icons = {
      system: '🔔',
      course: '📚',
      instructor: '👨‍🏫',
      admin: '⚙️',
      payment: '💰',
      social: '👥',
    }
    return icons[type as keyof typeof icons] || '📌'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      high: 'bg-red-500/10 text-red-600 dark:text-red-400',
    }
    return colors[priority as keyof typeof colors] || colors.low
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const groupByType = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {}
    notifications.forEach(notif => {
      if (!groups[notif.type]) groups[notif.type] = []
      groups[notif.type].push(notif)
    })
    return groups
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 md:p-0">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="relative w-full max-w-md md:max-w-lg bg-background border border-border rounded-xl md:rounded-none md:h-screen shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="gap-2 text-xs"
              >
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Mark all</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-12">
            <TabsTrigger 
              value="all" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[calc(100vh-140px)] md:h-[calc(100vh-140px)]">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-10 w-10 opacity-50" />
                  </div>
                  <h3 className="font-medium mb-1">No notifications yet</h3>
                  <p className="text-sm">When you get notifications, they'll show up here</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {Object.entries(groupByType(filteredNotifications)).map(([type, notifs]) => (
                    <div key={type} className="p-4 md:p-6">
                      <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <span>{type}</span>
                        <span className="h-px flex-1 bg-border"></span>
                      </h3>
                      <div className="space-y-2">
                        {notifs.map((notification) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.01]",
                              !notification.isRead 
                                ? "bg-primary/5 border-primary/30 shadow-sm" 
                                : "bg-card border-border/50 hover:bg-muted/30"
                            )}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm">{notification.title}</h4>
                                    {!notification.isRead && (
                                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                                    )}
                                  </div>
                                  <Badge 
                                    variant="secondary" 
                                    className={cn("text-xs font-medium", getPriorityColor(notification.priority))}
                                  >
                                    {notification.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {formatTimestamp(notification.timestamp)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteNotification(notification.id)
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    <span className="text-xs">Delete</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[calc(100vh-140px)] md:h-[calc(100vh-140px)]">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCheck className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="font-medium mb-1">All caught up!</h3>
                  <p className="text-sm">No unread notifications</p>
                </div>
              ) : (
                <div className="p-4 md:p-6 space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 rounded-lg border bg-primary/5 border-primary/30 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{notification.title}</h4>
                              <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs font-medium", getPriorityColor(notification.priority))}
                            >
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              <span className="text-xs">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
